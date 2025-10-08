# LM Studio — Configuração do MCP Hub

Este guia coloca o MCP Hub no LM Studio usando os caminhos reais da sua máquina.

## JSON para colar (mcpServers)
Use um destes blocos dentro do seu arquivo de configuração do LM Studio (onde hoje está `{ "mcpServers": {} }`).

### Opção A — usando `node` (stdio)
```json
{
  "mcpServers": {
    "hub": {
      "command": "/opt/homebrew/bin/node",
      "args": [
        "/Users/fernandotaricano/mcp/mcp-hub/dist/index.js"
      ],
      "env": {
        "HUB_CONFIG": "/Users/fernandotaricano/mcp/mcp-hub/hub-config.json",
        "MCP_DEBUG": "true",
        "MCP_EMAIL_ENV_PATH": "/Users/fernandotaricano/mcp/mcp-email/.env",
        "MCP_SPOTIFY_ENV_PATH": "/Users/fernandotaricano/mcp/mcp-spotify/.env",
        "MCP_ONEDRIVE_ENV_PATH": "/Users/fernandotaricano/mcp/mcp-onedrive-sharepoint/.env",
        "MCP_YOUTUBE_ENV_PATH": "/Users/fernandotaricano/mcp/mcp-youtube/.env",
        "MCP_TRELLO_ENV_PATH": "/Users/fernandotaricano/mcp/mcp-server-trello/.env",
        "MCP_NOTION_ENV_PATH": "/Users/fernandotaricano/mcp/mcp-notion/.env"
      }
    }
  }
}
```

### Opção B — executável direto (stdio, sem `node`)
```json
{
  "mcpServers": {
    "hub": {
      "command": "/Users/fernandotaricano/mcp/mcp-hub/dist/index.js",
      "args": [],
      "env": {
        "HUB_CONFIG": "/Users/fernandotaricano/mcp/mcp-hub/hub-config.json",
        "MCP_DEBUG": "true",
        "MCP_EMAIL_ENV_PATH": "/Users/fernandotaricano/mcp/mcp-email/.env",
        "MCP_SPOTIFY_ENV_PATH": "/Users/fernandotaricano/mcp/mcp-spotify/.env",
        "MCP_ONEDRIVE_ENV_PATH": "/Users/fernandotaricano/mcp/mcp-onedrive-sharepoint/.env",
        "MCP_YOUTUBE_ENV_PATH": "/Users/fernandotaricano/mcp/mcp-youtube/.env",
        "MCP_TRELLO_ENV_PATH": "/Users/fernandotaricano/mcp/mcp-server-trello/.env",
        "MCP_NOTION_ENV_PATH": "/Users/fernandotaricano/mcp/mcp-notion/.env"
      }
    }
  }
}
```

Observações:
- Node detectado: `/opt/homebrew/bin/node` (v24.7.0).
- O arquivo `dist/index.js` do Hub já é executável (tem shebang).
- O `HUB_CONFIG` aponta para o `hub-config.json` deste repositório.

## Como adicionar no LM Studio
- Settings → Tools (ou MCP) → Add MCP Server.
- Tipo: Command (stdio).
- Preencha os campos com um dos blocos acima e salve.

## Validação rápida
- Devem aparecer 4 ferramentas: `list-all-tools`, `call-tool`, `smart-search`, `get-recommendations`.
- Testes:
  - `smart-search` com `{ "query": "enviar email" }`.
  - `list-all-tools` com `{ "query": "email", "limit": 20 }`.

## Solução de problemas
- “Directory import …/shared/logger” (ESM): já corrigido no Hub. Reinicie o LM Studio se ainda aparecer.
- Servidor específico não sobe: verifique caminhos no `hub-config.json` e credenciais do servidor correspondente.
- Se o erro for de credenciais (ex.: Outlook/Graph), confirme que o `.env` do servidor contém as variáveis e que o caminho `MCP_*_ENV_PATH` acima está correto.
- Para logs detalhados, execute manualmente o servidor (ex.: `node /Users/fernandotaricano/mcp/mcp-email/dist/index.js`).
- Algum servidor ausente: deixe `enabled: false` no `hub-config.json` até configurar.

---
Se quiser, posso ajustar o `hub-config.json` para incluir/remover servidores automaticamente com base nos diretórios presentes em `/Users/fernandotaricano/mcp`.
