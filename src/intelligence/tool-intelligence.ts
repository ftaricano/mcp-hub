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

  // Configuração de inteligência para cada ferramenta
  static initialize(): void {
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
      related_tools: ['list_emails', 'send_email_with_file'],
      performance_score: 9,
      reliability_score: 9,
      complexity_level: 'basic',
      context_triggers: ['enviar email', 'mandar mensagem', 'email fernando'],
      intent_patterns: ['envie', 'mande', 'enviar para', 'comunicar']
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
      pt_keywords: ['notion', 'páginas', 'buscar', 'documentos', 'notas', 'conhecimento'],
      en_keywords: ['notion', 'pages', 'search', 'documents', 'notes'],
      use_cases: [
        'Encontrar documentação',
        'Buscar notas específicas',
        'Localizar projeto'
      ],
      typical_params: ['query', 'page_size'],
      success_indicators: ['Páginas encontradas'],
      related_tools: ['get_page_content', 'create_page'],
      performance_score: 8,
      reliability_score: 8,
      complexity_level: 'basic',
      context_triggers: ['buscar notion', 'páginas', 'documentação'],
      intent_patterns: ['busque', 'procure', 'encontre', 'ache']
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
    const lowerQuery = query.toLowerCase();
    const results: ToolIntelligence[] = [];

    for (const intel of this.intelligence.values()) {
      let score = 0;

      // Match exato em nomes portugueses (peso alto)
      if (intel.pt_name.toLowerCase() === lowerQuery) score += 100;
      
      // Match em palavras-chave portuguesas (peso alto)
      if (intel.pt_keywords.some(kw => kw === lowerQuery)) score += 80;
      
      // Match em padrões de intenção (peso alto)
      if (intel.intent_patterns.some(pattern => lowerQuery.includes(pattern))) score += 70;
      
      // Match em contexto (peso médio)
      if (intel.context_triggers.some(trigger => lowerQuery.includes(trigger))) score += 60;
      
      // Match parcial em descrição portuguesa (peso médio)
      if (intel.pt_description.toLowerCase().includes(lowerQuery)) score += 50;
      
      // Match em casos de uso (peso médio)
      if (intel.use_cases.some(useCase => useCase.toLowerCase().includes(lowerQuery))) score += 40;
      
      // Match em palavras-chave inglesas (peso baixo)
      if (intel.en_keywords.some(kw => kw.includes(lowerQuery))) score += 30;
      
      // Match parcial em nome da ferramenta (peso baixo)
      if (intel.tool_name.toLowerCase().includes(lowerQuery)) score += 20;

      // Contexto adicional
      if (context) {
        if (intel.category.toLowerCase().includes(context.toLowerCase())) score += 25;
        if (intel.subcategory.toLowerCase().includes(context.toLowerCase())) score += 15;
      }

      if (score > 0) {
        results.push({...intel, performance_score: score}); // Reutiliza campo para score
      }
    }

    // Ordena por score descendente, depois por confiabilidade
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
    const lowerQuery = query.toLowerCase();
    
    // Padrões de ação
    const actionPatterns = {
      'enviar': /enviar|mandar|disparar|transmitir/,
      'buscar': /buscar|procurar|encontrar|localizar|achar/,
      'listar': /listar|mostrar|exibir|ver|visualizar/,
      'criar': /criar|fazer|gerar|produzir|adicionar/,
      'tocar': /tocar|reproduzir|play|colocar/,
      'deletar': /deletar|apagar|remover|excluir/
    };

    // Padrões de alvo
    const targetPatterns = {
      'email': /email|mensagem|correio|e-mail/,
      'música': /música|musica|som|track|faixa|spotify/,
      'arquivo': /arquivo|documento|file|pdf|doc/,
      'projeto': /projeto|trello|card|tarefa|task/,
      'whatsapp': /whatsapp|wpp|zap/,
      'imagem': /imagem|foto|desenho|arte|picture/
    };

    let detectedAction = 'unknown';
    let detectedTarget = 'unknown';
    let confidence = 0;

    // Detecta ação
    for (const [action, pattern] of Object.entries(actionPatterns)) {
      if (pattern.test(lowerQuery)) {
        detectedAction = action;
        confidence += 0.5;
        break;
      }
    }

    // Detecta alvo
    for (const [target, pattern] of Object.entries(targetPatterns)) {
      if (pattern.test(lowerQuery)) {
        detectedTarget = target;
        confidence += 0.5;
        break;
      }
    }

    // Busca sugestões baseadas na análise
    const suggestions = this.smartSearch(`${detectedAction} ${detectedTarget}`).slice(0, 3);

    return {
      action: detectedAction,
      target: detectedTarget,
      confidence,
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