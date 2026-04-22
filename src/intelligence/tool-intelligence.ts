// Sistema de Inteligência para Ferramentas MCP Hub
// Otimizado para interação IA em português

export interface ToolIntelligence {
  server_id: string;
  tool_name: string;
  
  // Categorização inteligente
  category: string;
  subcategory: string;
  action_type: 'create' | 'read' | 'update' | 'delete' | 'search' | 'control' | 'analyze';
  
  // Mapeamento multilíngue
  pt_name: string;
  pt_description: string;
  pt_keywords: string[];
  en_keywords: string[];
  
  // Contexto de uso
  use_cases: string[];
  typical_params: string[];
  success_indicators: string[];
  
  // Inteligência de recomendação
  related_tools: string[];
  prerequisites?: string[];
  follows_tool?: string[];
  
  // Performance e confiabilidade
  performance_score: number; // 1-10
  reliability_score: number; // 1-10
  complexity_level: 'basic' | 'intermediate' | 'advanced';
  
  // Detecção automática de contexto
  context_triggers: string[];
  intent_patterns: string[];
}

export class ToolIntelligenceSystem {
  private static intelligence: Map<string, ToolIntelligence> = new Map();

  private static normalizeText(text: string): string {
    return text
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()
      .trim();
  }

  private static tokenize(text: string): string[] {
    return this.normalizeText(text)
      .replace(/[^\p{L}\p{N}\s_-]/gu, ' ')
      .replace(/[_-]/g, ' ')
      .split(/\s+/)
      .filter(token => token.length > 1);
  }

