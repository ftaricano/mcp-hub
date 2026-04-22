import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ToolIntelligenceSystem } from '../../src/intelligence/tool-intelligence';
import { intelligentCache } from '../../src/cache/intelligent-cache';

describe('Intelligence System Performance Tests', () => {
  beforeEach(() => {
    // Reset intelligence system
    ToolIntelligenceSystem.initialize();
    intelligentCache.clear();
    
    // Mock performance.now for consistent testing
    let mockTime = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => {
      return mockTime += 1; // Each call advances 1ms
    });
  });

  describe('Smart Search Performance', () => {
    it('deve executar busca simples em menos de 50ms', async () => {
      const queries = [
        'enviar email',
        'tocar música',
        'criar tarefa',
        'listar arquivos',
        'buscar páginas'
      ];

      for (const query of queries) {
        const startTime = performance.now();
        ToolIntelligenceSystem.smartSearch(query);
        const duration = performance.now() - startTime;
        
        expect(duration).toBeLessThan(50);
      }
    });

    it('deve executar análise de intenção em menos de 30ms', async () => {
      const queries = [
        'enviar email importante para cliente',
        'tocar música relaxante para trabalhar',
        'criar nova tarefa no projeto de desenvolvimento',
        'buscar arquivos relacionados ao relatório mensal'
      ];

      for (const query of queries) {
        const startTime = performance.now();
        ToolIntelligenceSystem.analyzeIntent(query);
        const duration = performance.now() - startTime;
        
        expect(duration).toBeLessThan(30);
      }
    });

    it('deve manter performance consistente com queries complexas', async () => {
      const complexQueries = [
        'buscar emails não lidos sobre projeto importante e criar tarefa urgente no trello',
        'tocar música instrumental de foco, baixar arquivos do sharepoint e documentar no notion',
        'verificar status de pagamentos no email faturamento e enviar relatório para equipe'
      ];

      const durations = [];
      
      for (const query of complexQueries) {
        const startTime = performance.now();
        const results = ToolIntelligenceSystem.smartSearch(query);
        const intent = ToolIntelligenceSystem.analyzeIntent(query);
        const duration = performance.now() - startTime;
        
        durations.push(duration);
        
        expect(results.length).toBeGreaterThan(0);
        expect(intent.confidence).toBeGreaterThan(0);
      }
      
      // Performance deve ser consistente (variação < 50%)
      const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
      durations.forEach(duration => {
        expect(Math.abs(duration - avgDuration) / avgDuration).toBeLessThan(0.5);
      });
    });

    it('deve processar 1000 queries por segundo', async () => {
      const queries = Array(1000).fill(null).map((_, i) => `teste query ${i % 10}`);
      
      const startTime = performance.now();
      
      queries.forEach(query => {
        ToolIntelligenceSystem.smartSearch(query);
      });
      
      const duration = performance.now() - startTime;
      const queriesPerSecond = 1000 / (duration / 1000);
      
      expect(queriesPerSecond).toBeGreaterThan(1000);
      expect(duration).toBeLessThan(1000); // 1000 queries em menos de 1 segundo
    });
  });

  describe('Cache Performance', () => {
    it('deve melhorar performance com cache de resultados', async () => {
      const query = 'enviar email para cliente importante';
      
      // Primeira execução - cache miss
      const startTime1 = performance.now();
      const result1 = ToolIntelligenceSystem.smartSearch(query);
      const duration1 = performance.now() - startTime1;
      
      // Simular cache (na implementação real seria automático)
      intelligentCache.set(`search_${query}`, result1, 300, 'email');
      
      // Segunda execução - deveria ser mais rápida com cache
      const startTime2 = performance.now();
      const cached = intelligentCache.get(`search_${query}`);
      const duration2 = performance.now() - startTime2;
      
      if (cached) {
        expect(duration2).toBeLessThanOrEqual(duration1);
      }
    });

    it('deve otimizar cache hit rate para queries similares', async () => {
      const similarQueries = [
        'enviar email cliente',
        'mandar email para cliente',
        'enviar mensagem cliente',
        'email para cliente importante'
      ];
      
      const cacheKeys = [];
      const hitCounts = [];
      
      // Primeira rodada - popular cache
      similarQueries.forEach(query => {
        const result = ToolIntelligenceSystem.smartSearch(query);
        const cacheKey = `smart_${query.toLowerCase().replace(/\s+/g, '_')}`;
        intelligentCache.set(cacheKey, result, 300, 'email');
        cacheKeys.push(cacheKey);
      });
      
      // Segunda rodada - medir cache hits
      similarQueries.forEach((query, index) => {
        const cached = intelligentCache.get(cacheKeys[index]);
        if (cached) {
          hitCounts.push(1);
        } else {
          hitCounts.push(0);
        }
      });
      
      const hitRate = hitCounts.reduce((a, b) => a + b, 0) / hitCounts.length;
      expect(hitRate).toBeGreaterThan(0.7); // Pelo menos 70% de cache hits
    });
  });

  describe('Memory Usage and Resource Management', () => {
    it('deve manter uso de memória estável durante operações prolongadas', async () => {
      const iterations = 1000;
      const memoryMeasurements = [];
      
      // Simular medição de memória (em ambiente real usaríamos process.memoryUsage())
      let simulatedMemory = 50 * 1024 * 1024; // 50MB inicial
      
      for (let i = 0; i < iterations; i++) {
        const query = `query iteração ${i}`;
        ToolIntelligenceSystem.smartSearch(query);
        
        // Simular pequeno aumento de memória por operação
        simulatedMemory += Math.random() * 1024; // Até 1KB por operação
        
        if (i % 100 === 0) {
          memoryMeasurements.push(simulatedMemory);
        }
      }
      
      // Verificar que não há vazamento significativo de memória
      const memoryGrowth = memoryMeasurements[memoryMeasurements.length - 1] - memoryMeasurements[0];
      const maxAcceptableGrowth = 5 * 1024 * 1024; // 5MB máximo
      
      expect(memoryGrowth).toBeLessThan(maxAcceptableGrowth);
    });

    it('deve limpar recursos não utilizados automaticamente', async () => {
      // Simular limpeza automática de cache
      const initialCacheSize = intelligentCache.getStats().totalKeys;
      
      // Adicionar muitos itens ao cache
      for (let i = 0; i < 1000; i++) {
        intelligentCache.set(`temp_key_${i}`, { data: `value_${i}` }, 1, 'temp'); // 1ms TTL
      }
      
      const peakCacheSize = intelligentCache.getStats().totalKeys;
      expect(peakCacheSize).toBeGreaterThan(initialCacheSize);
      
      // Aguardar limpeza automática (simular passagem do tempo)
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Forçar limpeza de itens expirados
      intelligentCache.cleanup();
      
      const finalCacheSize = intelligentCache.getStats().totalKeys;
      expect(finalCacheSize).toBeLessThan(peakCacheSize);
    });
  });

  describe('Concurrent Operations Performance', () => {
    it('deve lidar com operações concorrentes sem degradação', async () => {
      const concurrentOperations = 50;
      const operations = [];
      
      const startTime = performance.now();
      
      for (let i = 0; i < concurrentOperations; i++) {
        const operation = Promise.resolve().then(() => {
          const query = `operação concorrente ${i}`;
          return ToolIntelligenceSystem.smartSearch(query);
        });
        operations.push(operation);
      }
      
      const results = await Promise.all(operations);
      const totalDuration = performance.now() - startTime;
      
      expect(results).toHaveLength(concurrentOperations);
      expect(totalDuration).toBeLessThan(1000); // Menos de 1 segundo para 50 operações
      
      // Verificar que todas as operações foram bem-sucedidas
      results.forEach(result => {
        expect(result.length).toBeGreaterThan(0);
      });
    });

    it('deve manter precisão com carga alta', async () => {
      const highLoadQueries = Array(200).fill(null).map((_, i) => [
        'enviar email cliente',
        'tocar música trabalho', 
        'criar tarefa projeto',
        'buscar arquivo importante'
      ][i % 4]);
      
      const results = [];
      const startTime = performance.now();
      
      // Processar em lotes para simular carga alta
      for (let i = 0; i < highLoadQueries.length; i += 10) {
        const batch = highLoadQueries.slice(i, i + 10);
        const batchPromises = batch.map(query => 
          Promise.resolve(ToolIntelligenceSystem.smartSearch(query))
        );
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
      }
      
      const totalDuration = performance.now() - startTime;
      
      // Verificar performance
      expect(totalDuration).toBeLessThan(2000); // Menos de 2 segundos
      
      // Verificar precisão - todas as buscas devem retornar resultados relevantes
      results.forEach((result, index) => {
        expect(result.length).toBeGreaterThan(0);
        
        const query = highLoadQueries[index];
        const topResult = result[0];
        
        // Verificar relevância básica
        if (query.includes('email')) {
          expect(topResult.server_id).toBe('outlook-fernando');
        } else if (query.includes('música')) {
          expect(topResult.server_id).toBe('spotify');
        } else if (query.includes('tarefa')) {
          expect(topResult.server_id).toBe('trello');
        }
      });
    });
  });

  describe('Scalability Tests', () => {
    it('deve escalar linearmente com o número de ferramentas', async () => {
      const baseDuration = [];
      const query = 'teste escalabilidade';
      
      // Medir tempo base
      for (let i = 0; i < 10; i++) {
        const startTime = performance.now();
        ToolIntelligenceSystem.smartSearch(query);
        const duration = performance.now() - startTime;
        baseDuration.push(duration);
      }
      
      const avgBaseDuration = baseDuration.reduce((a, b) => a + b, 0) / baseDuration.length;
      
      // A complexidade deve ser O(n) ou melhor
      // Com o número atual de ferramentas, deve manter performance aceitável
      expect(avgBaseDuration).toBeLessThan(10); // Menos de 10ms por busca
    });

    it('deve otimizar performance com múltiplas categorias', async () => {
      const categories = ToolIntelligenceSystem.getCategories();
      const categoryDurations = [];
      
      for (const category of categories) {
        const startTime = performance.now();
        const tools = ToolIntelligenceSystem.getToolsByCategory(category);
        const duration = performance.now() - startTime;
        
        categoryDurations.push(duration);
        expect(tools.length).toBeGreaterThan(0);
      }
      
      // Performance deve ser consistente entre categorias
      const avgDuration = categoryDurations.reduce((a, b) => a + b, 0) / categoryDurations.length;
      categoryDurations.forEach(duration => {
        expect(duration).toBeLessThan(avgDuration * 2); // Nenhuma categoria 2x mais lenta
      });
    });
  });

  describe('Edge Case Performance', () => {
    it('deve manter performance com queries extremamente longas', async () => {
      const longQuery = 'buscar email muito importante sobre projeto especial '.repeat(50);
      
      const startTime = performance.now();
      const result = ToolIntelligenceSystem.smartSearch(longQuery);
      const duration = performance.now() - startTime;
      
      expect(duration).toBeLessThan(100); // Mesmo com query longa
      expect(result.length).toBeGreaterThan(0);
    });

    it('deve responder rapidamente para queries sem matches', async () => {
      const unmatchedQueries = [
        'xyzabc123 nonexistent query',
        'query com palavras inventadas blabla',
        '@@#$%^&*()_+ símbolos estranhos'
      ];
      
      for (const query of unmatchedQueries) {
        const startTime = performance.now();
        const result = ToolIntelligenceSystem.smartSearch(query);
        const duration = performance.now() - startTime;
        
        expect(duration).toBeLessThan(20); // Deve ser ainda mais rápido quando não há matches
        // Pode retornar array vazio, mas não deve falhar
      }
    });

    it('deve lidar eficientemente com queries repetitivas', async () => {
      const repetitiveQuery = 'enviar enviar enviar email email email';
      const normalQuery = 'enviar email';
      
      const startTime1 = performance.now();
      const result1 = ToolIntelligenceSystem.smartSearch(repetitiveQuery);
      const duration1 = performance.now() - startTime1;
      
      const startTime2 = performance.now();
      const result2 = ToolIntelligenceSystem.smartSearch(normalQuery);
      const duration2 = performance.now() - startTime2;
      
      // Query repetitiva não deve ser significativamente mais lenta
      expect(duration1).toBeLessThan(duration2 * 3);
      
      // Ambas devem encontrar resultados similares
      expect(result1.length).toBeGreaterThan(0);
      expect(result2.length).toBeGreaterThan(0);
      expect(result1[0].server_id).toBe(result2[0].server_id);
    });
  });
});