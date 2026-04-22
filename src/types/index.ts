import { z } from 'zod';

// Core MCP Hub Types
export interface ToolMetadata {
  server_id: string;
  server_name: string;
  tool_name: string;
  description: string;
  schema: Record<string, unknown>;
  tags?: string[];
  enabled: boolean;
  last_seen: Date;
}

export interface ServerConfig {
  id: string;
  name: string;
  command: string;
  args: string[];
  env?: Record<string, string>;
  envFile?: string;
  inheritEnv?: string[];
  protocol: 'stdio' | 'http';
  url?: string;
  enabled: boolean;
  timeout?: number;
  retries?: number;
  toolCallRetries?: {
    enabled?: boolean;
    maxAttempts?: number;
    retryableTools?: string[];
  };
  tags?: string[];
}

export interface HubConfig {
  servers: ServerConfig[];
  cache: {
    enabled: boolean;
    ttl: number;
  };
  security: {
    rate_limit: number;
    validate_schemas: boolean;
  };
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    format: 'json' | 'simple';
  };
}

// Request/Response Types
export const CallToolParamsSchema = z.object({
  server_id: z.string().min(1),
  tool_name: z.string().min(1),
  arguments: z.record(z.unknown()).optional().default({}),
});

export type CallToolParams = z.infer<typeof CallToolParamsSchema>;

export const ListToolsParamsSchema = z.object({
  query: z.string().optional(),
  tags: z.array(z.string()).optional(),
  server_id: z.string().optional(),
  limit: z.number().min(1).max(100).optional().default(50),
  offset: z.number().min(0).optional().default(0),
});

export type ListToolsParams = z.infer<typeof ListToolsParamsSchema>;

export interface ListToolsResponse {
  total: number;
  items: ToolMetadata[];
  has_more: boolean;
}

// Connection Types
export interface ConnectionInfo {
  id: string;
  server_id: string;
  protocol: 'stdio' | 'http';
  status: 'connected' | 'disconnected' | 'error';
  created_at: Date;
  last_used: Date;
  error_count: number;
}

// Error Types
export class HubError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'HubError';
  }
}

export class ServerNotFoundError extends HubError {
  constructor(serverId: string) {
    super(`Server not found: ${serverId}`, 'SERVER_NOT_FOUND', { serverId });
  }
}

export class ToolNotFoundError extends HubError {
  constructor(serverId: string, toolName: string) {
    super(`Tool not found: ${toolName} on server ${serverId}`, 'TOOL_NOT_FOUND', {
      serverId,
      toolName,
    });
  }
}

export class ConnectionError extends HubError {
  constructor(serverId: string, reason: string) {
    super(`Connection failed to server ${serverId}: ${reason}`, 'CONNECTION_ERROR', {
      serverId,
      reason,
    });
  }
}