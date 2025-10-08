# 🧪 MCP Hub Testing Interface

Interface web interativa para testar e visualizar todas as ferramentas do MCP Hub.

## 📋 Características

- **Dashboard**: Visão geral de todos os servidores e ferramentas
- **Explorador de Servidores**: Status detalhado de cada servidor MCP
- **Navegador de Ferramentas**: Busca e filtragem de 105+ ferramentas
- **Testador Interativo**: Execute ferramentas com parâmetros customizados
- **Interface Moderna**: Design dark mode responsivo

## 🚀 Início Rápido

### 1. Instalar Dependências

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Iniciar Servidores

**Opção A: Iniciar Ambos (Recomendado)**
```bash
# Na raiz do testing-interface
npm run dev
```

**Opção B: Iniciar Separadamente**
```bash
# Terminal 1 - Backend (porta 3000)
cd backend
npm run dev

# Terminal 2 - Frontend (porta 5173)
cd frontend
npm run dev
```

### 3. Acessar Interface

Abra seu navegador em: **http://localhost:5173**

## 📡 API Backend

O backend roda na porta **3000** e expõe os seguintes endpoints:

### Servidores
- `GET /api/servers` - Lista todos os servidores
- `GET /api/servers/:serverId/tools` - Ferramentas de um servidor

### Ferramentas
- `GET /api/tools` - Lista todas as ferramentas
- `GET /api/tools/:serverId/:toolName` - Detalhes de uma ferramenta

### Execução
- `POST /api/execute` - Executa uma ferramenta
  ```json
  {
    "serverId": "spotify",
    "toolName": "search_tracks",
    "parameters": {
      "query": "focus music",
      "limit": 5
    }
  }
  ```

### Saúde
- `GET /api/health` - Status do servidor

## 🏗️ Arquitetura

```
testing-interface/
├── backend/                 # API Express + TypeScript
│   ├── src/
│   │   ├── server.ts       # Servidor principal
│   │   ├── routes/         # Rotas da API
│   │   ├── integration/    # Integração com Hub
│   │   └── types/          # Definições TypeScript
│   └── package.json
│
├── frontend/               # React + Vite + TypeScript
│   ├── src/
│   │   ├── App.tsx        # Componente principal
│   │   ├── components/     # Componentes UI
│   │   ├── lib/           # Cliente API
│   │   └── App.css        # Estilos
│   └── package.json
│
└── README.md
```

## 🎨 Componentes Frontend

### Dashboard
Visão geral com estatísticas:
- Servidores ativos/conectados
- Total de ferramentas por categoria
- Distribuição por servidor
- Status de saúde em tempo real

### ServerList
Lista detalhada de servidores:
- Status de conexão
- Número de ferramentas
- Informações de protocolo
- Indicadores de saúde

### ToolBrowser
Explorador de ferramentas com:
- Busca por nome/descrição
- Filtros por categoria e servidor
- Cards informativos
- Navegação para teste

### ToolTester
Interface de teste interativo:
- Formulário dinâmico baseado em schema
- Suporte para todos os tipos de parâmetros
- Execução e visualização de resultados
- Tratamento de erros

## 🔧 Desenvolvimento

### Backend
```bash
cd backend
npm run dev      # Desenvolvimento com hot reload
npm run build    # Build TypeScript
npm start        # Produção
```

### Frontend
```bash
cd frontend
npm run dev      # Desenvolvimento (Vite)
npm run build    # Build para produção
npm run preview  # Preview do build
```

## 🌐 Servidores Suportados

Atualmente a interface suporta os **6 servidores ativos** do MCP Hub:

1. **spotify** - 26 ferramentas (música e playlists)
2. **outlook-fernando** - 39 ferramentas (email)
3. **youtube** - 18 ferramentas (vídeos e analytics)
4. **trello** - 23 ferramentas (gerenciamento de projetos)
5. **notion** - 10 ferramentas (documentação)
6. **codex** - 4 ferramentas (AI assistant)

**Total**: **105+ ferramentas consolidadas**

## 📝 Notas

- Backend usa dados mock para demonstração inicial
- Para integração real com Hub, descomentar código em `HubClient`
- Frontend otimizado para dark mode
- Interface totalmente responsiva (mobile-friendly)

## 🐛 Troubleshooting

**Backend não inicia?**
- Verifique se a porta 3000 está livre
- Confirme que as dependências foram instaladas

**Frontend não conecta ao backend?**
- Verifique se backend está rodando em http://localhost:3000
- Confira configuração de CORS no backend

**Ferramentas não aparecem?**
- Verifique logs do backend para erros
- Confirme que `hub-config.json` está configurado corretamente

## 📄 Licença

MIT

## 👤 Autor

Fernando Taricano
