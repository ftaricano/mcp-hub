import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { ToolIntelligenceSystem, ToolIntelligence } from '../../src/intelligence/tool-intelligence';
import { PORTUGUESE_QUERIES, EXPECTED_INTENTS, CATEGORY_MAPPINGS } from '../fixtures/portuguese-queries';

describe('ToolIntelligenceSystem', () => {
  beforeAll(() => {
    // Sistema já é inicializado automaticamente, mas garantimos que está limpo
    ToolIntelligenceSystem.initialize();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Sistema de Inicialização', () => {
    it('deve inicializar com ferramentas predefinidas', () => {
      const stats = ToolIntelligenceSystem.getStats();
      
      expect(stats.totalTools).toBeGreaterThan(10);
      expect(stats.categories).toBeGreaterThan(3);
      expect(stats.servers).toBeGreaterThan(5);
      expect(stats.avgReliability).toBeGreaterThan(7);
    });

    it('deve ter categorias esperadas', () => {
      const categories = ToolIntelligenceSystem.getCategories();
      
      expect(categories).toContain('Comunicação');
      expect(categories).toContain('Entretenimento');
      expect(categories).toContain('Produtividade');
      expect(categories).toContain('Arquivos');
    });

    it('deve ter ferramentas organizadas por categoria', () => {
      const comunicacaoTools = ToolIntelligenceSystem.getToolsByCategory('Comunicação');
      const entretenimentoTools = ToolIntelligenceSystem.getToolsByCategory('Entretenimento');
      
      expect(comunicacaoTools.length).toBeGreaterThan(0);
      expect(entretenimentoTools.length).toBeGreaterThan(0);
      
      // Verificar que todas são da categoria correta
      comunicacaoTools.forEach(tool => {
        expect(tool.category).toBe('Comunicação');
      });
    });
  });

  describe('Busca Inteligente em Português', () => {
    describe('Queries de Email', () => {
      it('deve encontrar ferramentas de email para queries relacionadas', () => {
        const queries = PORTUGUESE_QUERIES.email;
        
        queries.forEach(query => {
          const results = ToolIntelligenceSystem.smartSearch(query);
          
          expect(results.length).toBeGreaterThan(0);
          expect(results[0].category).toBe('Comunicação');
          expect(results[0].subcategory).toBe('Email');
        });
      });

      it('deve priorizar servidor correto por contexto', () => {
        const fernandoResult = ToolIntelligenceSystem.smartSearch('enviar email');
        const faturamentoResult = ToolIntelligenceSystem.smartSearch('email faturamento');
        
        expect(fernandoResult[0].server_id).toBe('outlook-fernando');
        expect(faturamentoResult[0].server_id).toBe('outlook-faturamento');
      });

      it('deve processar intenções de email corretamente', () => {
        const testCases = [
          { query: 'enviar email para cliente', expectedAction: 'enviar', expectedTarget: 'email' },
          { query: 'buscar emails não lidos', expectedAction: 'buscar', expectedTarget: 'email' },
          { query: 'listar mensagens da caixa de entrada', expectedAction: 'listar', expectedTarget: 'email' }
        ];

        testCases.forEach(testCase => {
          const intent = ToolIntelligenceSystem.analyzeIntent(testCase.query);
          
          expect(intent.action).toBe(testCase.expectedAction);
          expect(intent.target).toBe(testCase.expectedTarget);
          expect(intent.confidence).toBeGreaterThan(0.8);
        });
      });
    });

    describe('Queries de Música', () => {
      it('deve encontrar ferramentas do Spotify', () => {
        const queries = PORTUGUESE_QUERIES.music;
        
        queries.forEach(query => {
          const results = ToolIntelligenceSystem.smartSearch(query);
          
          expect(results.length).toBeGreaterThan(0);
          expect(results[0].server_id).toBe('spotify');
          expect(results[0].category).toBe('Entretenimento');
        });
      });

      it('deve distinguir entre buscar e tocar música', () => {
        const searchResult = ToolIntelligenceSystem.smartSearch('buscar música relaxante');
        const playResult = ToolIntelligenceSystem.smartSearch('tocar música relaxante');
        
        expect(searchResult[0].tool_name).toBe('search_tracks');
        expect(playResult[0].tool_name).toBe('play_track');
      });

      it('deve analisar intenções musicais com alta precisão', () => {
        const intent = ToolIntelligenceSystem.analyzeIntent('tocar música relaxante para trabalhar');
        
        expect(intent.action).toBe('tocar');
        expect(intent.target).toBe('música');
        expect(intent.confidence).toBeGreaterThan(0.9);
        expect(intent.suggestions.length).toBeGreaterThan(0);
        expect(intent.suggestions[0].server_id).toBe('spotify');
      });
    });

    describe('Queries de Projeto/Trello', () => {
      it('deve encontrar ferramentas do Trello', () => {
        const queries = PORTUGUESE_QUERIES.project;
        
        queries.forEach(query => {
          const results = ToolIntelligenceSystem.smartSearch(query);
          
          expect(results.length).toBeGreaterThan(0);
          expect(results[0].server_id).toBe('trello');
          expect(results[0].category).toBe('Produtividade');
        });
      });

      it('deve priorizar criar card vs listar quando apropriado', () => {
        const createResult = ToolIntelligenceSystem.smartSearch('criar nova tarefa');
        const listResult = ToolIntelligenceSystem.smartSearch('listar tarefas pendentes');
        
        expect(createResult[0].action_type).toBe('create');
        expect(listResult[0].action_type).toBe('read');
      });
    });

    describe('Queries de Arquivos', () => {
      it('deve encontrar ferramentas do OneDrive/SharePoint', () => {
        const queries = PORTUGUESE_QUERIES.files;
        
        queries.forEach(query => {
          const results = ToolIntelligenceSystem.smartSearch(query);
          
          expect(results.length).toBeGreaterThan(0);
          expect(results[0].server_id).toBe('onedrive-sharepoint');
          expect(results[0].category).toBe('Arquivos');
        });
      });
    });

    describe('Queries de Conhecimento/Notion', () => {
      it('deve encontrar ferramentas do Notion', () => {
        const queries = PORTUGUESE_QUERIES.knowledge;
        
        queries.forEach(query => {
          const results = ToolIntelligenceSystem.smartSearch(query);
          
          expect(results.length).toBeGreaterThan(0);
          expect(results[0].server_id).toBe('notion');
          expect(results[0].category).toBe('Conhecimento');
        });
      });
    });
  });

  describe('Análise de Intenção Avançada', () => {
    it('deve processar queries com múltiplas intenções', () => {
      const intent = ToolIntelligenceSystem.analyzeIntent('buscar e enviar email com anexo');
      
      expect(intent.confidence).toBeGreaterThan(0.5);
      expect(intent.suggestions.length).toBeGreaterThan(0);
    });

    it('deve lidar com sinônimos em português', () => {
      const synonymQueries = [
        'tocar música',
        'reproduzir música', 
        'colocar música'
      ];

      synonymQueries.forEach(query => {
        const intent = ToolIntelligenceSystem.analyzeIntent(query);
        expect(['tocar', 'reproduzir', 'colocar']).toContain(intent.action);
        expect(intent.target).toBe('música');
      });
    });

    it('deve detectar contexto implícito', () => {
      const workContextQueries = [
        'enviar relatório para gerente',
        'agendar reunião de equipe',
        'criar tarefa urgente'
      ];

      workContextQueries.forEach(query => {
        const results = ToolIntelligenceSystem.smartSearch(query, 'trabalho');
        expect(results.length).toBeGreaterThan(0);
        // Contexto de trabalho deve influenciar a pontuação
      });
    });

    it('deve processar caracteres especiais e acentos', () => {
      const specialQueries = [
        'enviar e-mail para joão@empresa.com',
        'buscar "relatório Q1/2024"',
        'criar tarefa: implementar API REST'
      ];

      specialQueries.forEach(query => {
        const results = ToolIntelligenceSystem.smartSearch(query);
        expect(results.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Sistema de Recomendações', () => {
    it('deve fornecer recomendações baseadas em ferramentas relacionadas', () => {
      const recommendations = ToolIntelligenceSystem.getRecommendations('outlook-fernando/send_email');
      
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations.some(r => r.tool_name === 'list_emails')).toBe(true);
    });

    it('deve sugerir ferramentas em sequência lógica', () => {
      // Buscar → Tocar deve ser uma sequência comum para Spotify
      const searchRecommendations = ToolIntelligenceSystem.getRecommendations('spotify/search_tracks');
      
      expect(searchRecommendations.some(r => r.tool_name === 'play_track')).toBe(true);
    });
  });

  describe('Performance e Confiabilidade', () => {
    it('deve executar busca em menos de 100ms', () => {
      const start = performance.now();
      
      ToolIntelligenceSystem.smartSearch('enviar email para cliente');
      
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(100);
    });

    it('deve processar múltiplas queries rapidamente', async () => {
      const queries = [
        'enviar email',
        'tocar música',
        'criar tarefa',
        'buscar arquivo',
        'listar documentos'
      ];

      const start = performance.now();
      
      queries.forEach(query => {
        ToolIntelligenceSystem.smartSearch(query);
      });
      
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(500); // 5 queries em menos de 500ms
    });

    it('deve manter pontuação consistente para queries similares', () => {
      const query = 'enviar email importante';
      const result1 = ToolIntelligenceSystem.smartSearch(query);
      const result2 = ToolIntelligenceSystem.smartSearch(query);
      
      expect(result1[0].performance_score).toBe(result2[0].performance_score);
      expect(result1[0].server_id).toBe(result2[0].server_id);
      expect(result1[0].tool_name).toBe(result2[0].tool_name);
    });
  });

  describe('Edge Cases e Robustez', () => {
    it('deve lidar com queries vazias', () => {
      const results = ToolIntelligenceSystem.smartSearch('');
      expect(results.length).toBe(0);
    });

    it('deve lidar com queries muito longas', () => {
      const longQuery = 'enviar email muito importante com anexo para cliente ' + 'muito '.repeat(50) + 'especial';
      const results = ToolIntelligenceSystem.smartSearch(longQuery);
      
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].server_id).toBe('outlook-fernando');
    });

    it('deve lidar com queries em diferentes línguas', () => {
      const englishResults = ToolIntelligenceSystem.smartSearch('send email to client');
      const portugueseResults = ToolIntelligenceSystem.smartSearch('enviar email para cliente');
      
      expect(englishResults.length).toBeGreaterThan(0);
      expect(portugueseResults.length).toBeGreaterThan(0);
      // Português deve ter pontuação mais alta
      expect(portugueseResults[0].performance_score).toBeGreaterThan(englishResults[0].performance_score);
    });

    it('deve tratar queries com typos comuns', () => {
      const typoQueries = [
        'envar email', // enviar
        'tokar musica', // tocar música
        'buskr arquivo' // buscar arquivo
      ];

      typoQueries.forEach(query => {
        const results = ToolIntelligenceSystem.smartSearch(query);
        // Deve ainda encontrar algo relevante mesmo com typos
        expect(results.length).toBeGreaterThan(0);
      });
    });

    it('deve manter estatísticas corretas após múltiplas operações', () => {
      const initialStats = ToolIntelligenceSystem.getStats();
      
      // Executar várias buscas
      for (let i = 0; i < 100; i++) {
        ToolIntelligenceSystem.smartSearch('teste ' + i);
      }
      
      const finalStats = ToolIntelligenceSystem.getStats();
      
      expect(finalStats.totalTools).toBe(initialStats.totalTools);
      expect(finalStats.categories).toBe(initialStats.categories);
      expect(finalStats.servers).toBe(initialStats.servers);
    });
  });

  describe('Validação de Dados Esperados', () => {
    it('deve ter todas as ferramentas essenciais configuradas', () => {
      const essentialTools = [
        'outlook-fernando/send_email',
        'outlook-fernando/list_emails',
        'spotify/search_tracks',
        'spotify/play_track',
        'trello/add_card_to_list',
        'trello/get_lists',
        'onedrive-sharepoint/list_files',
        'notion/search_pages'
      ];

      essentialTools.forEach(toolKey => {
        const results = ToolIntelligenceSystem.smartSearch(toolKey.split('/')[1]);
        expect(results.some(r => `${r.server_id}/${r.tool_name}` === toolKey)).toBe(true);
      });
    });

    it('deve ter pontuações de confiabilidade consistentes', () => {
      const allTools = [
        ...ToolIntelligenceSystem.getToolsByCategory('Comunicação'),
        ...ToolIntelligenceSystem.getToolsByCategory('Entretenimento'),
        ...ToolIntelligenceSystem.getToolsByCategory('Produtividade')
      ];

      allTools.forEach(tool => {
        expect(tool.reliability_score).toBeGreaterThan(0);
        expect(tool.reliability_score).toBeLessThanOrEqual(10);
        expect(tool.performance_score).toBeGreaterThan(0);
        expect(tool.performance_score).toBeLessThanOrEqual(10);
      });
    });

    it('deve ter mapeamento completo de categorias', () => {
      Object.entries(CATEGORY_MAPPINGS).forEach(([category, keywords]) => {
        const tools = ToolIntelligenceSystem.getToolsByCategory(category);
        expect(tools.length).toBeGreaterThan(0);
        
        // Verificar que pelo menos algumas ferramentas têm as keywords esperadas
        const hasExpectedKeywords = tools.some(tool => 
          keywords.some(keyword => 
            tool.pt_keywords.includes(keyword) || 
            tool.en_keywords.includes(keyword)
          )
        );
        expect(hasExpectedKeywords).toBe(true);
      });
    });
  });

  describe('Casos de Uso Reais', () => {
    it('deve processar cenários de workflow real: Email → Trello', () => {
      // Cenário: Recebeu email sobre projeto, quer criar tarefa
      const emailSearch = ToolIntelligenceSystem.smartSearch('buscar email sobre projeto');
      const taskCreation = ToolIntelligenceSystem.smartSearch('criar tarefa no trello');
      
      expect(emailSearch[0].server_id).toBe('outlook-fernando');
      expect(emailSearch[0].tool_name).toBe('list_emails');
      
      expect(taskCreation[0].server_id).toBe('trello');
      expect(taskCreation[0].tool_name).toBe('add_card_to_list');
      
      // Verificar recomendações conectam o workflow
      const emailRecommendations = ToolIntelligenceSystem.getRecommendations(`${emailSearch[0].server_id}/${emailSearch[0].tool_name}`);
      expect(emailRecommendations.length).toBeGreaterThan(0);
    });

    it('deve processar cenários de produtividade: Música → Trabalho → Documentação', () => {
      const musicSearch = ToolIntelligenceSystem.smartSearch('tocar música para focar no trabalho');
      const documentSearch = ToolIntelligenceSystem.smartSearch('buscar documentação no notion');
      
      expect(musicSearch[0].server_id).toBe('spotify');
      expect(documentSearch[0].server_id).toBe('notion');
      
      // Ambos devem ter alta confiabilidade para produtividade
      expect(musicSearch[0].reliability_score).toBeGreaterThan(7);
      expect(documentSearch[0].reliability_score).toBeGreaterThan(7);
    });
  });
});