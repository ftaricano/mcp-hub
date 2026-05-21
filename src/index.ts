#!/usr/bin/env node

import dotenv from 'dotenv';
dotenv.config();

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  CallToolResult,
  ListToolsResult,
} from '@modelcontextprotocol/sdk/types.js';
import { loadConfig } from './config/default.js';
import { createLogger } from './utils/logger.js';
import { debugLogger } from './utils/debug-logger.js';
import { ServerRegistry } from './registry/index.js';
import { HubCache } from './cache/index.js';
import { ToolIntelligenceSystem } from './intelligence/tool-intelligence.js';
import { intelligentCache } from './cache/intelligent-cache.js';
import {
  CallToolParamsSchema,
  ListToolsParamsSchema,
  ListToolsResponse,
  HubError,
  ServerNotFoundError,
  ToolNotFoundError,
} from './types/index.js';
import { summarizeToolArguments } from './utils/redaction.js';

const config = loadConfig();
const logger = createLogger(config.logging.level, config.logging.format);

function inferCacheContext(
  serverId: string,
  toolName: string,
  description?: string,
  tags?: string[]
): string {
  const tokens = [serverId, toolName, description || '', ...(tags || [])].join(' ').toLowerCase();

  if (/(email|mail|inbox|outlook|message)/.test(tokens)) {
    return 'email';
  }

  if (/(music|song|track|playlist|audio)/.test(tokens)) {
    return 'music';
  }

  if (/(project|task|ticket|board|issue|card|kanban)/.test(tokens)) {
    return 'project';
  }

  if (/(doc|docs|wiki|knowledge|note|notebook|page)/.test(tokens)) {
    return 'knowledge';
  }

  if (/(file|document|storage|drive|sharepoint|onedrive)/.test(tokens)) {
    return 'files';
  }

  return 'general';
}

class MCPHub {
  private server: Server;
  private registry: ServerRegistry;
  private cache: HubCache;

  constructor() {
    this.server = new Server(
      {
        name: '@mcp/hub',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.registry = new ServerRegistry(process.env.HUB_CONFIG);
    this.cache = new HubCache(
      config.cache.ttl / 1000, // Convert ms to seconds
      config.cache.enabled
    );

    this.setupTools();
    this.setupErrorHandling();
  }

  private setupTools(): void {
    // Tool 1: list-all-tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      try {
        logger.info('Handling ListToolsRequest - returning ALL tools from registry');

        // Get ALL tools from registered servers
        let allServerTools = this.registry.getAllTools();

        logger.info(`Found ${allServerTools.length} tools from registered servers`);

        // Convert registry tools to MCP SDK format
        const serverTools = allServerTools.map((tool) => {
          // Ensure schema has type: "object"
          const schema = tool.schema || {};
          return {
            name: `mcp__${tool.server_id}__${tool.tool_name}`,
            description: tool.description,
            inputSchema: {
              type: 'object' as const,
              ...(schema.properties ? { properties: schema.properties } : {}),
              ...(schema.required ? { required: schema.required } : {}),
            },
          };
        });

        // Hub's own tools
        const hubTools = [
          {
            name: 'list-all-tools',
            description: 'List all available tools from registered MCP servers',
            inputSchema: {
              type: 'object' as const,
              properties: {
                query: { type: 'string', description: 'Filter tools by query' },
                tags: { type: 'array', items: { type: 'string' }, description: 'Filter by tags' },
                server_id: { type: 'string', description: 'Filter by server ID' },
                limit: { type: 'number', default: 50, description: 'Maximum results' },
                offset: { type: 'number', default: 0, description: 'Results offset' },
              },
            },
          },
          {
            name: 'call-tool',
            description: 'Call any tool from any registered MCP server',
            inputSchema: {
              type: 'object' as const,
              properties: {
                server_id: { type: 'string', description: 'ID of the target server' },
                tool_name: { type: 'string', description: 'Name of the tool to call' },
                arguments: { type: 'object', description: 'Arguments for the tool' },
              },
              required: ['server_id', 'tool_name'],
            },
          },
          {
            name: 'smart-search',
            description:
              'Busca inteligente de ferramentas em português com análise de intenção e recomendações contextuais',
            inputSchema: {
              type: 'object' as const,
              properties: {
                query: {
                  type: 'string',
                  description:
                    'Consulta em português (ex: "enviar email", "tocar música", "criar tarefa")',
                },
                context: { type: 'string', description: 'Contexto adicional (opcional)' },
                limit: { type: 'number', default: 5, description: 'Máximo de resultados' },
              },
              required: ['query'],
            },
          },
          {
            name: 'get-recommendations',
            description:
              'Obtém recomendações e ferramentas relacionadas baseadas no uso e contexto',
            inputSchema: {
              type: 'object' as const,
              properties: {
                category: {
                  type: 'string',
                  description: 'Categoria (Comunicação, Entretenimento, Produtividade, etc.)',
                },
                recent: {
                  type: 'boolean',
                  default: false,
                  description: 'Mostrar ferramentas usadas recentemente',
                },
                popular: {
                  type: 'boolean',
                  default: true,
                  description: 'Mostrar ferramentas populares',
                },
              },
            },
          },
        ];

        // Combine hub tools + all server tools
        const allTools = [...hubTools, ...serverTools] as any[];

        logger.info(
          `Returning ${allTools.length} total tools (4 hub + ${serverTools.length} from servers)`
        );

        return {
          tools: allTools,
        };
      } catch (error) {
        logger.error('Error in list-all-tools:', error);
        throw new HubError('Failed to list tools', 'LIST_TOOLS_ERROR');
      }
    });

