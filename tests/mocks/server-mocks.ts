import { vi } from 'vitest';
import type { Tool, ToolResult } from '@modelcontextprotocol/sdk/types.js';

export interface MockServerResponse {
  tools: Tool[];
  result: ToolResult;
  latency: number;
  error?: Error;
}

export class MockServerManager {
  private servers = new Map<string, MockServerResponse>();
  private downServers = new Set<string>();
  private networkDelays = new Map<string, number>();

  mockServer(serverId: string, response: Partial<MockServerResponse>) {
    this.servers.set(serverId, {
      tools: response.tools || [],
      result: response.result || { content: [{ type: 'text', text: 'Mock result' }] },
      latency: response.latency || 100,
      error: response.error,
    });
  }

  mockServerDown(serverId: string) {
    this.downServers.add(serverId);
  }

  mockServerUp(serverId: string) {
    this.downServers.delete(serverId);
  }

  mockNetworkDelay(serverId: string, delay: number) {
    this.networkDelays.set(serverId, delay);
  }

  isServerDown(serverId: string): boolean {
    return this.downServers.has(serverId);
  }

  getServerLatency(serverId: string): number {
    const mockResponse = this.servers.get(serverId);
    const networkDelay = this.networkDelays.get(serverId) || 0;
    return (mockResponse?.latency || 100) + networkDelay;
  }

  async simulateServerCall(serverId: string, toolName: string, args: any) {
    if (this.isServerDown(serverId)) {
      throw new Error(`Server ${serverId} is unavailable`);
    }

    const latency = this.getServerLatency(serverId);
    await new Promise((resolve) => setTimeout(resolve, latency));

    const mockResponse = this.servers.get(serverId);
    if (mockResponse?.error) {
      throw mockResponse.error;
    }

    return mockResponse?.result || { content: [{ type: 'text', text: 'Default mock result' }] };
  }

  reset() {
    this.servers.clear();
    this.downServers.clear();
    this.networkDelays.clear();
  }
}

// Mock data for different servers
export const MOCK_TOOLS_BY_SERVER = {
  trello: [
    {
      name: 'get_boards',
      description: 'List all boards',
      inputSchema: { type: 'object', properties: {} },
    },
    {
      name: 'add_card_to_list',
      description: 'Add card to list',
      inputSchema: {
        type: 'object',
        properties: {
          listId: { type: 'string' },
          name: { type: 'string' },
        },
        required: ['listId', 'name'],
      },
    },
  ],

  'email-primary': [
    {
      name: 'list_emails',
      description: 'List emails',
      inputSchema: {
        type: 'object',
        properties: {
          search: { type: 'string' },
          limit: { type: 'number' },
        },
      },
    },
    {
      name: 'send_email',
      description: 'Send email',
      inputSchema: {
        type: 'object',
        properties: {
          to: { type: 'string' },
          subject: { type: 'string' },
          body: { type: 'string' },
        },
        required: ['to', 'subject', 'body'],
      },
    },
  ],

  spotify: [
    {
      name: 'play_track',
      description: 'Play a track',
      inputSchema: {
        type: 'object',
        properties: {
          trackId: { type: 'string' },
        },
        required: ['trackId'],
      },
    },
    {
      name: 'search_tracks',
      description: 'Search for tracks',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string' },
        },
        required: ['query'],
      },
    },
  ],
};

export const MOCK_EMAIL_DATA = {
  emails: [
    {
      id: 'email-1',
      subject: 'Projeto de desenvolvimento - Reunião',
      from: 'client@example.com',
      body: 'Precisamos agendar uma reunião para discutir o projeto.',
      receivedDateTime: '2024-01-15T10:30:00Z',
      hasAttachments: false,
      isRead: false,
    },
    {
      id: 'email-2',
      subject: 'Proposta comercial - Urgente',
      from: 'sales@partner.example',
      body: 'Segue em anexo a proposta solicitada.',
      receivedDateTime: '2024-01-15T09:15:00Z',
      hasAttachments: true,
      isRead: true,
    },
  ],
};

export const MOCK_TRELLO_DATA = {
  boards: [
    { id: 'board-1', name: 'Desenvolvimento', desc: 'Board principal' },
    { id: 'board-2', name: 'Marketing', desc: 'Campanhas e conteúdo' },
  ],
  lists: [
    { id: 'list-1', name: 'Backlog', idBoard: 'board-1' },
    { id: 'list-2', name: 'Em Progresso', idBoard: 'board-1' },
    { id: 'list-3', name: 'Concluído', idBoard: 'board-1' },
  ],
  cards: [
    {
      id: 'card-1',
      name: 'Implementar autenticação',
      desc: 'Sistema de login e registro',
      idList: 'list-1',
    },
  ],
};

export const MOCK_SPOTIFY_DATA = {
  tracks: [
    {
      id: 'track-1',
      name: 'Focus Music',
      artist: 'Ambient Artist',
      duration: 180000,
    },
    {
      id: 'track-2',
      name: 'Deep Work',
      artist: 'Concentration',
      duration: 240000,
    },
  ],
  playlists: [
    {
      id: 'playlist-1',
      name: 'Work Focus',
      description: 'Music for productivity',
      tracks: ['track-1', 'track-2'],
    },
  ],
};
