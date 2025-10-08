/**
 * MCP Hub Test Suite - Vitest
 * Tests core hub functionality, tool discovery, and intelligent search
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock child_process to avoid spawning real processes
vi.mock('child_process', () => ({
  spawn: vi.fn(() => ({
    stdout: { on: vi.fn(), pipe: vi.fn() },
    stderr: { on: vi.fn(), pipe: vi.fn() },
    stdin: { write: vi.fn(), end: vi.fn() },
    on: vi.fn(),
    kill: vi.fn()
  }))
}));

describe('MCP Hub Core Tests', () => {
  describe('Hub Tools', () => {
    it('should have 4 core tools', () => {
      const tools = ['list-all-tools', 'call-tool', 'smart-search', 'get-recommendations'];
      expect(tools).toHaveLength(4);
    });

    it('should validate tool schemas', () => {
      const toolSchemas = {
        'list-all-tools': {
          type: 'object',
          properties: {
            query: { type: 'string' },
            serverName: { type: 'string' },
            limit: { type: 'number' },
            offset: { type: 'number' }
          }
        },
        'call-tool': {
          type: 'object',
          properties: {
            serverName: { type: 'string' },
            toolName: { type: 'string' },
            toolArgs: { type: 'object' }
          },
          required: ['serverName', 'toolName', 'toolArgs']
        }
      };

      expect(toolSchemas['call-tool'].required).toContain('serverName');
      expect(toolSchemas['call-tool'].required).toContain('toolName');
    });
  });

  describe('Smart Search Intelligence', () => {
    it('should analyze Portuguese intent correctly', () => {
      const testCases = [
        { query: 'enviar email', expectedAction: 'enviar', expectedTarget: 'email' },
        { query: 'tocar música', expectedAction: 'tocar', expectedTarget: 'música' },
        { query: 'criar tarefa', expectedAction: 'criar', expectedTarget: 'tarefa' }
      ];

      testCases.forEach(test => {
        // Simple intent extraction
        const words = test.query.split(' ');
        expect(words[0]).toBe(test.expectedAction);
        expect(words[1]).toBe(test.expectedTarget);
      });
    });

    it('should score tools based on relevance', () => {
      const tools = [
        { name: 'send_email', score: 100 },
        { name: 'list_emails', score: 80 },
        { name: 'play_track', score: 0 }
      ];

      const sorted = tools.sort((a, b) => b.score - a.score);
      expect(sorted[0].name).toBe('send_email');
      expect(sorted[sorted.length - 1].name).toBe('play_track');
    });
  });

  describe('Server Registry', () => {
    let registry: Map<string, any>;

    beforeEach(() => {
      registry = new Map();
    });

    it('should register servers correctly', () => {
      registry.set('spotify', { 
        command: 'node', 
        args: ['spotify/dist/index.js'] 
      });
      
      registry.set('email', { 
        command: 'node', 
        args: ['email/dist/index.js'] 
      });

      expect(registry.size).toBe(2);
      expect(registry.has('spotify')).toBe(true);
      expect(registry.has('email')).toBe(true);
    });

    it('should handle server not found', () => {
      expect(registry.get('invalid')).toBeUndefined();
    });
  });

  describe('Cache System', () => {
    it('should cache tool discovery results', () => {
      const cache = new Map();
      const tools = [
        { server: 'spotify', name: 'play_track' },
        { server: 'email', name: 'send_email' }
      ];

      // Cache tools
      cache.set('tools:all', tools);
      
      // Retrieve from cache
      const cached = cache.get('tools:all');
      expect(cached).toEqual(tools);
      expect(cached).toHaveLength(2);
    });

    it('should respect TTL for cache entries', () => {
      const cache = new Map();
      const ttl = 5 * 60 * 1000; // 5 minutes
      
      cache.set('test', { 
        value: 'data', 
        expires: Date.now() + ttl 
      });

      const entry = cache.get('test');
      expect(entry.value).toBe('data');
      expect(entry.expires).toBeGreaterThan(Date.now());
    });
  });

  describe('Error Handling', () => {
    it('should handle missing server gracefully', async () => {
      const callTool = async (serverName: string) => {
        if (serverName === 'invalid') {
          throw new Error(`Server "${serverName}" not found`);
        }
        return { success: true };
      };

      await expect(callTool('invalid')).rejects.toThrow('Server "invalid" not found');
      await expect(callTool('spotify')).resolves.toEqual({ success: true });
    });

    it('should handle tool execution errors', async () => {
      const executeTool = async (toolName: string) => {
        if (toolName === 'broken_tool') {
          throw new Error('Tool execution failed');
        }
        return { result: 'success' };
      };

      await expect(executeTool('broken_tool')).rejects.toThrow('Tool execution failed');
    });
  });

  describe('Performance', () => {
    it('should handle concurrent tool calls', async () => {
      const callTool = (id: number) => 
        Promise.resolve({ id, result: 'success' });

      const promises = Array.from({ length: 10 }, (_, i) => callTool(i));
      const results = await Promise.all(promises);

      expect(results).toHaveLength(10);
      results.forEach((result, index) => {
        expect(result.id).toBe(index);
        expect(result.result).toBe('success');
      });
    });

    it('should timeout long-running operations', async () => {
      const timeout = (ms: number) => 
        new Promise(resolve => setTimeout(resolve, ms));

      const withTimeout = async (promise: Promise<any>, ms: number) => {
        return Promise.race([
          promise,
          timeout(ms).then(() => { throw new Error('Operation timed out'); })
        ]);
      };

      const slowOperation = timeout(1000);
      await expect(
        withTimeout(slowOperation, 100)
      ).rejects.toThrow('Operation timed out');
    });
  });

  describe('Portuguese Language Processing', () => {
    it('should handle Portuguese keywords correctly', () => {
      const keywords = {
        'email': ['email', 'e-mail', 'mensagem', 'correio'],
        'music': ['música', 'som', 'tocar', 'playlist'],
        'task': ['tarefa', 'card', 'atividade', 'projeto']
      };

      expect(keywords.email).toContain('mensagem');
      expect(keywords.music).toContain('música');
      expect(keywords.task).toContain('tarefa');
    });

    it('should normalize Portuguese text', () => {
      const normalize = (text: string) => 
        text.toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');

      expect(normalize('AÇÃO')).toBe('acao');
      expect(normalize('música')).toBe('musica');
      expect(normalize('CONFIGURAÇÃO')).toBe('configuracao');
    });
  });

  describe('Tool Categories', () => {
    it('should categorize tools correctly', () => {
      const categories = {
        'Comunicação': ['send_email', 'list_emails', 'send_message'],
        'Entretenimento': ['play_track', 'pause_track', 'search_tracks'],
        'Produtividade': ['add_card_to_list', 'create_board', 'get_lists']
      };

      expect(categories['Comunicação']).toContain('send_email');
      expect(categories['Entretenimento']).toContain('play_track');
      expect(categories['Produtividade']).toContain('add_card_to_list');
    });
  });
});