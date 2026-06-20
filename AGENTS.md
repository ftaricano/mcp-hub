# AGENTS.md -- mcp-hub

As regras operacionais deste repo sao canonicas em [CLAUDE.md](CLAUDE.md) (fonte unica para Claude/Codex/Hermes). Leia-o antes de tocar em codigo.

TL;DR das invariantes:
- `hub-config.json` nunca entra no git -- contem paths e env-refs de maquina
- `.env`, tokens, auth-state e credenciais nunca commitados -- rodar `gitleaks` antes de push
- `toolCallRetries` somente em tools explicitamente idempotentes -- em mutating tools e falha de seguranca
- `src/utils/redaction.ts` e o ponto central de sanitizacao; nao logar args brutos em outros modulos
- Downstream stdio servers: variaveis extras via `inheritEnv`, nao passando `process.env` inteiro

Validar: `npm run type-check && npm run lint && npm run format:check && npm test`