    // Tool 2: call-tool
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        logger.info('Handling call-tool request:', { name: request.params.name });

        if (request.params.name === 'list-all-tools') {
          return await this.handleListAllTools(request.params.arguments || {});
        }

        if (request.params.name === 'call-tool') {
          return await this.handleCallTool(request.params.arguments || {});
        }

        if (request.params.name === 'smart-search') {
          return await this.handleSmartSearch(request.params.arguments || {});
        }

        if (request.params.name === 'get-recommendations') {
          return await this.handleGetRecommendations(request.params.arguments || {});
        }

        throw new ToolNotFoundError('hub', request.params.name);
      } catch (error) {
        logger.error('Error in call-tool:', error);

        if (error instanceof HubError) {
          throw error;
        }

        throw new HubError('Tool execution failed', 'TOOL_EXECUTION_ERROR', {
          toolName: request.params.name,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });
  }

  private async handleListAllTools(args: unknown): Promise<CallToolResult> {
    const params = ListToolsParamsSchema.parse(args);

    logger.info('Listing tools with params:', params);

    // Get tools from registry with caching
    let allTools = this.cache.getAllCachedTools();

    if (allTools.length === 0) {
      // Cache miss, refresh from registry
      await this.registry.refreshAll();
      allTools = this.registry.getAllTools();
    }

    // Apply filters
    const filteredTools = this.registry.filterTools(params.query, params.tags, params.server_id);

    // Add hub's own tools
    const hubTools = [
      {
        server_id: 'hub',
        server_name: 'MCP Hub',
        tool_name: 'list-all-tools',
        description: 'List all available tools from registered MCP servers',
        schema: {},
        tags: ['hub', 'core'],
        enabled: true,
        last_seen: new Date(),
      },
      {
        server_id: 'hub',
        server_name: 'MCP Hub',
        tool_name: 'call-tool',
        description: 'Call any tool from any registered MCP server',
        schema: {},
        tags: ['hub', 'core'],
        enabled: true,
        last_seen: new Date(),
      },
      {
        server_id: 'hub',
        server_name: 'MCP Hub',
        tool_name: 'smart-search',
        description:
          'Busca inteligente de ferramentas em português com análise de intenção e recomendações contextuais',
        schema: {},
        tags: ['hub', 'intelligent', 'português'],
        enabled: true,
        last_seen: new Date(),
      },
      {
        server_id: 'hub',
        server_name: 'MCP Hub',
        tool_name: 'get-recommendations',
        description: 'Obtém recomendações e ferramentas relacionadas baseadas no uso e contexto',
        schema: {},
        tags: ['hub', 'intelligent', 'recommendations'],
        enabled: true,
        last_seen: new Date(),
      },
    ];

    const allToolsWithHub = [...filteredTools, ...hubTools];

    // Apply pagination
    const start = params.offset || 0;
    const limit = params.limit || 50;
    const paginatedTools = allToolsWithHub.slice(start, start + limit);

    const response: ListToolsResponse = {
      total: allToolsWithHub.length,
      items: paginatedTools,
      has_more: start + limit < allToolsWithHub.length,
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response, null, 2),
        },
      ],
    };
  }

  private async handleCallTool(args: unknown): Promise<CallToolResult> {
    const params = CallToolParamsSchema.parse(args);
    const argumentSummary = summarizeToolArguments(params.arguments);

    logger.info('Calling tool:', {
      serverId: params.server_id,
      toolName: params.tool_name,
      argumentKeys: argumentSummary.argumentKeys,
      redactedKeys: argumentSummary.sensitiveKeys,
    });
    const startTime = Date.now();

    // Log tool call to debug logger
    debugLogger.log(`Calling ${params.server_id}/${params.tool_name}`, 'info');

    const toolKey = `${params.server_id}/${params.tool_name}`;

    // Check cache first (both old and intelligent cache)
    const argsHash = this.cache.createArgsHash(params.arguments);
    const cached = this.cache.getToolResult(params.server_id, params.tool_name, argsHash);

    if (cached) {
      logger.info('Returning cached result:', {
        serverId: params.server_id,
        toolName: params.tool_name,
      });
      // Update intelligent cache stats for cache hit
      const responseTime = Date.now() - startTime;
      intelligentCache.recordToolUsage(toolKey, responseTime, true);
      return cached;
    }

    // Route to actual server
    try {
      const result = await this.registry.callTool(
        params.server_id,
        params.tool_name,
        params.arguments
      );

      const responseTime = Date.now() - startTime;

      // Cache successful results (both caches)
      this.cache.setToolResult(params.server_id, params.tool_name, argsHash, result);

      // Record usage in intelligent cache
      intelligentCache.recordToolUsage(toolKey, responseTime, true);

      // Cache result in intelligent cache with context
      const serverConfig = this.registry.getServerConfig(params.server_id);
      const toolMetadata = this.registry
        .getServerTools(params.server_id)
        .find((tool) => tool.tool_name === params.tool_name);
      const context = inferCacheContext(
        params.server_id,
        params.tool_name,
        toolMetadata?.description || serverConfig?.name,
        toolMetadata?.tags || serverConfig?.tags
      );
      intelligentCache.set(toolKey + '_' + argsHash, result, undefined, context);

      logger.info('Tool call successful:', {
        serverId: params.server_id,
        toolName: params.tool_name,
        responseTime: `${responseTime}ms`,
      });

      return result;
    } catch (error) {
      const responseTime = Date.now() - startTime;

      // Record failure in intelligent cache
      intelligentCache.recordToolUsage(toolKey, responseTime, false);

      logger.error('Tool call failed:', {
        serverId: params.server_id,
        toolName: params.tool_name,
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime: `${responseTime}ms`,
      });

      if (error instanceof Error) {
        throw error;
      }

      throw new HubError('Tool execution failed', 'TOOL_EXECUTION_ERROR');
    }
  }

  private setupErrorHandling(): void {
    this.server.onerror = (error) => {
      logger.error('Server error:', error);
    };

    process.on('SIGINT', async () => {
      logger.info('Shutting down MCP Hub...');
      await this.cleanup();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      logger.info('Received SIGTERM, shutting down gracefully...');
      await this.cleanup();
      process.exit(0);
    });
  }

  // Handler para busca inteligente
  private async handleSmartSearch(args: unknown): Promise<CallToolResult> {
    try {
      const params = { query: '', context: '', limit: 5, ...(args as any) } as {
        query: string;
        context?: string;
        limit?: number;
      };

      if (!params.query) {
        throw new Error('Query é obrigatória');
      }

      logger.info('Smart search request:', params);

      // Busca inteligente usando o sistema de inteligência
      const results = ToolIntelligenceSystem.smartSearch(params.query, params.context);
      const limited = results.slice(0, params.limit || 5);

      // Análise de intenção
      const intent = ToolIntelligenceSystem.analyzeIntent(params.query);

      // Monta resposta inteligente
      const response = {
        query: params.query,
        intent: {
          action: intent.action,
          target: intent.target,
          confidence: intent.confidence,
        },
        results: limited.map((result) => ({
          server_id: result.server_id,
          tool_name: result.tool_name,
          pt_name: result.pt_name,
          pt_description: result.pt_description,
          category: result.category,
          subcategory: result.subcategory,
          action_type: result.action_type,
          use_cases: result.use_cases,
          typical_params: result.typical_params,
          confidence_score: result.performance_score, // Reutilizado como score de confiança
          complexity_level: result.complexity_level,
        })),
        total_found: results.length,
        suggestions:
          intent.suggestions?.map((s) => ({
            server_id: s.server_id,
            tool_name: s.tool_name,
            pt_name: s.pt_name,
            reason: 'Sugerido pela análise de intenção',
          })) || [],
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(response, null, 2),
          },
        ],
      };
    } catch (error) {
      logger.error('Smart search error:', error);
      throw new HubError('Erro na busca inteligente', 'SMART_SEARCH_ERROR');
    }
  }

  // Handler para recomendações
  private async handleGetRecommendations(args: unknown): Promise<CallToolResult> {
    try {
      const params = { recent: false, popular: true, ...(args as any) } as {
        category?: string;
        recent?: boolean;
        popular?: boolean;
      };

      logger.info('Recommendations request:', params);

      const response: any = {
        categories: ToolIntelligenceSystem.getCategories(),
        stats: ToolIntelligenceSystem.getStats(),
        cache_stats: intelligentCache.getStats(),
      };

      // Recomendações por categoria
      if (params.category) {
        response.category_tools = ToolIntelligenceSystem.getToolsByCategory(params.category).map(
          (tool) => ({
            server_id: tool.server_id,
            tool_name: tool.tool_name,
            pt_name: tool.pt_name,
            pt_description: tool.pt_description,
            reliability_score: tool.reliability_score,
            complexity_level: tool.complexity_level,
          })
        );
      }

      // Ferramentas populares
      if (params.popular) {
        response.popular_tools = intelligentCache.getMostPopularTools(10).map((stat) => ({
          tool_key: stat.toolKey,
          usage_count: stat.usageCount,
          success_rate: stat.successRate,
          avg_response_time: stat.avgResponseTime,
          popularity_score: stat.popularityScore,
        }));
      }

      // Ferramentas recentes
      if (params.recent) {
        response.recent_tools = intelligentCache.getRecentlyUsedTools(5).map((stat) => ({
          tool_key: stat.toolKey,
          last_used: new Date(stat.lastUsed).toISOString(),
          usage_count: stat.usageCount,
          success_rate: stat.successRate,
        }));
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(response, null, 2),
          },
        ],
      };
    } catch (error) {
      logger.error('Recommendations error:', error);
      throw new HubError('Erro ao obter recomendações', 'RECOMMENDATIONS_ERROR');
    }
  }

  private async cleanup(): Promise<void> {
    try {
      await this.registry.cleanup();
      this.cache.clear();
      await this.server.close();
      logger.info('Cleanup completed');
    } catch (error) {
      logger.error('Error during cleanup:', error);
    }
  }

  async start(): Promise<void> {
    // Start debug monitoring
    debugLogger.logStartup();

    // Enable live monitoring if DEBUG_MODE is set
    if (process.env.DEBUG_MODE === 'true' || process.env.MCP_DEBUG === 'true') {
      debugLogger.startMonitoring();
    }

    logger.info('Starting MCP Hub...');

    // Connect MCP transport first so Codex can handshake quickly
    const transport = new StdioServerTransport();
    await this.server.connect(transport);

    // Continue startup tasks in background to avoid client timeouts
    (async () => {
      try {
        // Clean up any orphaned processes before starting
        const processManager = (await import('./utils/process-manager.js')).default;
        await processManager.cleanupOrphans();
        logger.info('Cleaned up orphaned processes');

        // Load server configurations
        await this.registry.loadConfig();
        logger.info('Server configurations loaded');
        debugLogger.log('Server configurations loaded', 'success');

        // Initialize registry with available servers
        await this.registry.refreshAll();

        const stats = this.registry.getStats();
        const serverStatuses = this.registry.getAllServerStatuses();

        // Update debug logger with server status
        for (const [serverId, status] of Object.entries(serverStatuses)) {
          const serverStatus = status.connected ? 'connected' : 'disconnected';
          debugLogger.updateServerStatus(serverId, serverStatus as any, status.toolCount);

          // Get tools for connected servers
          if (status.connected) {
            // Get tools from registry for this server
            const serverTools = this.registry.getServerTools(serverId);
            if (serverTools && serverTools.length > 0) {
              debugLogger.updateTools(serverId, serverTools);
            }
          }
        }

        logger.info('MCP Hub started successfully', {
          ...stats,
          serverStatuses,
        });

        // Log summary to console
        debugLogger.log(
          `MCP Hub started: ${stats.servers} servers, ${stats.tools} tools`,
          'success'
        );
      } catch (error) {
        logger.error('Failed to complete MCP Hub startup:', error);
        debugLogger.log(`Failed to start: ${error}`, 'error');
      }
    })();
  }
}

// Start the server
const hub = new MCPHub();
hub.start().catch((error) => {
  logger.error('Failed to start MCP Hub:', error);
  process.exit(1);
});
