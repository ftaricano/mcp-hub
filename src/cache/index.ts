import NodeCache from 'node-cache';
import { ToolMetadata } from '../types/index.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger();

export class HubCache {
  private cache: NodeCache;
  private toolsCache: NodeCache;
  private enabled: boolean;

  constructor(ttlSeconds: number = 300, enabled: boolean = true) {
    this.enabled = enabled;
    
    // Main cache for responses
    this.cache = new NodeCache({
      stdTTL: ttlSeconds,
      checkperiod: ttlSeconds * 0.2,
      useClones: false,
    });

    // Dedicated cache for tools metadata
    this.toolsCache = new NodeCache({
      stdTTL: ttlSeconds,
      checkperiod: ttlSeconds * 0.2,
      useClones: false,
    });

    if (enabled) {
      this.setupEventHandlers();
    }
  }

  private setupEventHandlers(): void {
    this.cache.on('set', (key, value) => {
      logger.debug('Cache set:', { key, size: JSON.stringify(value).length });
    });

    this.cache.on('expired', (key, value) => {
      logger.debug('Cache expired:', { key });
    });

    this.toolsCache.on('set', (key, value) => {
      logger.debug('Tools cache set:', { key, toolCount: Array.isArray(value) ? value.length : 1 });
    });
  }

  // Generic cache operations
  get<T>(key: string): T | undefined {
    if (!this.enabled) return undefined;

    const value = this.cache.get<T>(key);
    if (value !== undefined) {
      logger.debug('Cache hit:', { key });
    }
    return value;
  }

  set<T>(key: string, value: T, ttl?: number): boolean {
    if (!this.enabled) return false;

    const result = ttl !== undefined ? this.cache.set(key, value, ttl) : this.cache.set(key, value);
    logger.debug('Cache set result:', { key, success: result });
    return result;
  }

  del(key: string): number {
    if (!this.enabled) return 0;

    const result = this.cache.del(key);
    logger.debug('Cache delete:', { key, deletedCount: result });
    return result;
  }

  // Tools-specific cache operations
  getTools(serverId: string): ToolMetadata[] | undefined {
    if (!this.enabled) return undefined;

    const tools = this.toolsCache.get<ToolMetadata[]>(`tools:${serverId}`);
    if (tools) {
      logger.debug('Tools cache hit:', { serverId, toolCount: tools.length });
    }
    return tools;
  }

  setTools(serverId: string, tools: ToolMetadata[], ttl?: number): boolean {
    if (!this.enabled) return false;

    const result = ttl !== undefined 
      ? this.toolsCache.set(`tools:${serverId}`, tools, ttl)
      : this.toolsCache.set(`tools:${serverId}`, tools);
    logger.debug('Tools cache set:', { serverId, toolCount: tools.length, success: result });
    return result;
  }

  invalidateTools(serverId: string): number {
    if (!this.enabled) return 0;

    const result = this.toolsCache.del(`tools:${serverId}`);
    logger.debug('Tools cache invalidated:', { serverId, deletedCount: result });
    return result;
  }

  getAllCachedTools(): ToolMetadata[] {
    if (!this.enabled) return [];

    const allTools: ToolMetadata[] = [];
    const keys = this.toolsCache.keys().filter(key => key.startsWith('tools:'));
    
    for (const key of keys) {
      const tools = this.toolsCache.get<ToolMetadata[]>(key);
      if (tools) {
        allTools.push(...tools);
      }
    }

    return allTools;
  }

  // Tool call result caching
  getToolResult(serverId: string, toolName: string, argsHash: string): any {
    if (!this.enabled) return null;

    const key = `result:${serverId}:${toolName}:${argsHash}`;
    const result = this.cache.get(key);
    if (result !== undefined) {
      logger.debug('Tool result cache hit:', { serverId, toolName });
      return result;
    }
    return null;
  }

  setToolResult(
    serverId: string,
    toolName: string,
    argsHash: string,
    result: any,
    ttl?: number
  ): boolean {
    if (!this.enabled) return false;

    const key = `result:${serverId}:${toolName}:${argsHash}`;
    const success = ttl !== undefined 
      ? this.cache.set(key, result, ttl)
      : this.cache.set(key, result);
    logger.debug('Tool result cached:', { serverId, toolName, success });
    return success;
  }

  // Server health caching
  getServerHealth(serverId: string): boolean | undefined {
    if (!this.enabled) return undefined;

    return this.cache.get<boolean>(`health:${serverId}`);
  }

  setServerHealth(serverId: string, isHealthy: boolean, ttl: number = 60): boolean {
    if (!this.enabled) return false;

    return this.cache.set(`health:${serverId}`, isHealthy, ttl);
  }

  // Cache statistics
  getStats(): {
    enabled: boolean;
    mainCache: { keys: number; hits: number; misses: number };
    toolsCache: { keys: number; hits: number; misses: number };
  } {
    return {
      enabled: this.enabled,
      mainCache: {
        keys: this.cache.keys().length,
        hits: this.cache.getStats().hits,
        misses: this.cache.getStats().misses,
      },
      toolsCache: {
        keys: this.toolsCache.keys().length,
        hits: this.toolsCache.getStats().hits,
        misses: this.toolsCache.getStats().misses,
      },
    };
  }

  // Cache management
  clear(): void {
    this.cache.flushAll();
    this.toolsCache.flushAll();
    logger.info('Cache cleared');
  }

  clearExpired(): void {
    const mainDeleted = this.cache.keys().length;
    const toolsDeleted = this.toolsCache.keys().length;
    
    this.cache.flushAll();
    this.toolsCache.flushAll();
    
    logger.info('Expired cache entries cleared:', { mainDeleted, toolsDeleted });
  }

  // Utility methods
  createArgsHash(args: Record<string, unknown>): string {
    // Simple hash function for arguments
    const str = JSON.stringify(args, Object.keys(args).sort());
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  // Configuration
  updateTTL(ttlSeconds: number): void {
    this.cache.options.stdTTL = ttlSeconds;
    this.toolsCache.options.stdTTL = ttlSeconds;
    logger.info('Cache TTL updated:', { ttlSeconds });
  }

  enable(): void {
    this.enabled = true;
    logger.info('Cache enabled');
  }

  disable(): void {
    this.enabled = false;
    this.clear();
    logger.info('Cache disabled and cleared');
  }
}