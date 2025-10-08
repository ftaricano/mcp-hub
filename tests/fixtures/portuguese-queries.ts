export const PORTUGUESE_QUERIES = {
  email: [
    'enviar email para cliente',
    'buscar emails não lidos',
    'responder email do chefe',
    'anexar arquivo no email',
    'marcar email como lido',
    'procurar email sobre projeto',
    'listar emails recebidos hoje',
    'criar rascunho de email'
  ],
  
  music: [
    'tocar música relaxante',
    'pausar música atual',
    'próxima faixa',
    'criar playlist de trabalho',
    'buscar música por artista',
    'aumentar volume',
    'repetir música',
    'tocar playlist favorita'
  ],
  
  project: [
    'criar nova tarefa',
    'mover card para concluído',
    'adicionar membro ao board',
    'listar tarefas pendentes',
    'criar novo board',
    'arquivar cartão antigo',
    'definir prazo para tarefa',
    'atribuir tarefa ao colega'
  ],
  
  files: [
    'listar arquivos na pasta',
    'fazer download do documento',
    'subir arquivo para OneDrive',
    'compartilhar documento',
    'buscar arquivo por nome',
    'criar nova pasta',
    'excluir arquivo antigo',
    'renomear documento'
  ],
  
  knowledge: [
    'buscar páginas no Notion',
    'criar nova página',
    'atualizar base de conhecimento',
    'organizar notas pessoais',
    'pesquisar por tópico',
    'adicionar conteúdo à página',
    'estruturar informações',
    'criar template de página'
  ]
};

export const EXPECTED_INTENTS = {
  'enviar email para cliente': {
    action: 'enviar',
    target: 'email',
    recipient: 'cliente',
    confidence: 0.95,
    category: 'Comunicação'
  },
  
  'tocar música relaxante': {
    action: 'tocar',
    target: 'música',
    mood: 'relaxante',
    confidence: 0.92,
    category: 'Entretenimento'
  },
  
  'criar nova tarefa': {
    action: 'criar',
    target: 'tarefa',
    confidence: 0.88,
    category: 'Produtividade'
  },
  
  'buscar emails não lidos': {
    action: 'buscar',
    target: 'emails',
    filter: 'não lidos',
    confidence: 0.94,
    category: 'Comunicação'
  },
  
  'listar arquivos na pasta': {
    action: 'listar',
    target: 'arquivos',
    location: 'pasta',
    confidence: 0.90,
    category: 'Produtividade'
  }
};

export const CATEGORY_MAPPINGS = {
  'Comunicação': ['email', 'mensagem', 'whatsapp', 'slack'],
  'Entretenimento': ['música', 'spotify', 'playlist', 'vídeo'],
  'Produtividade': ['tarefa', 'projeto', 'arquivo', 'documento', 'trello', 'notion'],
  'Criação': ['imagem', 'design', 'arte', 'geração']
};

export const CONTEXT_SCENARIOS = {
  trabalho: [
    'enviar relatório para gerente',
    'agendar reunião de equipe',
    'revisar apresentação do projeto'
  ],
  
  pessoal: [
    'tocar música para relaxar',
    'organizar fotos pessoais',
    'criar lista de compras'
  ],
  
  entretenimento: [
    'encontrar filme para assistir',
    'descobrir música nova',
    'buscar receitas interessantes'
  ]
};