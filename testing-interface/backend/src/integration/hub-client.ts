// HubClient - Integration layer with MCP Hub
import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import { config } from 'dotenv';
import type { ServerInfo, ToolInfo } from '../types/api.js';

interface MCPRequest {
  jsonrpc: '2.0';
  id: number;
  method: string;
  params?: any;
}

interface MCPResponse {
  jsonrpc: '2.0';
  id: number;
  result?: any;
  error?: any;
}

export class HubClient {
  private hubProcess: ChildProcess | null = null;
  private hubConfigPath: string;
  private toolsCache: Map<string, ToolInfo[]> = new Map();
  private lastUpdate: number = 0;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private requestId = 0;
  private pendingRequests: Map<number, { resolve: (value: any) => void; reject: (error: any) => void }> = new Map();
  private buffer = '';

  constructor() {
    this.hubConfigPath = '/Users/fernandotaricano/mcp/mcp-hub/hub-config.json';
  }

  /**
   * Start Hub process if not already running
   */
  private async ensureHubRunning(): Promise<void> {
    if (this.hubProcess) {
      return;
    }

    console.log('🚀 Starting MCP Hub process...');

    // Load Hub's .env file to get all credentials
    const hubEnvPath = '/Users/fernandotaricano/mcp/mcp-hub/.env';
    const hubEnv = config({ path: hubEnvPath });

    console.log(`📋 Loaded ${Object.keys(hubEnv.parsed || {}).length} environment variables from Hub .env`);

    this.hubProcess = spawn('node', ['/Users/fernandotaricano/mcp/mcp-hub/dist/index.js'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        ...hubEnv.parsed,
        HUB_CONFIG: this.hubConfigPath
      }
    });

    // Handle stdout (JSON-RPC responses)
    this.hubProcess.stdout?.on('data', (data) => {
      this.buffer += data.toString();
      this.processBuffer();
    });

    // Handle stderr (logs)
    this.hubProcess.stderr?.on('data', (data) => {
      console.log('[Hub stderr]:', data.toString());
    });

    // Handle process exit
    this.hubProcess.on('exit', (code) => {
      console.log(`Hub process exited with code ${code}`);
      this.hubProcess = null;
      this.pendingRequests.clear();
    });

