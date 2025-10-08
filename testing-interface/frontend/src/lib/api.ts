// API Client for MCP Hub Testing Interface

const API_BASE_URL = 'http://localhost:3000/api';

export interface ServerInfo {
  id: string;
  name: string;
  enabled: boolean;
  connected: boolean;
  toolCount: number;
  health: 'healthy' | 'degraded' | 'offline';
}

export interface ToolInfo {
  serverId: string;
  serverName: string;
  toolName: string;
  description: string;
  category?: string;
  ptName?: string;
  ptDescription?: string;
  schema: any;
  complexity?: string;
  reliabilityScore?: number;
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
  };
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error?.message || 'Request failed');
    }

    return data.data;
  }

  // Server endpoints
  async getServers(): Promise<{ servers: ServerInfo[]; total: number }> {
    return this.request('/servers');
  }

  async getServerTools(serverId: string): Promise<{ tools: ToolInfo[]; total: number }> {
    return this.request(`/servers/${serverId}/tools`);
  }

  // Tools endpoints
  async getAllTools(filters?: {
    search?: string;
    category?: string;
    server?: string;
  }): Promise<{ tools: ToolInfo[]; total: number }> {
    const params = new URLSearchParams(filters as any);
    return this.request(`/tools?${params}`);
  }

  async getTool(serverId: string, toolName: string): Promise<ToolInfo> {
    return this.request(`/tools/${serverId}/${toolName}`);
  }

  // Execute endpoint
  async executeTool(
    serverId: string,
    toolName: string,
    parameters: Record<string, any>
  ): Promise<ExecutionResult> {
    return this.request('/execute', {
      method: 'POST',
      body: JSON.stringify({ serverId, toolName, parameters }),
    });
  }

  // Health endpoint
  async healthCheck(): Promise<{ status: string; uptime: number }> {
    return this.request('/health');
  }
}

export const api = new ApiClient();
