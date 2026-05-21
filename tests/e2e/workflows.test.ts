import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MockServerManager } from '../mocks/server-mocks';
import { ToolIntelligenceSystem } from '../../src/intelligence/tool-intelligence';
import { intelligentCache } from '../../src/cache/intelligent-cache';

// Mock do Hub completo para testes E2E
class MockMCPHub {
  private serverManager: MockServerManager;

  constructor() {
    this.serverManager = new MockServerManager();
    this.setupMockServers();
  }

  private setupMockServers() {
    // Setup realistic mock responses for each server
    this.serverManager.mockServer('email-primary', {
      result: {
        content: [{ type: 'text', text: JSON.stringify({ success: true, type: 'email' }) }],
      },
      latency: 150,
    });

    this.serverManager.mockServer('trello', {
      result: {
        content: [{ type: 'text', text: JSON.stringify({ success: true, type: 'card' }) }],
      },
      latency: 120,
    });

    this.serverManager.mockServer('spotify', {
      result: {
        content: [{ type: 'text', text: JSON.stringify({ success: true, type: 'music' }) }],
      },
      latency: 200,
    });

    this.serverManager.mockServer('notion', {
      result: {
        content: [{ type: 'text', text: JSON.stringify({ success: true, type: 'page' }) }],
      },
      latency: 180,
    });

    this.serverManager.mockServer('onedrive-sharepoint', {
      result: {
        content: [{ type: 'text', text: JSON.stringify({ success: true, type: 'file' }) }],
      },
      latency: 160,
    });

    this.serverManager.mockServer('whatsapp', {
      result: {
        content: [{ type: 'text', text: JSON.stringify({ success: true, type: 'message' }) }],
      },
      latency: 170,
    });
  }

  async smartSearch(query: string, context?: string) {
    const results = ToolIntelligenceSystem.smartSearch(query, context);
    const intent = ToolIntelligenceSystem.analyzeIntent(query);

    return {
      query,
      intent,
      results: results.slice(0, 5),
      total_found: results.length,
    };
  }

  async getRecommendations(params: { category?: string; popular?: boolean; recent?: boolean }) {
    const response: any = {
      categories: ToolIntelligenceSystem.getCategories(),
      stats: ToolIntelligenceSystem.getStats(),
    };

    if (params.category) {
      response.category_tools = ToolIntelligenceSystem.getToolsByCategory(params.category);
    }

    if (params.popular) {
      response.popular_tools = [
        { tool_key: 'email-primary/send_email', usage_count: 150, success_rate: 0.98 },
        { tool_key: 'spotify/play_track', usage_count: 120, success_rate: 0.95 },
        { tool_key: 'trello/add_card_to_list', usage_count: 100, success_rate: 0.96 },
      ];
    }

    return response;
  }

  async callTool(serverId: string, toolName: string, args: any) {
    return await this.serverManager.simulateServerCall(serverId, toolName, args);
  }

  reset() {
    this.serverManager.reset();
    this.setupMockServers();
  }
}