    // Wait for initialization
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Initialize connection
    await this.sendRequest('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: {
        name: 'MCP Hub Testing Interface',
        version: '1.0.0'
      }
    });

    console.log('✅ Hub process ready');
  }

  /**
   * Process buffered stdout data
   */
  private processBuffer(): void {
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.trim()) continue;

      // Skip non-JSON lines (logs, debug output, etc.)
      // JSON-RPC messages start with { and contain "jsonrpc"
      if (!line.trim().startsWith('{')) {
        continue;
      }

      try {
        const response: MCPResponse = JSON.parse(line);

        // Validate it's actually a JSON-RPC response
        if (!response.jsonrpc || !response.id) {
          continue;
        }

        const pending = this.pendingRequests.get(response.id);

        if (pending) {
          this.pendingRequests.delete(response.id);
          if (response.error) {
            pending.reject(response.error);
          } else {
            pending.resolve(response.result);
          }
        }
      } catch (error) {
        // Silently ignore parse errors for non-JSON lines
        // console.error('Failed to parse Hub response:', line, error);
      }
    }
  }

  /**
   * Send JSON-RPC request to Hub
   */
  private async sendRequest(method: string, params?: any): Promise<any> {
    await this.ensureHubRunning();

    const id = ++this.requestId;
    const request: MCPRequest = {
      jsonrpc: '2.0',
      id,
      method,
      params
    };

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });

      const requestStr = JSON.stringify(request) + '\n';
      this.hubProcess?.stdin?.write(requestStr);

      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error('Request timeout'));
        }
      }, 30000);
    });
  }

  /**
   * Get all configured servers with their status
   */
  async getServers(): Promise<ServerInfo[]> {
    const config = await this.loadHubConfig();

    return config.servers.map((server: any) => ({
      id: server.id,
      name: server.id,
      protocol: server.protocol as 'stdio' | 'http',
      enabled: server.enabled,
      connected: server.enabled,
      toolCount: 0, // Will be populated by tool discovery
      health: server.enabled ? 'healthy' : 'offline',
    }));
  }

  /**
   * Discover all tools from all servers via MCP
   */
  async discoverAllTools(): Promise<ToolInfo[]> {
    const now = Date.now();

    // Return cached tools if fresh
    if (this.toolsCache.size > 0 && (now - this.lastUpdate) < this.CACHE_TTL) {
      const allTools: ToolInfo[] = [];
      this.toolsCache.forEach(tools => allTools.push(...tools));
      return allTools;
    }

    console.log('📡 Discovering tools from MCP Hub...');

    try {
      // Call MCP tools/list
      const result = await this.sendRequest('tools/list', {});

      if (!result || !result.tools) {
        console.error('No tools returned from Hub');
        return [];
      }

      console.log(`✅ Found ${result.tools.length} tools from Hub`);

      // Convert MCP tools to our format
      const allTools: ToolInfo[] = result.tools.map((tool: any) => this.convertMCPToolToToolInfo(tool));

      // Update cache
      this.toolsCache.clear();
      const toolsByServer: Record<string, ToolInfo[]> = {};

      for (const tool of allTools) {
        if (!toolsByServer[tool.serverId]) {
          toolsByServer[tool.serverId] = [];
        }
        toolsByServer[tool.serverId].push(tool);
      }

      for (const [serverId, tools] of Object.entries(toolsByServer)) {
        this.toolsCache.set(serverId, tools);
      }

      this.lastUpdate = now;
      return allTools;

    } catch (error: any) {
      console.error('Failed to discover tools:', error);
      throw error;
    }
  }

  /**
   * Get tools for a specific server
   */
  async getToolsForServer(serverId: string): Promise<ToolInfo[]> {
    // Check cache first
    if (this.toolsCache.has(serverId)) {
      const cached = this.toolsCache.get(serverId)!;
      if ((Date.now() - this.lastUpdate) < this.CACHE_TTL) {
        return cached;
      }
    }

    // Discover all tools and filter by server
    const allTools = await this.discoverAllTools();
    return allTools.filter(tool => tool.serverId === serverId);
  }

  /**
   * Execute a tool via MCP
   */
  async executeTool(
    serverId: string,
    toolName: string,
    parameters: Record<string, any>
  ): Promise<any> {
    console.log(`🔧 Executing tool: ${serverId}/${toolName}`);

    try {
      const result = await this.sendRequest('tools/call', {
        name: toolName,
        arguments: parameters
      });

      console.log(`✅ Tool executed successfully`);
      return result;

    } catch (error: any) {
      console.error(`❌ Tool execution failed:`, error);
      throw error;
    }
  }

  /**
   * Load hub configuration from file
   */
  private async loadHubConfig(): Promise<any> {
    const fs = await import('fs/promises');
    const configData = await fs.readFile(this.hubConfigPath, 'utf-8');
    return JSON.parse(configData);
  }

  /**
   * Convert MCP tool format to our ToolInfo format
   */
  private convertMCPToolToToolInfo(mcpTool: any): ToolInfo {
    // Extract serverId - try multiple approaches
    let serverId = 'unknown';

    // Approach 1: Check if Hub added server_id metadata
    if (mcpTool.server_id) {
      serverId = mcpTool.server_id;
    }
    // Approach 2: Try to parse from tool name (e.g., "mcp__spotify__search_tracks")
    else if (mcpTool.name && mcpTool.name.includes('__')) {
      const parts = mcpTool.name.split('__');
      if (parts.length >= 2) {
        serverId = parts[1]; // Extract server ID from mcp__serverId__toolName format
      }
    }
    // Approach 3: Check for server metadata
    else if (mcpTool.metadata?.serverId) {
      serverId = mcpTool.metadata.serverId;
    }

    // Extract tool name (remove mcp__ prefix if present)
    let toolName = mcpTool.name || 'unknown_tool';
    if (toolName.startsWith('mcp__') && toolName.includes('__')) {
      const parts = toolName.split('__');
      toolName = parts.slice(2).join('__'); // Get everything after mcp__serverId__
    }

    // Determine category based on serverId and tool name
    const category = this.determineCategory(serverId, toolName);

    // Determine complexity based on schema
    const complexity = this.determineComplexity(mcpTool.inputSchema);

    return {
      serverId,
      serverName: serverId,
      toolName,
      description: mcpTool.description || 'No description available',
      category,
      schema: mcpTool.inputSchema || { type: 'object', properties: {} },
      complexity,
      reliabilityScore: 8, // Default score
      ptName: undefined,
      ptDescription: undefined,
    };
  }

  /**
   * Determine tool category based on server and tool name
   */
  private determineCategory(serverId: string, toolName: string): string {
    // Server-based categories
    const serverCategories: Record<string, string> = {
      'spotify': 'Media',
      'youtube': 'Media',
      'outlook-fernando': 'Communication',
      'trello': 'Productivity',
      'notion': 'Productivity',
      'codex': 'Development',
    };

    if (serverCategories[serverId]) {
      return serverCategories[serverId];
    }

    // Keyword-based categories
    const toolLower = toolName.toLowerCase();
    if (toolLower.includes('email') || toolLower.includes('mail') || toolLower.includes('message')) {
      return 'Communication';
    }
    if (toolLower.includes('music') || toolLower.includes('track') || toolLower.includes('play') || toolLower.includes('video')) {
      return 'Media';
    }
    if (toolLower.includes('board') || toolLower.includes('card') || toolLower.includes('task') || toolLower.includes('page')) {
      return 'Productivity';
    }
    if (toolLower.includes('code') || toolLower.includes('chat') || toolLower.includes('execute')) {
      return 'Development';
    }

    return 'General';
  }

  /**
   * Determine complexity based on input schema
   */
  private determineComplexity(schema: any): 'basic' | 'intermediate' | 'advanced' {
    if (!schema || !schema.properties) {
      return 'basic';
    }

    const propCount = Object.keys(schema.properties).length;
    const hasRequired = schema.required && schema.required.length > 0;
    const hasNested = Object.values(schema.properties).some(
      (prop: any) => prop.type === 'object' || prop.type === 'array'
    );

    if (propCount > 5 || (hasNested && hasRequired)) {
      return 'advanced';
    }
    if (propCount > 2 || hasRequired) {
      return 'intermediate';
    }
    return 'basic';
  }
}
