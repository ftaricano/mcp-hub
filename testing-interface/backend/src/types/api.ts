// API Types for MCP Hub Testing Interface

export interface ServerInfo {
  id: string;
  name: string;
  protocol: 'stdio' | 'http';
  enabled: boolean;
  connected: boolean;
  toolCount: number;
  lastSeen?: string;
  health: 'healthy' | 'degraded' | 'offline';
  responseTime?: number;
}

export interface ToolInfo {
  serverId: string;
  serverName: string;
  toolName: string;
  description: string;
  category?: string;
  subcategory?: string;
  actionType?: string;
  ptName?: string;
  ptDescription?: string;
  schema: any;
  complexity?: 'basic' | 'intermediate' | 'advanced';
  reliabilityScore?: number;
}

export interface ExecutionRequest {
  serverId: string;
  toolName: string;
  parameters: Record<string, any>;
  metadata?: {
    testName?: string;
    tags?: string[];
  };
}

export interface ExecutionResult {
  executionId: string;
  serverId: string;
  toolName: string;
  result: any;
  executionTime: number;
  timestamp: string;
  status: 'success' | 'error';
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
}