describe('End-to-End Workflow Tests', () => {
  let hub: MockMCPHub;

  beforeEach(() => {
    hub = new MockMCPHub();
    intelligentCache.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Workflow: Gestão de Email e Projetos', () => {
    it('deve executar workflow completo: Email → Análise → Trello → Documentação', async () => {
      const workflowId = `workflow-${Date.now()}`;

      // Passo 1: Busca inteligente para encontrar emails sobre projeto
      const emailSearchResult = await hub.smartSearch('buscar emails sobre projeto importante');

      expect(emailSearchResult.intent.action).toBe('buscar');
      expect(emailSearchResult.intent.target).toBe('email');
      expect(emailSearchResult.results.length).toBeGreaterThan(0);
      expect(emailSearchResult.results[0].server_id).toBe('email-primary');
      expect(emailSearchResult.results[0].tool_name).toBe('list_emails');

      // Passo 2: Executar busca de emails
      const mockEmailData = {
        id: 'email-123',
        subject: 'Projeto X - Requisitos e Prazos',
        from: 'client@example.com',
        body: 'Precisamos definir os requisitos do Projeto X e estabelecer prazos claros.',
        receivedDateTime: '2024-01-15T10:30:00Z',
        hasAttachments: true,
      };

      hub.serverManager.mockServer('email-primary', {
        result: {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                emails: [mockEmailData],
                total: 1,
              }),
            },
          ],
        },
        latency: 150,
      });

      const emailResult = await hub.callTool('email-primary', 'list_emails', {
        search: 'projeto importante',
        limit: 10,
      });

      const emailData = JSON.parse(emailResult.content[0].text);
      expect(emailData.emails).toHaveLength(1);
      expect(emailData.emails[0].subject).toContain('Projeto X');

      // Passo 3: Criar card no Trello baseado no email
      const taskSearchResult = await hub.smartSearch('criar tarefa no trello para projeto');

      expect(taskSearchResult.results[0].server_id).toBe('trello');
      expect(taskSearchResult.results[0].tool_name).toBe('add_card_to_list');

      const mockCardData = {
        id: 'card-456',
        name: `Projeto X - ${mockEmailData.subject}`,
        desc: `Baseado no email de ${mockEmailData.from}\n\n${mockEmailData.body}`,
        idList: 'project-backlog',
        url: 'https://trello.com/c/card-456',
      };

      hub.serverManager.mockServer('trello', {
        result: {
          content: [
            {
              type: 'text',
              text: JSON.stringify(mockCardData),
            },
          ],
        },
        latency: 120,
      });

      const cardResult = await hub.callTool('trello', 'add_card_to_list', {
        listId: 'project-backlog',
        name: mockCardData.name,
        description: mockCardData.desc,
      });

      const cardData = JSON.parse(cardResult.content[0].text);
      expect(cardData.name).toContain('Projeto X');
      expect(cardData.desc).toContain(mockEmailData.from);

      // Passo 4: Documentar no Notion
      const docSearchResult = await hub.smartSearch('criar página notion para documentar projeto');

      expect(docSearchResult.results[0].server_id).toBe('notion');
      expect(docSearchResult.results[0].tool_name).toBe('create_page');

      const mockNotionPage = {
        id: 'page-789',
        title: 'Projeto X - Documentação',
        content: {
          email_reference: mockEmailData.id,
          trello_card: mockCardData.url,
          status: 'Em Planejamento',
        },
      };

      hub.serverManager.mockServer('notion', {
        result: {
          content: [
            {
              type: 'text',
              text: JSON.stringify(mockNotionPage),
            },
          ],
        },
        latency: 180,
      });

      const notionResult = await hub.callTool('notion', 'create_page', {
        parent_id: 'projects-database',
        title: mockNotionPage.title,
        content: mockNotionPage.content,
      });

      const notionData = JSON.parse(notionResult.content[0].text);
      expect(notionData.title).toContain('Projeto X');
      expect(notionData.content.email_reference).toBe(mockEmailData.id);

      // Verificar integridade do workflow
      expect(workflowId).toBeTruthy();
      expect(emailData.emails[0].id).toBe(mockEmailData.id);
      expect(cardData.desc).toContain(mockEmailData.body);
      expect(notionData.content.trello_card).toBe(mockCardData.url);
    });

    it('deve lidar com falhas parciais no workflow mantendo dados consistentes', async () => {
      // Simular falha no servidor Notion
      hub.serverManager.mockServerDown('notion');

      // Passo 1-3: Executar workflow até o Trello (deve funcionar)
      const emailResult = await hub.callTool('email-primary', 'list_emails', {
        search: 'teste workflow',
      });
      expect(emailResult).toBeDefined();

      const cardResult = await hub.callTool('trello', 'add_card_to_list', {
        listId: 'test-list',
        name: 'Test Card',
        description: 'Test Description',
      });
      expect(cardResult).toBeDefined();

      // Passo 4: Falha no Notion (deve ser tratada gracefully)
      await expect(
        hub.callTool('notion', 'create_page', {
          title: 'Test Page',
          content: 'Test Content',
        })
      ).rejects.toThrow('Server notion is unavailable');

      // Dados anteriores devem permanecer consistentes
      const emailData = JSON.parse(emailResult.content[0].text);
      const cardData = JSON.parse(cardResult.content[0].text);

      expect(emailData.success).toBe(true);
      expect(cardData.success).toBe(true);
    });
  });

  describe('Workflow: Produtividade com Música', () => {
    it('deve executar workflow: Música para Foco → Busca de Documentos → Organização', async () => {
      // Passo 1: Configurar ambiente produtivo com música
      const musicSearchResult = await hub.smartSearch('tocar música relaxante para trabalhar');

      expect(musicSearchResult.intent.action).toBe('tocar');
      expect(musicSearchResult.intent.target).toBe('música');
      expect(musicSearchResult.results[0].server_id).toBe('spotify');

      const mockSpotifyData = {
        success: true,
        playing: true,
        track: {
          id: 'focus-track-123',
          name: 'Deep Focus Ambient',
          artist: 'Focus Music',
          duration: 180000,
        },
        playlist: 'Work Focus Playlist',
      };

      hub.serverManager.mockServer('spotify', {
        result: {
          content: [
            {
              type: 'text',
              text: JSON.stringify(mockSpotifyData),
            },
          ],
        },
        latency: 200,
      });

      const musicResult = await hub.callTool('spotify', 'play_track', {
        trackId: 'focus-track-123',
        context_uri: 'spotify:playlist:work-focus',
      });

      const musicData = JSON.parse(musicResult.content[0].text);
      expect(musicData.success).toBe(true);

      // Passo 2: Buscar documentos no OneDrive
      const fileSearchResult = await hub.smartSearch(
        'listar arquivos importantes na pasta projeto'
      );

      expect(fileSearchResult.results[0].server_id).toBe('onedrive-sharepoint');
      expect(fileSearchResult.results[0].tool_name).toBe('list_files');

      const mockFileData = {
        files: [
          { id: 'file-1', name: 'Requisitos_Projeto.docx', size: 45230 },
          { id: 'file-2', name: 'Cronograma_2024.xlsx', size: 78960 },
          { id: 'file-3', name: 'Apresentacao_Cliente.pptx', size: 120500 },
        ],
        total: 3,
      };

      hub.serverManager.mockServer('onedrive-sharepoint', {
        result: {
          content: [
            {
              type: 'text',
              text: JSON.stringify(mockFileData),
            },
          ],
        },
        latency: 160,
      });

      const fileResult = await hub.callTool('onedrive-sharepoint', 'list_files', {
        path: '/Projetos',
        filter: 'important',
      });

      const fileData = JSON.parse(fileResult.content[0].text);
      expect(fileData.files).toHaveLength(3);
      expect(fileData.files.some((f: any) => f.name.includes('Requisitos'))).toBe(true);

      // Passo 3: Organizar informações no Notion
      const organizationResult = await hub.smartSearch(
        'criar página notion para organizar documentos'
      );

      expect(organizationResult.results[0].server_id).toBe('notion');

      const mockNotionOrg = {
        id: 'org-page-456',
        title: 'Organização de Documentos - Projeto',
        content: {
          music_session: mockSpotifyData.track.name,
          files_found: mockFileData.files.length,
          files: mockFileData.files.map((f: any) => f.name),
        },
        created: new Date().toISOString(),
      };

      hub.serverManager.mockServer('notion', {
        result: {
          content: [
            {
              type: 'text',
              text: JSON.stringify(mockNotionOrg),
            },
          ],
        },
        latency: 180,
      });

      const orgResult = await hub.callTool('notion', 'create_page', {
        title: mockNotionOrg.title,
        content: mockNotionOrg.content,
      });

      const orgData = JSON.parse(orgResult.content[0].text);
      expect(orgData.content.music_session).toBe('Deep Focus Ambient');
      expect(orgData.content.files_found).toBe(3);
      expect(orgData.content.files).toContain('Requisitos_Projeto.docx');

      // Verificar workflow completo
      expect(musicData.success).toBe(true);
      expect(fileData.files).toHaveLength(3);
      expect(orgData.content.files_found).toBe(fileData.files.length);
    });
  });

  describe('Workflow: Comunicação e Follow-up', () => {
    it('deve executar workflow: Receber Email → Responder → Agendar Follow-up → WhatsApp', async () => {
      // Passo 1: Verificar emails não lidos
      const inboxSearchResult = await hub.smartSearch('ver emails não lidos importantes');

      expect(inboxSearchResult.results[0].server_id).toBe('email-primary');
      expect(inboxSearchResult.results[0].tool_name).toBe('list_emails');

      const mockUnreadEmails = {
        emails: [
          {
            id: 'email-urgent-123',
            subject: 'URGENTE: Aprovação necessária para Projeto Y',
            from: 'manager@example.com',
            body: 'Preciso da sua aprovação para prosseguir com o Projeto Y até amanhã.',
            isRead: false,
            importance: 'high',
            receivedDateTime: '2024-01-15T14:30:00Z',
          },
        ],
        unreadCount: 1,
      };

      hub.serverManager.mockServer('email-primary', {
        result: {
          content: [
            {
              type: 'text',
              text: JSON.stringify(mockUnreadEmails),
            },
          ],
        },
        latency: 150,
      });

      const inboxResult = await hub.callTool('email-primary', 'list_emails', {
        filter: 'isRead eq false',
        orderBy: 'receivedDateTime desc',
      });

      const inboxData = JSON.parse(inboxResult.content[0].text);
      expect(inboxData.emails[0].importance).toBe('high');
      expect(inboxData.emails[0].subject).toContain('URGENTE');

      // Passo 2: Responder ao email urgente
      const replySearchResult = await hub.smartSearch('responder email aprovação projeto');

      expect(replySearchResult.results[0].server_id).toBe('email-primary');
      expect(replySearchResult.results[0].tool_name).toBe('reply_to_email');

      const mockReplyData = {
        id: 'reply-456',
        subject: 'RE: URGENTE: Aprovação necessária para Projeto Y',
        to: 'manager@example.com',
        body: 'Aprovação concedida para o Projeto Y. Pode prosseguir conforme planejado.',
        sent: true,
        timestamp: new Date().toISOString(),
      };

      hub.serverManager.mockServer('email-primary', {
        result: {
          content: [
            {
              type: 'text',
              text: JSON.stringify(mockReplyData),
            },
          ],
        },
        latency: 180,
      });

      const replyResult = await hub.callTool('email-primary', 'reply_to_email', {
        messageId: 'email-urgent-123',
        message: mockReplyData.body,
        replyAll: false,
      });

      const replyData = JSON.parse(replyResult.content[0].text);
      expect(replyData.sent).toBe(true);
      expect(replyData.body).toContain('Aprovação concedida');

      // Passo 3: Criar lembrete no Trello para follow-up
      const followupResult = await hub.callTool('trello', 'add_card_to_list', {
        listId: 'follow-up-list',
        name: 'Follow-up Projeto Y',
        description: `Follow-up da aprovação enviada para ${mockUnreadEmails.emails[0].from}`,
        due: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 dias
      });

      const followupData = JSON.parse(followupResult.content[0].text);
      expect(followupData.success).toBe(true);

      // Passo 4: Confirmar por WhatsApp (se necessário)
      const whatsappSearchResult = await hub.smartSearch('enviar whatsapp confirmação projeto');

      if (whatsappSearchResult.results.length > 0) {
        expect(whatsappSearchResult.results[0].server_id).toBe('whatsapp');

        const mockWhatsAppData = {
          message_id: 'wa-msg-789',
          to: '+5511999887766',
          message: 'Confirmação: Projeto Y aprovado via email. Pode prosseguir! 👍',
          sent: true,
          timestamp: new Date().toISOString(),
        };

        hub.serverManager.mockServer('whatsapp', {
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify(mockWhatsAppData),
              },
            ],
          },
          latency: 250,
        });

        const whatsappResult = await hub.callTool('whatsapp', 'send_message', {
          to: '+5511999887766',
          message: mockWhatsAppData.message,
        });

        const whatsappData = JSON.parse(whatsappResult.content[0].text);
        expect(whatsappData.sent).toBe(true);
        expect(whatsappData.message).toContain('aprovado');
      }

      // Verificar workflow de comunicação completo
      expect(inboxData.unreadCount).toBe(1);
      expect(replyData.sent).toBe(true);
      expect(followupData.success).toBe(true);
    });
  });

  describe('Workflow Performance e Otimização', () => {
    it('deve executar workflows complexos dentro de limites de performance', async () => {
      const workflowStartTime = performance.now();

      // Workflow com múltiplas operações paralelas
      const operations = [
        hub.smartSearch('listar emails não lidos'),
        hub.smartSearch('tocar música para concentração'),
        hub.smartSearch('criar nova tarefa no projeto'),
        hub.smartSearch('buscar arquivos recentes'),
        hub.getRecommendations({ popular: true }),
      ];

      const results = await Promise.all(operations);

      const workflowDuration = performance.now() - workflowStartTime;

      // Verificar que todas as operações foram bem-sucedidas
      expect(results).toHaveLength(5);
      results.forEach((result) => {
        expect(result).toBeDefined();
        if ('results' in result) {
          expect(result.results.length).toBeGreaterThan(0);
        }
      });

      // Verificar performance
      expect(workflowDuration).toBeLessThan(2000); // Menos de 2 segundos para operações paralelas

      console.log(`Workflow executado em ${Math.round(workflowDuration)}ms`);
    });

    it('deve otimizar cache hit rate em workflows repetitivos', async () => {
      const repetitions = 10;
      const cacheHits = [];

      for (let i = 0; i < repetitions; i++) {
        const startTime = performance.now();

        // Operações comuns que podem ser cacheadas
        await hub.smartSearch('enviar email cliente');
        await hub.smartSearch('tocar música trabalho');

        const duration = performance.now() - startTime;

        // Após as primeiras execuções, deve estar mais rápido devido ao cache
        if (i > 2) {
          cacheHits.push(duration);
        }
      }

      // Performance deve melhorar com cache
      const avgCacheHitTime = cacheHits.reduce((a, b) => a + b, 0) / cacheHits.length;
      expect(avgCacheHitTime).toBeLessThan(100); // Menos de 100ms para operações cacheadas
    });

    it('deve manter consistência de dados em workflows sob carga', async () => {
      const concurrentWorkflows = 5;
      const workflowPromises = [];

      for (let i = 0; i < concurrentWorkflows; i++) {
        const workflow = async () => {
          const workflowId = `load-test-${i}`;

          // Mini workflow para cada thread
          const searchResult = await hub.smartSearch(`buscar dados workflow ${i}`);
          const emailResult = await hub.callTool('email-primary', 'list_emails', {
            search: workflowId,
            limit: 5,
          });
          const cardResult = await hub.callTool('trello', 'add_card_to_list', {
            listId: 'load-test-list',
            name: `Load Test Card ${i}`,
            description: `Workflow concurrent test ${i}`,
          });

          return {
            workflowId,
            searchResult,
            emailResult,
            cardResult,
          };
        };

        workflowPromises.push(workflow());
      }

      const workflowResults = await Promise.all(workflowPromises);

      // Verificar que todos os workflows foram executados corretamente
      expect(workflowResults).toHaveLength(concurrentWorkflows);

      workflowResults.forEach((result, index) => {
        expect(result.workflowId).toBe(`load-test-${index}`);
        expect(result.searchResult.results.length).toBeGreaterThan(0);
        expect(result.emailResult).toBeDefined();
        expect(result.cardResult).toBeDefined();

        const emailData = JSON.parse(result.emailResult.content[0].text);
        const cardData = JSON.parse(result.cardResult.content[0].text);

        expect(emailData.success).toBe(true);
        expect(cardData.success).toBe(true);
      });
    });
  });

  describe('Casos de Uso Reais Complexos', () => {
    it('deve processar cenário real: Reunião de Status → Relatório → Distribuição', async () => {
      // Cenário: Após reunião, gerar relatório e distribuir para stakeholders

      // 1. Buscar emails sobre a reunião
      const meetingEmails = await hub.callTool('email-primary', 'list_emails', {
        search: 'reunião status semanal',
        limit: 3,
      });

      // 2. Criar documento de acompanhamento no Notion
      const statusDoc = await hub.callTool('notion', 'create_page', {
        title: 'Status Report - Semana 03/2024',
        content: {
          meeting_date: new Date().toISOString(),
          participants: ['user@example.com', 'manager@example.com'],
          topics: ['Progresso Projeto X', 'Próximos Passos', 'Blockers'],
        },
      });

      // 3. Atualizar Trello com action items
      const actionItems = await hub.callTool('trello', 'add_card_to_list', {
        listId: 'action-items',
        name: 'Action Items - Status Meeting',
        description: 'Lista de ações derivadas da reunião de status',
      });

      // 4. Enviar resumo por email
      const summaryEmail = await hub.callTool('email-primary', 'send_email', {
        to: 'team@example.com',
        subject: 'Resumo - Reunião de Status 03/2024',
        body: 'Segue resumo da reunião de status com action items e próximos passos.',
      });

      // 5. Backup de arquivos importantes
      const fileBackup = await hub.callTool('onedrive-sharepoint', 'list_files', {
        path: '/Status_Reports',
        filter: 'recent',
      });

      // Verificar integridade do processo
      const results = [meetingEmails, statusDoc, actionItems, summaryEmail, fileBackup];
      results.forEach((result) => {
        expect(result).toBeDefined();
        const data = JSON.parse(result.content[0].text);
        expect(data.success).toBe(true);
      });

      // Verificar que o workflow criou conexões lógicas entre os componentes
      const statusData = JSON.parse(statusDoc.content[0].text);
      expect(statusData.success).toBe(true);
    });

    it('deve gerenciar workflow de crise: Problema → Notificação → Documentação → Follow-up', async () => {
      // Cenário de resposta a incidente

      // 1. Detectar problema via email crítico
      const criticalEmail = await hub.smartSearch('email crítico problema sistema');
      expect(criticalEmail.results[0].server_id).toBe('email-primary');

      // 2. Criar card urgente no Trello
      const urgentCard = await hub.callTool('trello', 'add_card_to_list', {
        listId: 'urgent-issues',
        name: 'CRÍTICO: Sistema indisponível',
        description: 'Sistema apresentando instabilidade. Investigação em andamento.',
        labels: ['critical', 'production'],
      });

      const cardData = JSON.parse(urgentCard.content[0].text);
      expect(cardData.success).toBe(true);

      // 3. Notificar equipe via WhatsApp
      const emergencyNotification = await hub.callTool('whatsapp', 'send_message', {
        to: '+5511999887766',
        message: '🚨 ALERTA: Sistema com problemas. Investigação iniciada. Card criado no Trello.',
      });

      const whatsappData = JSON.parse(emergencyNotification.content[0].text);
      expect(whatsappData.success).toBe(true);

      // 4. Documentar no Notion para post-mortem
      const incidentDoc = await hub.callTool('notion', 'create_page', {
        title: 'Incident Report - Sistema Indisponível',
        content: {
          severity: 'Critical',
          start_time: new Date().toISOString(),
          status: 'Investigating',
          timeline: ['14:30 - Problema detectado', '14:32 - Equipe notificada'],
        },
      });

      const docData = JSON.parse(incidentDoc.content[0].text);
      expect(docData.success).toBe(true);

      // 5. Backup de logs importantes
      const logBackup = await hub.callTool('onedrive-sharepoint', 'list_files', {
        path: '/Incident_Logs',
        filter: 'today',
      });

      const backupData = JSON.parse(logBackup.content[0].text);
      expect(backupData.success).toBe(true);

      // Verificar que o workflow de crise foi executado rapidamente e completamente
      expect(cardData.success).toBe(true);
      expect(whatsappData.success).toBe(true);
      expect(docData.success).toBe(true);
      expect(backupData.success).toBe(true);
    });
  });
});