  private static levenshteinDistance(a: string, b: string): number {
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;

    const matrix = Array.from({ length: a.length + 1 }, (_, index) => Array(b.length + 1).fill(0));

    for (let i = 0; i <= a.length; i++) {
      matrix[i]![0] = i;
    }

    for (let j = 0; j <= b.length; j++) {
      matrix[0]![j] = j;
    }

    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[i]![j] = Math.min(
          matrix[i - 1]![j]! + 1,
          matrix[i]![j - 1]! + 1,
          matrix[i - 1]![j - 1]! + cost
        );
      }
    }

    return matrix[a.length]![b.length]!;
  }

  private static isFuzzyMatch(queryToken: string, candidateToken: string): boolean {
    if (queryToken === candidateToken) return true;
    if (queryToken.includes(candidateToken) || candidateToken.includes(queryToken)) return true;

    if (queryToken.length < 4 || candidateToken.length < 4) {
      return false;
    }

    const maxDistance = Math.max(1, Math.floor(Math.min(queryToken.length, candidateToken.length) / 4));
    return this.levenshteinDistance(queryToken, candidateToken) <= maxDistance;
  }

  private static scoreTokenMatches(queryTokens: string[], candidateTokens: string[], exactWeight: number, fuzzyWeight: number): number {
    let score = 0;

    for (const queryToken of queryTokens) {
      for (const candidateToken of candidateTokens) {
        if (queryToken === candidateToken) {
          score += exactWeight;
          break;
        }

        if (this.isFuzzyMatch(queryToken, candidateToken)) {
          score += fuzzyWeight;
          break;
        }
      }
    }

    return score;
  }

  // Configuração de inteligência para cada ferramenta
  static initialize(): void {
    this.intelligence.clear();
    // === EMAIL TOOLS ===
    // Outlook Fernando
    this.addIntelligence({
      server_id: 'outlook-fernando',
      tool_name: 'list_emails',
      category: 'Comunicação',
      subcategory: 'Email',
      action_type: 'read',
      pt_name: 'Listar Emails',
      pt_description: 'Lista e busca emails na caixa de entrada do Fernando',
      pt_keywords: ['email', 'emails', 'mensagem', 'mensagens', 'caixa de entrada', 'inbox', 'listar', 'buscar', 'fernando'],
      en_keywords: ['email', 'emails', 'message', 'messages', 'inbox', 'list', 'search'],
      use_cases: [
        'Verificar emails não lidos',
        'Buscar email específico por assunto ou remetente',
        'Listar emails de uma pasta específica',
        'Ver últimos emails recebidos'
      ],
      typical_params: ['search', 'folder', 'limit'],
      success_indicators: ['Retorna lista de emails', 'Busca funciona corretamente'],
      related_tools: ['send_email', 'reply_to_email', 'mark_as_read'],
      performance_score: 9,
      reliability_score: 9,
      complexity_level: 'basic',
      context_triggers: ['email do fernando', 'emails fernando', 'mensagens fernando'],
      intent_patterns: ['quero ver', 'mostre', 'liste', 'busque', 'procure']
    });

    this.addIntelligence({
      server_id: 'outlook-fernando',
      tool_name: 'send_email',
      category: 'Comunicação',
      subcategory: 'Email',
      action_type: 'create',
      pt_name: 'Enviar Email',
      pt_description: 'Envia novo email pela conta do Fernando com suporte a anexos',
      pt_keywords: ['enviar', 'mandar', 'email', 'mensagem', 'fernando', 'anexo', 'arquivo'],
      en_keywords: ['send', 'email', 'message', 'attachment'],
      use_cases: [
        'Enviar email para cliente',
        'Responder email importante',
        'Enviar documento por email',
        'Comunicação oficial da empresa'
      ],
      typical_params: ['to', 'subject', 'body', 'attachments'],
      success_indicators: ['Email enviado com sucesso'],
      related_tools: ['list_emails', 'reply_to_email', 'send_email_with_file'],
      performance_score: 9,
      reliability_score: 9,
      complexity_level: 'basic',
      context_triggers: ['enviar email', 'mandar mensagem', 'email fernando'],
      intent_patterns: ['envie', 'mande', 'enviar para', 'comunicar']
    });

    this.addIntelligence({
      server_id: 'outlook-fernando',
      tool_name: 'reply_to_email',
      category: 'Comunicação',
      subcategory: 'Email',
      action_type: 'update',
      pt_name: 'Responder Email',
      pt_description: 'Responde emails existentes mantendo o contexto da conversa',
      pt_keywords: ['responder', 'resposta', 'reply', 'email', 'mensagem', 'caixa de entrada'],
      en_keywords: ['reply', 'respond', 'email', 'message'],
      use_cases: [
        'Responder email urgente',
        'Dar retorno para cliente',
        'Continuar conversa por email'
      ],
      typical_params: ['messageId', 'message', 'replyAll'],
      success_indicators: ['Resposta enviada com sucesso'],
      related_tools: ['list_emails', 'send_email'],
      follows_tool: ['list_emails'],
      performance_score: 9,
      reliability_score: 9,
      complexity_level: 'basic',
      context_triggers: ['responder email', 'reply email', 'retornar mensagem'],
      intent_patterns: ['responda', 'responder', 'retorne', 'reply']
    });

    // Outlook Faturamento
    this.addIntelligence({
      server_id: 'outlook-faturamento',
      tool_name: 'list_emails',
      category: 'Financeiro',
      subcategory: 'Email',
      action_type: 'read',
      pt_name: 'Listar Emails Faturamento',
      pt_description: 'Lista emails da conta de faturamento',
      pt_keywords: ['email', 'faturamento', 'cobrança', 'boleto', 'pagamento', 'financeiro'],
      en_keywords: ['email', 'billing', 'invoice', 'payment'],
      use_cases: [
        'Verificar emails de cobrança',
        'Acompanhar pagamentos',
        'Ver comunicações financeiras'
      ],
      typical_params: ['search', 'folder', 'limit'],
      success_indicators: ['Lista emails financeiros'],
      related_tools: ['send_email', 'send_billing_alert'],
      performance_score: 9,
      reliability_score: 9,
      complexity_level: 'basic',
      context_triggers: ['email faturamento', 'emails cobrança', 'mensagens financeiras'],
      intent_patterns: ['cobranças', 'pagamentos', 'boletos', 'faturas']
    });

    // === SPOTIFY TOOLS ===
    this.addIntelligence({
      server_id: 'spotify',
      tool_name: 'search_tracks',
      category: 'Entretenimento',
      subcategory: 'Música',
      action_type: 'search',
      pt_name: 'Buscar Músicas',
      pt_description: 'Busca faixas no Spotify',
      pt_keywords: ['música', 'musica', 'faixa', 'song', 'track', 'buscar', 'procurar', 'spotify'],
      en_keywords: ['music', 'song', 'track', 'search', 'spotify'],
      use_cases: [
        'Encontrar música específica',
        'Descobrir novas músicas',
        'Buscar por artista ou álbum'
      ],
      typical_params: ['query', 'limit'],
      success_indicators: ['Retorna lista de músicas'],
      related_tools: ['play_track', 'search_artists', 'search_albums'],
      performance_score: 9,
      reliability_score: 8,
      complexity_level: 'basic',
      context_triggers: ['buscar música', 'procurar song', 'encontrar faixa'],
      intent_patterns: ['toque', 'coloque', 'busque', 'procure']
    });

    this.addIntelligence({
      server_id: 'spotify',
      tool_name: 'play_track',
      category: 'Entretenimento',
      subcategory: 'Música',
      action_type: 'control',
      pt_name: 'Tocar Música',
      pt_description: 'Reproduz música no Spotify',
      pt_keywords: ['tocar', 'reproduzir', 'play', 'música', 'som', 'spotify'],
      en_keywords: ['play', 'music', 'track', 'spotify'],
      use_cases: [
        'Tocar música específica',
        'Retomar reprodução',
        'Trocar de música'
      ],
      typical_params: ['track_uri', 'context_uri', 'device_id'],
      success_indicators: ['Música começou a tocar'],
      related_tools: ['pause_playback', 'search_tracks'],
      prerequisites: ['search_tracks'],
      performance_score: 9,
      reliability_score: 8,
      complexity_level: 'basic',
      context_triggers: ['tocar música', 'play song', 'reproduzir'],
      intent_patterns: ['toque', 'coloque', 'play', 'reproduza']
    });

    // === TRELLO TOOLS ===
    this.addIntelligence({
      server_id: 'trello',
      tool_name: 'get_lists',
      category: 'Produtividade',
      subcategory: 'Gestão de Projetos',
      action_type: 'read',
      pt_name: 'Listar Listas do Trello',
      pt_description: 'Mostra todas as listas do quadro Trello',
      pt_keywords: ['trello', 'listas', 'quadro', 'board', 'projeto', 'tarefas'],
      en_keywords: ['trello', 'lists', 'board', 'project', 'tasks'],
      use_cases: [
        'Ver estrutura do projeto',
        'Entender organização das tarefas',
        'Escolher lista para adicionar card'
      ],
      typical_params: ['boardId'],
      success_indicators: ['Mostra listas disponíveis'],
      related_tools: ['add_card_to_list', 'get_cards_by_list_id'],
      performance_score: 9,
      reliability_score: 9,
      complexity_level: 'basic',
      context_triggers: ['listas trello', 'quadros projeto', 'organização tarefas'],
      intent_patterns: ['mostre', 'liste', 'veja', 'estrutura']
    });

    this.addIntelligence({
      server_id: 'trello',
      tool_name: 'add_card_to_list',
      category: 'Produtividade',
      subcategory: 'Gestão de Projetos',
      action_type: 'create',
      pt_name: 'Criar Card no Trello',
      pt_description: 'Adiciona nova tarefa ao Trello',
      pt_keywords: ['trello', 'card', 'tarefa', 'criar', 'adicionar', 'projeto'],
      en_keywords: ['trello', 'card', 'task', 'create', 'add'],
      use_cases: [
        'Criar nova tarefa',
        'Adicionar item ao projeto',
        'Organizar trabalho'
      ],
      typical_params: ['listId', 'name', 'description'],
      success_indicators: ['Card criado com sucesso'],
      related_tools: ['get_lists'],
      prerequisites: ['get_lists'],
      performance_score: 9,
      reliability_score: 9,
      complexity_level: 'intermediate',
      context_triggers: ['criar card', 'nova tarefa', 'adicionar projeto'],
      intent_patterns: ['crie', 'adicione', 'faça', 'nova']
    });

    // === ONEDRIVE/SHAREPOINT TOOLS ===
    this.addIntelligence({
      server_id: 'onedrive-sharepoint',
      tool_name: 'list_files',
      category: 'Arquivos',
      subcategory: 'Armazenamento',
      action_type: 'read',
      pt_name: 'Listar Arquivos',
      pt_description: 'Lista arquivos do OneDrive/SharePoint',
      pt_keywords: ['arquivos', 'files', 'documentos', 'onedrive', 'sharepoint', 'pasta'],
      en_keywords: ['files', 'documents', 'onedrive', 'sharepoint', 'folder'],
      use_cases: [
        'Ver arquivos disponíveis',
        'Navegar pastas',
        'Encontrar documento'
      ],
      typical_params: ['path', 'limit'],
      success_indicators: ['Lista arquivos encontrados'],
      related_tools: ['download_file', 'upload_file'],
      performance_score: 8,
      reliability_score: 9,
      complexity_level: 'basic',
      context_triggers: ['listar arquivos', 'ver documentos', 'pasta'],
      intent_patterns: ['mostre', 'liste', 'veja', 'arquivos']
    });

    // === NOTION TOOLS ===
    this.addIntelligence({
      server_id: 'notion',
      tool_name: 'search_pages',
      category: 'Conhecimento',
      subcategory: 'Documentação',
      action_type: 'search',
      pt_name: 'Buscar Páginas Notion',
      pt_description: 'Busca páginas no workspace Notion',
      pt_keywords: ['notion', 'páginas', 'pagina', 'buscar', 'documentos', 'notas', 'conhecimento', 'base', 'tópico', 'conteúdo', 'informações'],
      en_keywords: ['notion', 'pages', 'search', 'documents', 'notes'],
      use_cases: [
        'Encontrar documentação',
        'Buscar notas específicas',
        'Localizar projeto',
        'Pesquisar por tópico',
        'Consultar base de conhecimento'
      ],
      typical_params: ['query', 'page_size'],
      success_indicators: ['Páginas encontradas'],
      related_tools: ['get_page_content', 'create_page'],
      performance_score: 8,
      reliability_score: 8,
      complexity_level: 'basic',
      context_triggers: ['buscar notion', 'páginas', 'documentação'],
      intent_patterns: ['busque', 'procure', 'encontre', 'ache', 'pesquise']
    });

    this.addIntelligence({
      server_id: 'notion',
      tool_name: 'create_page',
      category: 'Conhecimento',
      subcategory: 'Documentação',
      action_type: 'create',
      pt_name: 'Criar Página Notion',
      pt_description: 'Cria nova página ou documento no workspace Notion',
      pt_keywords: ['notion', 'pagina', 'página', 'criar', 'nova página', 'documentar', 'documentação', 'notas', 'organizar', 'estruturar', 'template', 'conteúdo', 'informações'],
      en_keywords: ['notion', 'create', 'page', 'document', 'notes'],
      use_cases: [
        'Criar documentação de projeto',
        'Registrar reunião ou relatório',
        'Organizar informações em página'
      ],
      typical_params: ['parent_id', 'title', 'content'],
      success_indicators: ['Página criada com sucesso'],
      related_tools: ['search_pages'],
      performance_score: 8,
      reliability_score: 8,
      complexity_level: 'basic',
      context_triggers: ['criar página notion', 'documentar no notion', 'nova página notion'],
      intent_patterns: ['crie', 'criar', 'documente', 'registre']
    });

    // === WHATSAPP TOOLS ===
    this.addIntelligence({
      server_id: 'whatsapp',
      tool_name: 'send_message',
      category: 'Comunicação',
      subcategory: 'Mensagens',
      action_type: 'create',
      pt_name: 'Enviar WhatsApp',
      pt_description: 'Envia mensagem via WhatsApp Business',
      pt_keywords: ['whatsapp', 'mensagem', 'enviar', 'sms', 'texto', 'celular'],
      en_keywords: ['whatsapp', 'message', 'send', 'sms', 'text'],
      use_cases: [
        'Comunicar com cliente',
        'Enviar confirmação',
        'Lembrete importante'
      ],
      typical_params: ['to', 'message'],
      success_indicators: ['Mensagem enviada'],
      related_tools: ['send_billing_alert', 'send_document_reminder'],
      performance_score: 7,
      reliability_score: 8,
      complexity_level: 'basic',
      context_triggers: ['whatsapp', 'mensagem celular', 'sms'],
      intent_patterns: ['envie whatsapp', 'mande mensagem', 'avise']
    });

    // === IMAGE GENERATOR TOOLS ===
    this.addIntelligence({
      server_id: 'image-generator',
      tool_name: 'generate_image',
      category: 'Criação',
      subcategory: 'Imagem',
      action_type: 'create',
      pt_name: 'Gerar Imagem',
      pt_description: 'Cria imagem com IA usando Hugging Face',
      pt_keywords: ['imagem', 'gerar', 'criar', 'ia', 'desenho', 'foto', 'arte'],
      en_keywords: ['image', 'generate', 'create', 'ai', 'drawing', 'photo'],
      use_cases: [
        'Criar ilustração',
        'Gerar arte conceitual',
        'Produzir imagem promocional'
      ],
      typical_params: ['prompt', 'model', 'width', 'height'],
      success_indicators: ['Imagem gerada e salva'],
      related_tools: ['optimize_image'],
      performance_score: 6,
      reliability_score: 7,
      complexity_level: 'intermediate',
      context_triggers: ['gerar imagem', 'criar desenho', 'arte ia'],
      intent_patterns: ['gere', 'crie', 'faça', 'desenhe']
    });

    // === CODEX AI TOOLS ===
    this.addIntelligence({
      server_id: 'codex',
      tool_name: 'codex_chat',
      category: 'Desenvolvimento',
      subcategory: 'IA & Assistente',
      action_type: 'analyze',
      pt_name: 'Conversar com Codex IA',
      pt_description: 'Conversa com assistente IA Codex para ajuda com código e desenvolvimento',
      pt_keywords: ['codex', 'ia', 'assistente', 'conversar', 'ajuda', 'código', 'desenvolver', 'programar', 'chat'],
      en_keywords: ['codex', 'ai', 'assistant', 'chat', 'help', 'code', 'develop', 'program'],
      use_cases: [
        'Obter ajuda com código',
        'Discutir arquitetura de software',
        'Resolver problemas de programação',
        'Aprender novas tecnologias'
      ],
      typical_params: ['prompt', 'context'],
      success_indicators: ['Resposta útil recebida'],
      related_tools: ['codex_exec', 'codex_apply'],
      performance_score: 9,
      reliability_score: 9,
      complexity_level: 'basic',
      context_triggers: ['conversar codex', 'ajuda código', 'assistente ia'],
      intent_patterns: ['ajude', 'explique', 'como faço', 'preciso']
    });

    this.addIntelligence({
      server_id: 'codex',
      tool_name: 'codex_exec',
      category: 'Desenvolvimento',
      subcategory: 'IA & Assistente',
      action_type: 'create',
      pt_name: 'Executar Código com IA',
      pt_description: 'Executa prompts e gera código usando IA Codex de forma não-interativa',
      pt_keywords: ['codex', 'executar', 'gerar', 'código', 'ia', 'programar', 'criar', 'desenvolver', 'script'],
      en_keywords: ['codex', 'execute', 'generate', 'code', 'ai', 'program', 'create', 'develop'],
      use_cases: [
        'Gerar código automaticamente',
        'Criar scripts rapidamente',
        'Implementar funcionalidades',
        'Automatizar tarefas de código'
      ],
      typical_params: ['prompt', 'language', 'context'],
      success_indicators: ['Código gerado com sucesso'],
      related_tools: ['codex_apply', 'codex_chat'],
      prerequisites: ['codex_chat'],
      performance_score: 9,
      reliability_score: 8,
      complexity_level: 'intermediate',
      context_triggers: ['executar codex', 'gerar código', 'criar script'],
      intent_patterns: ['execute', 'gere', 'crie', 'implemente']
    });

    this.addIntelligence({
      server_id: 'codex',
      tool_name: 'codex_apply',
      category: 'Desenvolvimento',
      subcategory: 'IA & Assistente',
      action_type: 'update',
      pt_name: 'Aplicar Mudanças Codex',
      pt_description: 'Aplica diffs e mudanças de código sugeridas pelo Codex ao projeto',
      pt_keywords: ['codex', 'aplicar', 'diff', 'mudanças', 'patch', 'atualizar', 'modificar'],
      en_keywords: ['codex', 'apply', 'diff', 'changes', 'patch', 'update', 'modify'],
      use_cases: [
        'Aplicar sugestões de código',
        'Implementar correções automáticas',
        'Atualizar código existente',
        'Aplicar patches gerados'
      ],
      typical_params: ['diff', 'target_files'],
      success_indicators: ['Mudanças aplicadas com sucesso'],
      related_tools: ['codex_exec'],
      follows_tool: ['codex_exec'],
      performance_score: 8,
      reliability_score: 8,
      complexity_level: 'intermediate',
      context_triggers: ['aplicar codex', 'aplicar mudanças', 'atualizar código'],
      intent_patterns: ['aplique', 'atualize', 'modifique', 'implemente']
    });

    this.addIntelligence({
      server_id: 'codex',
      tool_name: 'codex_resume',
      category: 'Desenvolvimento',
      subcategory: 'IA & Assistente',
      action_type: 'read',
      pt_name: 'Resumir Sessão Codex',
      pt_description: 'Resume ou continua uma sessão anterior do Codex',
      pt_keywords: ['codex', 'resumir', 'continuar', 'sessão', 'retomar', 'histórico'],
      en_keywords: ['codex', 'resume', 'continue', 'session', 'history'],
      use_cases: [
        'Continuar trabalho anterior',
        'Revisar sessão passada',
        'Retomar contexto perdido',
        'Ver histórico de interações'
      ],
      typical_params: ['session_id', 'recent'],
      success_indicators: ['Sessão restaurada'],
      related_tools: ['codex_chat', 'codex_exec'],
      performance_score: 8,
      reliability_score: 9,
      complexity_level: 'basic',
      context_triggers: ['resumir codex', 'continuar sessão', 'retomar trabalho'],
      intent_patterns: ['resume', 'continue', 'retome', 'volte']
    });

    console.log(`✅ Sistema de Inteligência inicializado com ${this.intelligence.size} ferramentas`);
  }

  private static addIntelligence(intel: ToolIntelligence): void {
    const key = `${intel.server_id}/${intel.tool_name}`;
    this.intelligence.set(key, intel);
  }

  // Busca inteligente com suporte a português
  static smartSearch(query: string, context?: string): ToolIntelligence[] {
    const normalizedQuery = this.normalizeText(query);
    if (!normalizedQuery) return [];

    const queryTokens = this.tokenize(query);
    const normalizedContext = context ? this.normalizeText(context) : undefined;
    const results: ToolIntelligence[] = [];

    const actionIntentMap: Record<ToolIntelligence['action_type'], string[]> = {
      create: ['criar', 'enviar', 'adicionar', 'fazer', 'gerar', 'responder', 'mandar', 'documentar'],
      read: ['listar', 'ver', 'mostrar', 'buscar', 'procurar'],
      update: ['atualizar', 'editar', 'responder', 'marcar', 'retornar'],
      delete: ['apagar', 'deletar', 'excluir', 'remover'],
      search: ['buscar', 'procurar', 'encontrar', 'pesquisar'],
      control: ['tocar', 'reproduzir', 'pausar', 'continuar', 'aumentar', 'colocar'],
      analyze: ['analisar', 'explicar', 'ajudar']
    };

    const categoryTokenMap: Record<string, string[]> = {
      'Comunicação': ['email', 'emails', 'mensagem', 'mensagens', 'whatsapp', 'mail'],
      'Entretenimento': ['musica', 'spotify', 'playlist', 'faixa', 'track'],
      'Produtividade': ['trello', 'tarefa', 'tarefas', 'projeto', 'card', 'board'],
      'Arquivos': ['arquivo', 'arquivos', 'documento', 'documentos', 'pasta', 'sharepoint', 'onedrive'],
      'Conhecimento': ['notion', 'pagina', 'paginas', 'documentacao', 'notas', 'conhecimento', 'base'],
      'Criação': ['imagem', 'arte', 'foto']
    };

    const domainRules = [
      {
        tokens: ['email', 'emails', 'mensagem', 'mensagens', 'inbox', 'caixa', 'mail'],
        matches: (intel: ToolIntelligence) => intel.server_id.includes('outlook') || intel.subcategory === 'Email',
        boost: 100,
        penalty: -30
      },
      {
        tokens: ['whatsapp', 'zap', 'wpp'],
        matches: (intel: ToolIntelligence) => intel.server_id === 'whatsapp' || intel.subcategory === 'Mensagens',
        boost: 110,
        penalty: -35
      },
      {
        tokens: ['musica', 'spotify', 'playlist', 'faixa', 'track', 'song'],
        matches: (intel: ToolIntelligence) => intel.server_id === 'spotify' || intel.subcategory === 'Música',
        boost: 90,
        penalty: -25
      },
      {
        tokens: ['trello', 'tarefa', 'tarefas', 'projeto', 'card', 'board'],
        matches: (intel: ToolIntelligence) => intel.server_id === 'trello' || intel.category === 'Produtividade',
        boost: 85,
        penalty: -20
      },
      {
        tokens: ['arquivo', 'arquivos', 'documento', 'documentos', 'pasta', 'sharepoint', 'onedrive'],
        matches: (intel: ToolIntelligence) => intel.server_id.includes('onedrive') || intel.category === 'Arquivos',
        boost: 90,
        penalty: -25
      },
      {
        tokens: ['notion', 'pagina', 'paginas', 'documentacao', 'notas', 'conteudo', 'informacoes', 'conhecimento', 'base', 'topico'],
        matches: (intel: ToolIntelligence) => intel.server_id === 'notion' || intel.category === 'Conhecimento',
        boost: 95,
        penalty: -25
      }
    ];

    for (const intel of this.intelligence.values()) {
      let score = 0;
      const toolTokens = Array.from(new Set([
        ...this.tokenize(intel.pt_name),
        ...this.tokenize(intel.pt_description),
        ...intel.pt_keywords.flatMap(keyword => this.tokenize(keyword)),
        ...intel.en_keywords.flatMap(keyword => this.tokenize(keyword)),
        ...intel.use_cases.flatMap(useCase => this.tokenize(useCase)),
        ...intel.context_triggers.flatMap(trigger => this.tokenize(trigger)),
        ...intel.intent_patterns.flatMap(pattern => this.tokenize(pattern)),
        ...this.tokenize(intel.tool_name),
        ...this.tokenize(intel.category),
        ...this.tokenize(intel.subcategory),
        ...this.tokenize(intel.server_id)
      ]));

      const normalizedPtName = this.normalizeText(intel.pt_name);
      const normalizedDescription = this.normalizeText(intel.pt_description);

      if (normalizedPtName === normalizedQuery) score += 100;
      if (normalizedDescription.includes(normalizedQuery) || normalizedQuery.includes(normalizedDescription)) score += 40;
      if (this.normalizeText(intel.tool_name).includes(normalizedQuery)) score += 25;

      score += this.scoreTokenMatches(queryTokens, toolTokens, 24, 11);

      if (intel.intent_patterns.some(pattern => normalizedQuery.includes(this.normalizeText(pattern)))) score += 70;
      if (intel.context_triggers.some(trigger => normalizedQuery.includes(this.normalizeText(trigger)))) score += 60;
      if (intel.use_cases.some(useCase => this.normalizeText(useCase).includes(normalizedQuery))) score += 40;

      if (actionIntentMap[intel.action_type].some(action => queryTokens.includes(this.normalizeText(action)))) {
        score += 35;
      }

      if ((categoryTokenMap[intel.category] || []).some(token => queryTokens.includes(token))) {
        score += 30;
      }

      for (const rule of domainRules) {
        if (rule.tokens.some(token => queryTokens.includes(token))) {
          score += rule.matches(intel) ? rule.boost : rule.penalty;
        }
      }

      const wantsSearch = ['buscar', 'procurar', 'encontrar', 'listar', 'ver', 'mostrar', 'pesquisar'].some(token => queryTokens.includes(token));
      const wantsCreate = ['criar', 'enviar', 'adicionar', 'fazer', 'mandar', 'documentar'].some(token => queryTokens.includes(token));
      const isEmailQuery = ['email', 'emails', 'mensagem', 'mensagens', 'mail'].some(token => queryTokens.includes(token));
      const isProjectQuery = ['trello', 'tarefa', 'tarefas', 'projeto', 'card', 'board'].some(token => queryTokens.includes(token));
      const isFileQuery = ['arquivo', 'arquivos', 'documento', 'documentos', 'pasta', 'sharepoint', 'onedrive'].some(token => queryTokens.includes(token));
      const isKnowledgeQuery = ['notion', 'pagina', 'paginas', 'documentacao', 'notas', 'conhecimento', 'base', 'topico'].some(token => queryTokens.includes(token));

      if (isEmailQuery && wantsSearch && (intel.server_id.includes('outlook') || intel.subcategory === 'Email')) {
        score += intel.tool_name === 'list_emails' ? 110 : 45;
      }
      if (isEmailQuery && wantsCreate && intel.tool_name === 'send_email') {
        score += 115;
      }
      if (isEmailQuery && normalizedQuery.includes('anex') && intel.tool_name === 'send_email') {
        score += 140;
      }
      if (isEmailQuery && intel.category === 'Arquivos') {
        score -= 35;
      }
      if (normalizedQuery.includes('responder') && intel.tool_name === 'reply_to_email') {
        score += 120;
      }
      if (isProjectQuery && wantsCreate && intel.server_id === 'trello') {
        score += intel.action_type === 'create' ? 110 : 40;
      }
      if (isProjectQuery && wantsSearch && intel.server_id === 'trello') {
        score += intel.action_type === 'read' ? 100 : 35;
      }
      if (isFileQuery && intel.category === 'Arquivos') {
        score += wantsSearch ? 110 : 80;
      }
      if (isKnowledgeQuery && intel.server_id === 'notion') {
        score += wantsCreate ? (intel.action_type === 'create' ? 115 : 70) : 100;
      }

      if (normalizedContext) {
        const normalizedCategory = this.normalizeText(intel.category);
        const normalizedSubcategory = this.normalizeText(intel.subcategory);
        if (normalizedCategory.includes(normalizedContext)) score += 25;
        if (normalizedSubcategory.includes(normalizedContext)) score += 15;
        if (normalizedContext === 'trabalho' && ['Comunicação', 'Produtividade', 'Conhecimento', 'Arquivos'].includes(intel.category)) {
          score += 20;
        }
      }

      if (score > 0) {
        results.push({ ...intel, performance_score: score });
      }
    }

    return results.sort((a, b) => {
      if (a.performance_score !== b.performance_score) {
        return b.performance_score - a.performance_score;
      }
      return b.reliability_score - a.reliability_score;
    });
  }

  // Recomendações baseadas em contexto
  static getRecommendations(toolKey: string, context?: string): ToolIntelligence[] {
    const intel = this.intelligence.get(toolKey);
    if (!intel) return [];

    const recommendations: ToolIntelligence[] = [];

    // Adiciona ferramentas relacionadas
    for (const relatedKey of intel.related_tools) {
      const related = this.findToolByName(relatedKey);
      if (related) recommendations.push(related);
    }

    // Adiciona ferramentas que seguem esta
    for (const followKey of intel.follows_tool || []) {
      const follow = this.findToolByName(followKey);
      if (follow) recommendations.push(follow);
    }

    return recommendations;
  }

  // Encontra ferramenta por nome (busca fuzzy)
  private static findToolByName(toolName: string): ToolIntelligence | null {
    for (const intel of this.intelligence.values()) {
      if (intel.tool_name === toolName || intel.pt_name.toLowerCase().includes(toolName.toLowerCase())) {
        return intel;
      }
    }
    return null;
  }

  // Análise de intenção baseada em padrões
  static analyzeIntent(query: string): {
    action: string;
    target: string;
    confidence: number;
    suggestions: ToolIntelligence[];
  } {
    const normalizedQuery = this.normalizeText(query);
    const queryTokens = this.tokenize(query);
    
    const actionPatterns: Array<{ action: string; patterns: string[] }> = [
      { action: 'enviar', patterns: ['enviar', 'mandar', 'disparar', 'transmitir'] },
      { action: 'buscar', patterns: ['buscar', 'procurar', 'encontrar', 'localizar', 'achar', 'pesquisar'] },
      { action: 'listar', patterns: ['listar', 'mostrar', 'exibir', 'ver', 'visualizar'] },
      { action: 'tocar', patterns: ['tocar'] },
      { action: 'reproduzir', patterns: ['reproduzir'] },
      { action: 'colocar', patterns: ['colocar'] },
      { action: 'criar', patterns: ['criar', 'fazer', 'gerar', 'produzir', 'adicionar', 'documentar', 'registrar'] },
      { action: 'deletar', patterns: ['deletar', 'apagar', 'remover', 'excluir'] }
    ];

    const targetPatterns: Array<{ target: string; patterns: string[] }> = [
      { target: 'email', patterns: ['email', 'emails', 'mensagem', 'mensagens', 'correio', 'e-mail'] },
      { target: 'música', patterns: ['música', 'musica', 'som', 'track', 'faixa', 'spotify', 'playlist'] },
      { target: 'arquivo', patterns: ['arquivo', 'arquivos', 'documento', 'documentos', 'file', 'files', 'pdf', 'doc', 'sharepoint', 'onedrive'] },
      { target: 'projeto', patterns: ['projeto', 'trello', 'card', 'tarefa', 'tarefas', 'task', 'board'] },
      { target: 'whatsapp', patterns: ['whatsapp', 'wpp', 'zap'] },
      { target: 'notion', patterns: ['notion', 'pagina', 'paginas', 'documentacao', 'notas', 'conhecimento'] },
      { target: 'imagem', patterns: ['imagem', 'foto', 'desenho', 'arte', 'picture'] }
    ];

    let detectedAction = 'unknown';
    let detectedTarget = 'unknown';
    let confidence = 0;

    for (const entry of actionPatterns) {
      const matchedPattern = entry.patterns.find(pattern => 
        queryTokens.includes(this.normalizeText(pattern)) || normalizedQuery.includes(this.normalizeText(pattern))
      );

      if (matchedPattern) {
        detectedAction = this.normalizeText(matchedPattern);
        confidence += 0.45;
        break;
      }
    }

    for (const entry of targetPatterns) {
      const matchedPattern = entry.patterns.find(pattern => 
        queryTokens.includes(this.normalizeText(pattern)) || normalizedQuery.includes(this.normalizeText(pattern))
      );

      if (matchedPattern) {
        detectedTarget = entry.target;
        confidence += 0.45;
        break;
      }
    }

    const suggestions = this.smartSearch(query).slice(0, 3);
    if (suggestions.length > 0) {
      confidence += 0.1;
    }

    return {
      action: detectedAction,
      target: detectedTarget,
      confidence: Math.min(confidence, 0.99),
      suggestions
    };
  }

  // Obtém todas as categorias disponíveis
  static getCategories(): string[] {
    const categories = new Set<string>();
    for (const intel of this.intelligence.values()) {
      categories.add(intel.category);
    }
    return Array.from(categories);
  }

  // Obtém ferramentas por categoria
  static getToolsByCategory(category: string): ToolIntelligence[] {
    return Array.from(this.intelligence.values())
      .filter(intel => intel.category === category)
      .sort((a, b) => b.reliability_score - a.reliability_score);
  }

  // Estatísticas do sistema
  static getStats(): {
    totalTools: number;
    categories: number;
    servers: number;
    avgReliability: number;
  } {
    const tools = Array.from(this.intelligence.values());
    const categories = new Set(tools.map(t => t.category));
    const servers = new Set(tools.map(t => t.server_id));
    const avgReliability = tools.reduce((sum, t) => sum + t.reliability_score, 0) / tools.length;

    return {
      totalTools: tools.length,
      categories: categories.size,
      servers: servers.size,
      avgReliability: Math.round(avgReliability * 10) / 10
    };
  }
}

// Inicializar o sistema
ToolIntelligenceSystem.initialize();