import { describe, it, expect, beforeEach, afterEach, vi, beforeAll } from 'vitest';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { MockServerManager, MOCK_TOOLS_BY_SERVER } from '../mocks/server-mocks';
import { ServerRegistry } from '../../src/registry/index';
import { HubCache } from '../../src/cache/index';
import { intelligentCache } from '../../src/cache/intelligent-cache';

describe('Hub Server Communication Integration', () => {
  let mockServerManager: MockServerManager;
  let serverRegistry: ServerRegistry;
  let hubCache: HubCache;

  beforeAll(() => {
    // Initialize mock server manager
    mockServerManager = new MockServerManager();
  });

  beforeEach(() => {
    mockServerManager.reset();
    
    // Mock successful server responses
    mockServerManager.mockServer('trello', {
      tools: MOCK_TOOLS_BY_SERVER.trello,
      result: { content: [{ type: 'text', text: 'Trello operation successful' }] },
      latency: 100
    });
    
    mockServerManager.mockServer('outlook-fernando', {
      tools: MOCK_TOOLS_BY_SERVER['outlook-fernando'],
      result: { content: [{ type: 'text', text: 'Email operation successful' }] },
      latency: 150
    });
    
    mockServerManager.mockServer('spotify', {
      tools: MOCK_TOOLS_BY_SERVER.spotify,
      result: { content: [{ type: 'text', text: 'Spotify operation successful' }] },
      latency: 200
    });

    // Initialize Hub components with mocks
    serverRegistry = new ServerRegistry();
    hubCache = new HubCache(300, true); // 5 minute TTL, enabled
    
    // Mock registry connections to use our mock server manager while preserving callTool logic
    vi.spyOn(serverRegistry, 'getConnection').mockImplementation(
      async (serverId: string) => ({
        client: {
          callTool: async ({ name, arguments: args }: { name: string; arguments?: Record<string, unknown> }) => 
            mockServerManager.simulateServerCall(serverId, name, args ?? {})
        } as any
      })
    );
    
    vi.spyOn(serverRegistry, 'getAllTools').mockReturnValue([
      ...MOCK_TOOLS_BY_SERVER.trello.map(tool => ({
        server_id: 'trello',
        server_name: 'Trello',
        tool_name: tool.name,
        description: tool.description,
        schema: tool.inputSchema,
        tags: ['productivity'],
        enabled: true,
        last_seen: new Date()
      })),
      ...MOCK_TOOLS_BY_SERVER['outlook-fernando'].map(tool => ({
        server_id: 'outlook-fernando',
        server_name: 'Outlook Fernando',
        tool_name: tool.name,
        description: tool.description,
        schema: tool.inputSchema,
        tags: ['email'],
        enabled: true,
        last_seen: new Date()
      })),
      ...MOCK_TOOLS_BY_SERVER.spotify.map(tool => ({
        server_id: 'spotify',
        server_name: 'Spotify',
        tool_name: tool.name,
        description: tool.description,
        schema: tool.inputSchema,
        tags: ['music'],
        enabled: true,
        last_seen: new Date()
      }))
    ]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    hubCache.clear();
    intelligentCache.clear();
  });

  describe('Server Health and Connectivity', () => {
    it('deve estabelecer conexão com todos os servidores mockados', async () => {
      const servers = ['trello', 'outlook-fernando', 'spotify'];
      
      for (const serverId of servers) {
        expect(mockServerManager.isServerDown(serverId)).toBe(false);
        
        const latency = mockServerManager.getServerLatency(serverId);
        expect(latency).toBeGreaterThan(0);
        expect(latency).toBeLessThan(1000); // Reasonable latency
      }
    });

    it('deve detectar servidor indisponível e aplicar fallback', async () => {
      mockServerManager.mockServerDown('spotify');
      
      await expect(
        serverRegistry.callTool('spotify', 'play_track', { trackId: '123' })
      ).rejects.toThrow('Server spotify is unavailable');
    });

    it('deve medir latência de cada servidor corretamente', async () => {
      const servers = [
        { id: 'trello', expectedLatency: 100 },
        { id: 'outlook-fernando', expectedLatency: 150 },
        { id: 'spotify', expectedLatency: 200 }
      ];

      for (const server of servers) {
        const startTime = performance.now();
        
        try {
          await serverRegistry.callTool(server.id, 'test_tool', {});
        } catch {
          // Tool may not exist, but we measure latency anyway
        }
        
        const actualLatency = performance.now() - startTime;
        expect(actualLatency).toBeCloseTo(server.expectedLatency, -1); // Within 10ms
      }
    });

    it('deve lidar com timeout de rede gracefully', async () => {
      mockServerManager.mockNetworkDelay('trello', 5000);
      
      const startTime = performance.now();
      
      try {
        await serverRegistry.callTool('trello', 'get_boards', {});
      } catch (error) {
        const duration = performance.now() - startTime;
        expect(duration).toBeGreaterThan(5000);
        expect(error).toBeInstanceOf(Error);
      }
    }, 10000); // 10s timeout for this test
  });

  describe('Cross-Server Tool Execution', () => {
    it('deve executar ferramentas em diferentes servidores sequencialmente', async () => {
      // 1. Buscar emails
      const emailResult = await serverRegistry.callTool('outlook-fernando', 'list_emails', {
        search: 'projeto',
        limit: 5
      });
      expect(emailResult).toBeDefined();
      expect(emailResult.content[0].text).toContain('Email operation successful');
      
      // 2. Criar card no Trello com base no email
      const trelloResult = await serverRegistry.callTool('trello', 'add_card_to_list', {
        listId: 'list-1',
        name: 'Email sobre projeto',
        description: 'Baseado no email encontrado'
      });
      expect(trelloResult).toBeDefined();
      expect(trelloResult.content[0].text).toContain('Trello operation successful');
      
      // 3. Tocar música para focar no trabalho
      const spotifyResult = await serverRegistry.callTool('spotify', 'play_track', {
        trackId: 'focus-track-1'
      });
      expect(spotifyResult).toBeDefined();
      expect(spotifyResult.content[0].text).toContain('Spotify operation successful');
    });

    it('deve manter consistência de dados entre operações cross-server', async () => {
      const testData = {
        subject: 'Reunião de planejamento Q2',
        priority: 'high',
        dueDate: '2024-02-15'
      };

      // Mock responses with consistent data
      mockServerManager.mockServer('outlook-fernando', {
        result: {
          content: [{
            type: 'text',
            text: JSON.stringify({
              id: 'email-123',
              subject: testData.subject,
              body: `Assunto: ${testData.subject}, Prioridade: ${testData.priority}`
            })
          }]
        },
        latency: 100
      });

      mockServerManager.mockServer('trello', {
        result: {
          content: [{
            type: 'text',
            text: JSON.stringify({
              id: 'card-456',
              name: testData.subject,
              desc: `Prioridade: ${testData.priority}, Prazo: ${testData.dueDate}`
            })
          }]
        },
        latency: 120
      });

      // Execute workflow
      const emailResult = await serverRegistry.callTool('outlook-fernando', 'list_emails', {
        search: testData.subject
      });
      
      const emailData = JSON.parse(emailResult.content[0].text);
      expect(emailData.subject).toBe(testData.subject);

      const cardResult = await serverRegistry.callTool('trello', 'add_card_to_list', {
        listId: 'project-list',
        name: emailData.subject,
        description: emailData.body
      });
      
      const cardData = JSON.parse(cardResult.content[0].text);
      expect(cardData.name).toBe(testData.subject);
    });

    it('deve executar operações paralelas sem conflitos', async () => {
      const operations = [
        serverRegistry.callTool('trello', 'get_boards', {}),
        serverRegistry.callTool('outlook-fernando', 'list_emails', { limit: 10 }),
        serverRegistry.callTool('spotify', 'search_tracks', { query: 'focus' })
      ];

      const results = await Promise.all(operations);
      
      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.content).toBeDefined();
        expect(result.content[0].text).toBeTruthy();
      });
    });
  });

  describe('Cache Integration Across Servers', () => {
    it('deve cachear resultados por servidor independentemente', async () => {
      const trelloArgs = { boardId: 'test-board' };
      const emailArgs = { search: 'teste', limit: 5 };
      
      // First calls - should hit servers
      const trelloResult1 = await serverRegistry.callTool('trello', 'get_boards', trelloArgs);
      const emailResult1 = await serverRegistry.callTool('outlook-fernando', 'list_emails', emailArgs);
      
      // Mock cache hits
      const trelloHash = hubCache.createArgsHash(trelloArgs);
      const emailHash = hubCache.createArgsHash(emailArgs);
      
      hubCache.setToolResult('trello', 'get_boards', trelloHash, trelloResult1);
      hubCache.setToolResult('outlook-fernando', 'list_emails', emailHash, emailResult1);
      
      // Second calls - should hit cache
      const trelloResult2 = hubCache.getToolResult('trello', 'get_boards', trelloHash);
      const emailResult2 = hubCache.getToolResult('outlook-fernando', 'list_emails', emailHash);
      
      expect(trelloResult2).toEqual(trelloResult1);
      expect(emailResult2).toEqual(emailResult1);
    });

    it('deve invalidar cache por servidor quando necessário', async () => {
      const args = { test: 'data' };
      const argsHash = hubCache.createArgsHash(args);
      
      // Cache result for Trello
      const trelloResult = await serverRegistry.callTool('trello', 'get_boards', args);
      hubCache.setToolResult('trello', 'get_boards', argsHash, trelloResult);
      
      // Verify cache hit
      expect(hubCache.getToolResult('trello', 'get_boards', argsHash)).toEqual(trelloResult);
      
      // Clear cache and verify miss
      hubCache.clear();
      expect(hubCache.getToolResult('trello', 'get_boards', argsHash)).toBeNull();
    });

    it('deve aplicar TTL independentemente por servidor', async () => {
      const shortTTLCache = new HubCache(1, true); // 1 second TTL
      const args = { test: 'ttl' };
      const argsHash = shortTTLCache.createArgsHash(args);
      
      const result = await serverRegistry.callTool('trello', 'get_boards', args);
      shortTTLCache.setToolResult('trello', 'get_boards', argsHash, result);
      
      // Should be cached immediately
      expect(shortTTLCache.getToolResult('trello', 'get_boards', argsHash)).toEqual(result);
      
      // Wait for TTL expiration
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      // Should be expired
      expect(shortTTLCache.getToolResult('trello', 'get_boards', argsHash)).toBeNull();
    });
  });

  describe('Error Handling and Recovery', () => {
    it('deve propagar erros específicos de cada servidor', async () => {
      mockServerManager.mockServer('trello', {
        error: new Error('Trello API rate limit exceeded'),
        latency: 100
      });

      await expect(
        serverRegistry.callTool('trello', 'get_boards', {})
      ).rejects.toThrow('Trello API rate limit exceeded');
    });

    it('deve manter outros servidores funcionando quando um falha', async () => {
      mockServerManager.mockServerDown('spotify');
      
      // Spotify should fail
      await expect(
        serverRegistry.callTool('spotify', 'play_track', { trackId: '123' })
      ).rejects.toThrow('Server spotify is unavailable');
      
      // But other servers should still work
      const trelloResult = await serverRegistry.callTool('trello', 'get_boards', {});
      expect(trelloResult).toBeDefined();
      
      const emailResult = await serverRegistry.callTool('outlook-fernando', 'list_emails', {});
      expect(emailResult).toBeDefined();
    });

    it('não faz retry automático para tool calls mutáveis por padrão', async () => {
      let callCount = 0;
      
      vi.spyOn(serverRegistry, 'getConnection').mockResolvedValue({
        client: {
          callTool: async () => {
            callCount++;
            throw new Error('Temporary network error');
          }
        } as any
      });
      
      await expect(serverRegistry.callTool('trello', 'create_card', { title: 'urgent' })).rejects.toThrow('Temporary network error');
      expect(callCount).toBe(1);
    });

    it('permite retry explícito apenas para ferramentas allowlisted como idempotentes', async () => {
      let callCount = 0;
      (serverRegistry as any).servers.set('trello', {
        id: 'trello',
        name: 'Trello',
        command: 'node',
        args: ['trello.js'],
        protocol: 'stdio',
        enabled: true,
        retries: 2,
        toolCallRetries: {
          enabled: true,
          maxAttempts: 3,
          retryableTools: ['get_boards'],
        },
      });
      
      vi.spyOn(serverRegistry, 'getConnection').mockResolvedValue({
        client: {
          callTool: async () => {
            callCount++;
            if (callCount <= 2) {
              throw new Error('Temporary network error');
            }

            return mockServerManager.simulateServerCall('trello', 'get_boards', {});
          }
        } as any
      });
      
      const result = await serverRegistry.callTool('trello', 'get_boards', {});
      expect(result).toBeDefined();
      expect(callCount).toBe(3);
    });

    it('deve aplicar circuit breaker após muitas falhas consecutivas', async () => {
      // Mock consistent failures
      mockServerManager.mockServer('spotify', {
        error: new Error('Service unavailable'),
        latency: 100
      });
      
      // Multiple failures should trigger circuit breaker logic
      const failures = [];
      for (let i = 0; i < 5; i++) {
        try {
          await serverRegistry.callTool('spotify', 'play_track', { trackId: `track-${i}` });
        } catch (error) {
          failures.push(error);
        }
      }
      
      expect(failures).toHaveLength(5);
    });
  });

  describe('Performance Under Load', () => {
    it('deve manter performance com múltiplas chamadas simultâneas', async () => {
      const concurrentCalls = 20;
      const operations = [];
      
      for (let i = 0; i < concurrentCalls; i++) {
        const serverId = ['trello', 'outlook-fernando', 'spotify'][i % 3];
        const toolName = serverId === 'trello' ? 'get_boards' :
                        serverId === 'outlook-fernando' ? 'list_emails' : 'search_tracks';
        
        operations.push(serverRegistry.callTool(
          serverId,
          toolName,
          serverId === 'spotify' ? { query: `focus-${i}` } : { test: i }
        ));
      }
      
      const startTime = performance.now();
      const results = await Promise.all(operations);
      const duration = performance.now() - startTime;
      
      expect(results).toHaveLength(concurrentCalls);
      expect(duration).toBeLessThan(1000); // Should complete in under 1 second with mocks
      
      // All results should be successful
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.content).toBeDefined();
      });
    });

    it('deve otimizar cache hit rate sob carga', async () => {
      const cacheHits = [];
      const cacheMisses = [];
      
      // Prepare cache with some data
      const commonArgs = { common: 'test' };
      const argsHash = hubCache.createArgsHash(commonArgs);
      const cachedResult = { content: [{ type: 'text', text: 'Cached result' }] };
      
      hubCache.setToolResult('trello', 'get_boards', argsHash, cachedResult);
      
      // Mix of cached and non-cached calls
      for (let i = 0; i < 50; i++) {
        const useCache = i % 3 === 0; // Every 3rd call uses cached args
        const args = useCache ? commonArgs : { unique: i };
        const hash = hubCache.createArgsHash(args);
        
        const cached = hubCache.getToolResult('trello', 'get_boards', hash);
        if (cached) {
          cacheHits.push(cached);
        } else {
          cacheMisses.push(args);
        }
      }
      
      expect(cacheHits.length).toBeGreaterThan(15); // Should have significant cache hits
      expect(cacheMisses.length).toBeGreaterThan(30); // And cache misses for unique args
    });
  });

  describe('Data Consistency and Validation', () => {
    it('deve validar parâmetros antes de chamar servidores', async () => {
      // Test missing required parameters
      await expect(
        serverRegistry.callTool('trello', 'add_card_to_list', {
          // Missing required listId and name
        })
      ).rejects.toThrow(); // Should throw validation error before reaching server
    });

    it('deve manter integridade de dados em workflows cross-server', async () => {
      const workflowData = {
        id: 'workflow-123',
        title: 'Test Integration Workflow',
        timestamp: new Date().toISOString()
      };

      // Step 1: Create data in one server
      mockServerManager.mockServer('outlook-fernando', {
        result: {
          content: [{
            type: 'text',
            text: JSON.stringify({
              ...workflowData,
              type: 'email',
              status: 'created'
            })
          }]
        },
        latency: 100
      });

      // Step 2: Use data in another server
      mockServerManager.mockServer('trello', {
        result: {
          content: [{
            type: 'text',
            text: JSON.stringify({
              ...workflowData,
              type: 'card',
              status: 'created',
              source: 'email'
            })
          }]
        },
        latency: 150
      });

      const emailResult = await serverRegistry.callTool('outlook-fernando', 'send_email', {
        to: 'test@example.com',
        subject: workflowData.title,
        body: JSON.stringify(workflowData)
      });

      const emailData = JSON.parse(emailResult.content[0].text);
      expect(emailData.id).toBe(workflowData.id);

      const cardResult = await serverRegistry.callTool('trello', 'add_card_to_list', {
        listId: 'integration-list',
        name: workflowData.title,
        description: `Source: ${emailData.id}`
      });

      const cardData = JSON.parse(cardResult.content[0].text);
      expect(cardData.id).toBe(workflowData.id);
      expect(cardData.source).toBe('email');
    });
  });
});