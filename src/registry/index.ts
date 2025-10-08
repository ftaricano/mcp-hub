import { readFile } from 'fs/promises';
import { spawn, ChildProcess } from 'child_process';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { ServerConfig, ToolMetadata, ConnectionError } from '../types/index.js';
import { createLogger } from '../utils/logger.js';
import { loadServerEnv } from '../utils/env-loader.js';
import processManager from '../utils/process-manager.js';

const logger = createLogger();

export class ServerRegistry {
  private servers: Map<string, ServerConfig> = new Map();
  private tools: Map<string, ToolMetadata[]> = new Map();
  private connections: Map<string, { client: Client; process?: ChildProcess }> = new Map();
  private lastUpdate: Map<string, Date> = new Map();

  constructor(private configPath?: string) {}

  async loadConfig(): Promise<void> {
    if (!this.configPath) {
      logger.warn('No config path provided, using empty server list');
      return;
    }

    try {
      const configData = await readFile(this.configPath, 'utf-8');
      const config = JSON.parse(configData);
      
      if (config.servers && Array.isArray(config.servers)) {
        for (const serverConfig of config.servers) {
          this.servers.set(serverConfig.id, serverConfig);
          logger.info('Loaded server config:', { serverId: serverConfig.id, name: serverConfig.name });
        }
      }
    } catch (error) {
      logger.error('Failed to load config:', error);
      throw new Error(`Failed to load configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async discoverTools(serverId: string): Promise<ToolMetadata[]> {
    const serverConfig = this.servers.get(serverId);
    if (!serverConfig || !serverConfig.enabled) {
      throw new ConnectionError(serverId, 'Server not found or disabled');
    }

    try {
      const connection = await this.getConnection(serverId);
      
      // Add timeout for tool discovery
      const timeout = serverConfig.timeout || 30000;
      const toolsPromise = connection.client.listTools() as Promise<{ tools?: any[] }>;
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`Tool discovery timeout after ${timeout}ms`)), timeout);
      });

      const response = await Promise.race([toolsPromise, timeoutPromise]) as { tools?: any[] };

      const tools: ToolMetadata[] = response.tools?.map((tool: any) => ({
        server_id: serverId,
        server_name: serverConfig.name,
        tool_name: tool.name,
        description: tool.description || '',
        schema: tool.inputSchema || {},
        tags: serverConfig.tags || [],
        enabled: true,
        last_seen: new Date(),
      })) || [];

      this.tools.set(serverId, tools);
      this.lastUpdate.set(serverId, new Date());
      
      logger.info('Discovered tools:', { serverId, toolCount: tools.length });
      return tools;
    } catch (error) {
      logger.error('Failed to discover tools:', { serverId, error });
      
      // Mark server as problematic but don't throw - allow other servers to continue
      this.tools.set(serverId, []);
      this.lastUpdate.set(serverId, new Date());
      
      throw new ConnectionError(serverId, `Tool discovery failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getConnection(serverId: string): Promise<{ client: Client; process?: ChildProcess }> {
    // Check if we already have a valid connection
    const existing = this.connections.get(serverId);
    if (existing) {
      // Verify the connection is still alive
      try {
        if (existing.process && existing.process.killed) {
          logger.warn(`Process for ${serverId} was killed, removing from connections`);
          this.connections.delete(serverId);
        } else {
          return existing;
        }
      } catch (error) {
        logger.warn(`Error checking connection for ${serverId}, will recreate:`, error);
        this.connections.delete(serverId);
      }
    }

    // Clean up any orphaned process for this server before creating new one
    processManager.cleanupProcess(serverId);

    const serverConfig = this.servers.get(serverId);
    if (!serverConfig) {
      throw new ConnectionError(serverId, 'Server configuration not found');
    }

    if (serverConfig.protocol === 'stdio') {
      return this.createStdioConnectionWithRetry(serverId, serverConfig);
    } else if (serverConfig.protocol === 'http') {
      return this.createHttpConnectionWithRetry(serverId, serverConfig);
    } else {
      throw new ConnectionError(serverId, `Unsupported protocol: ${serverConfig.protocol}`);
    }
  }

  private async createStdioConnectionWithRetry(
    serverId: string, 
    config: ServerConfig,
    maxRetries: number = 5
  ): Promise<{ client: Client; process?: ChildProcess }> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.info(`Attempting connection to ${serverId} (attempt ${attempt}/${maxRetries})`);
        return await this.createStdioConnection(serverId, config);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        if (attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
          logger.warn(`Connection attempt ${attempt} failed for ${serverId}, retrying in ${delay}ms:`, { error: lastError.message });
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw new ConnectionError(serverId, `Failed after ${maxRetries} attempts: ${lastError?.message}`);
  }

  private async createStdioConnection(
    serverId: string,
    config: ServerConfig
  ): Promise<{ client: Client; process?: ChildProcess }> {
      try {
        const timeout = config.timeout || 60000; // Extended timeout
        logger.info('Creating stdio connection:', { serverId, timeout });
        
        const client = new Client(
          {
            name: '@mcp/hub-client',
            version: '0.1.0',
          },
          {
            capabilities: {},
          }
        );

        // Enhanced transport configuration with proper environment inheritance
        const transportConfig: { 
          command: string; 
          args?: string[]; 
          env?: Record<string, string>;
        } = {
          command: config.command,
          args: config.args || [],
        };
        
        // Load environment variables from the server's .env file
        const serverEnv = loadServerEnv(serverId);
        
        // Merge environment variables properly
        transportConfig.env = {
          ...(process.env as Record<string, string>), // Inherit system environment
          ...serverEnv,  // Load from server's .env file
          ...(config.env || {}),  // Override with config-specific vars if provided
        };
        
        const transport = new StdioClientTransport(transportConfig);

        // Get access to the spawned process
        const spawnedProcess = (transport as any)._process || (transport as any).process;

        // Implement connection timeout
        const connectionPromise = client.connect(transport);
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error(`Connection timeout after ${timeout}ms`)), timeout);
        });

        await Promise.race([connectionPromise, timeoutPromise]);

        // Get the process after connection
        const connectedProcess = (transport as any)._process || (transport as any).process;
        if (connectedProcess) {
          // Register the process with ProcessManager
          processManager.registerProcess(serverId, connectedProcess);
          logger.info(`Registered process for ${serverId} with PID: ${connectedProcess.pid}`);
        }

        // Test the connection with a simple ping
        try {
          await this.testConnection(client, serverId);
        } catch (testError) {
          logger.warn('Connection test failed, but connection established:', { serverId, testError });
          // Continue anyway as some servers may not support immediate testing
        }

        const connection = { client, process: connectedProcess };
        this.connections.set(serverId, connection);

        logger.info('Successfully created stdio connection:', { serverId });
        return connection;
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        logger.error('Failed to create stdio connection:', { 
          serverId, 
          error: errorMessage
        });
        
        throw new ConnectionError(serverId, `Connection failed: ${errorMessage}`);
      }
  }

  private async createHttpConnectionWithRetry(
    serverId: string,
    config: ServerConfig,
    maxRetries: number = 3
  ): Promise<{ client: Client; process?: ChildProcess }> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.info(`Attempting HTTP connection to ${serverId} (attempt ${attempt}/${maxRetries})`);
        return await this.createHttpConnection(serverId, config);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        if (attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          logger.warn(`HTTP connection attempt ${attempt} failed for ${serverId}, retrying in ${delay}ms:`, { error: lastError.message });
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw new ConnectionError(serverId, `HTTP connection failed after ${maxRetries} attempts: ${lastError?.message}`);
  }

  private async createHttpConnection(
    serverId: string,
    config: ServerConfig
  ): Promise<{ client: Client; process?: ChildProcess }> {
    try {
      if (!config.url) {
        throw new Error('URL is required for HTTP protocol');
      }

      const timeout = config.timeout || 30000;
      logger.info('Creating HTTP connection:', { serverId, url: config.url, timeout });
      
      const client = new Client(
        {
          name: '@mcp/hub-client',
          version: '0.1.0',
        },
        {
          capabilities: {},
        }
      );

      // Create SSE transport for HTTP MCP servers
      const transport = new SSEClientTransport(new URL(config.url));

      // Implement connection timeout
      const connectionPromise = client.connect(transport);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`HTTP connection timeout after ${timeout}ms`)), timeout);
      });

      await Promise.race([connectionPromise, timeoutPromise]);

      // Test the connection
      try {
        await this.testConnection(client, serverId);
      } catch (testError) {
        logger.warn('HTTP connection test failed, but connection established:', { serverId, testError });
        // Continue anyway as some servers may not support immediate testing
      }

      const connection = { client };
      this.connections.set(serverId, connection);

      logger.info('Successfully created HTTP connection:', { serverId, url: config.url });
      return connection;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      logger.error('Failed to create HTTP connection:', { 
        serverId, 
        url: config.url,
        error: errorMessage
      });
      
      throw new ConnectionError(serverId, `HTTP connection failed: ${errorMessage}`);
    }
  }

  async callTool(serverId: string, toolName: string, args: Record<string, unknown>): Promise<any> {
    const connection = await this.getConnection(serverId);
    
    try {
      const response = await connection.client.callTool({
        name: toolName,
        arguments: args
      });

      logger.info('Tool call successful:', { serverId, toolName });
      return response;
    } catch (error) {
      logger.error('Tool call failed:', { serverId, toolName, error });
      throw new ConnectionError(serverId, `Tool call failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  getAllTools(): ToolMetadata[] {
    const allTools: ToolMetadata[] = [];
    for (const tools of this.tools.values()) {
      allTools.push(...tools);
    }
    return allTools;
  }

  getServerTools(serverId: string): ToolMetadata[] {
    return this.tools.get(serverId) || [];
  }

  filterTools(
    query?: string,
    tags?: string[],
    serverId?: string
  ): ToolMetadata[] {
    let tools = this.getAllTools();

    if (serverId) {
      tools = tools.filter(tool => tool.server_id === serverId);
    }

    if (query) {
      const lowerQuery = query.toLowerCase();
      tools = tools.filter(tool => {
        // Search in tool name
        if (tool.tool_name.toLowerCase().includes(lowerQuery)) {
          return true;
        }
        
        // Search in description
        if (tool.description.toLowerCase().includes(lowerQuery)) {
          return true;
        }
        
        // Search in server_id for domain-specific queries
        if (tool.server_id.toLowerCase().includes(lowerQuery)) {
          return true;
        }
        
        // Enhanced email-specific searches
        if (lowerQuery === 'email' || lowerQuery === 'e-mail') {
          return (
            tool.server_id.includes('outlook') ||
            tool.tool_name.includes('email') ||
            tool.tool_name.includes('mail') ||
            tool.description.toLowerCase().includes('email') ||
            tool.description.toLowerCase().includes('e-mail') ||
            tool.description.toLowerCase().includes('correio') ||
            tool.description.toLowerCase().includes('mensagem') ||
            tool.description.toLowerCase().includes('destinatários') ||
            tool.description.toLowerCase().includes('enviar') ||
            tool.description.toLowerCase().includes('receber') ||
            tool.description.toLowerCase().includes('caixa de entrada')
          );
        }
        
        // Enhanced music/spotify searches
        if (lowerQuery === 'music' || lowerQuery === 'música' || lowerQuery === 'musica') {
          return (
            tool.server_id === 'spotify' ||
            tool.tool_name.includes('play') ||
            tool.tool_name.includes('music') ||
            tool.description.toLowerCase().includes('music') ||
            tool.description.toLowerCase().includes('música') ||
            tool.description.toLowerCase().includes('playlist') ||
            tool.description.toLowerCase().includes('track') ||
            tool.description.toLowerCase().includes('spotify')
          );
        }
        
        // Enhanced project management searches
        if (lowerQuery === 'project' || lowerQuery === 'projeto') {
          return (
            tool.server_id === 'trello' ||
            tool.tool_name.includes('card') ||
            tool.tool_name.includes('board') ||
            tool.tool_name.includes('list') ||
            tool.description.toLowerCase().includes('projeto') ||
            tool.description.toLowerCase().includes('project') ||
            tool.description.toLowerCase().includes('trello') ||
            tool.description.toLowerCase().includes('card') ||
            tool.description.toLowerCase().includes('board')
          );
        }
        
        // Enhanced file/document searches  
        if (lowerQuery === 'file' || lowerQuery === 'arquivo' || lowerQuery === 'document' || lowerQuery === 'documento') {
          return (
            tool.server_id.includes('onedrive') ||
            tool.server_id.includes('sharepoint') ||
            tool.tool_name.includes('file') ||
            tool.tool_name.includes('document') ||
            tool.description.toLowerCase().includes('arquivo') ||
            tool.description.toLowerCase().includes('documento') ||
            tool.description.toLowerCase().includes('file') ||
            tool.description.toLowerCase().includes('sharepoint') ||
            tool.description.toLowerCase().includes('onedrive')
          );
        }
        
        return false;
      });
    }

    if (tags && tags.length > 0) {
      tools = tools.filter(tool => 
        tool.tags?.some(tag => tags.includes(tag))
      );
    }

    return tools;
  }

  async refreshAll(): Promise<void> {
    const serverIds = Array.from(this.servers.keys()).filter(id => {
      const config = this.servers.get(id);
      return config?.enabled === true;
    });
    
    logger.info('Starting registry refresh for enabled servers:', { serverIds });
    
    const promises = serverIds.map(async (id) => {
      try {
        await this.discoverTools(id);
        return { serverId: id, success: true };
      } catch (error) {
        logger.error('Failed to refresh server:', { serverId: id, error });
        return { serverId: id, success: false, error };
      }
    });

    const results = await Promise.allSettled(promises);
    
    const successCount = results.filter(result => 
      result.status === 'fulfilled' && result.value.success
    ).length;
    
    const totalCount = serverIds.length;
    
    logger.info('Registry refresh completed', { 
      successCount, 
      totalCount, 
      failureCount: totalCount - successCount 
    });
  }

  async cleanup(): Promise<void> {
    logger.info('Starting registry cleanup...');
    
    // First, close all client connections
    for (const [serverId, connection] of this.connections) {
      try {
        await connection.client.close();
        logger.info('Closed client connection:', { serverId });
      } catch (error) {
        logger.error('Error closing client connection:', { serverId, error });
      }
    }
    
    // Then clean up all processes via ProcessManager
    await processManager.cleanupAll();
    
    // Clear internal state
    this.connections.clear();
    this.tools.clear();
    this.lastUpdate.clear();
    
    logger.info('Registry cleanup completed');
  }

  getServerConfig(serverId: string): ServerConfig | undefined {
    return this.servers.get(serverId);
  }

  getAllServers(): ServerConfig[] {
    return Array.from(this.servers.values());
  }


  getStats(): { servers: number; tools: number; connections: number } {
    const enabledServers = Array.from(this.servers.values()).filter(s => s.enabled).length;
    return {
      servers: enabledServers,
      tools: this.getAllTools().length,
      connections: this.connections.size,
    };
  }

  getServerStatus(serverId: string): { connected: boolean; toolCount: number; lastUpdate?: Date } {
    const connected = this.connections.has(serverId);
    const tools = this.tools.get(serverId) || [];
    const lastUpdate = this.lastUpdate.get(serverId);
    
    return {
      connected,
      toolCount: tools.length,
      ...(lastUpdate ? { lastUpdate } : {})
    };
  }

  getAllServerStatuses(): Record<string, { connected: boolean; toolCount: number; lastUpdate?: Date }> {
    const statuses: Record<string, { connected: boolean; toolCount: number; lastUpdate?: Date }> = {};
    
    for (const serverId of this.servers.keys()) {
      statuses[serverId] = this.getServerStatus(serverId);
    }
    
    return statuses;
  }

  private async testConnection(client: Client, serverId: string): Promise<void> {
    try {
      // Test with a simple listTools call
      await client.listTools();
      logger.debug('Connection test successful:', { serverId });
    } catch (error) {
      logger.warn('Connection test failed, but proceeding:', { serverId, error });
      // Don't throw - some servers might not respond immediately
    }
  }
}