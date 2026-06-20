# CLAUDE.md -- mcp-hub

Gateway TypeScript que agrega, roteia e expoe ferramentas de multiplos servidores MCP downstream em uma superficie unificada.

## O que e

`mcp-hub` e um servidor MCP que atua como gateway: registra N servidores MCP downstream (stdio ou HTTP/SSE) e expoe quatro hub-native tools (`list-all-tools`, `call-tool`, `smart-search`, `get-recommendations`) para qualquer cliente MCP. Consumido pelo Ferd via cliente MCP local (Claude Desktop, LM Studio, ou qualquer cliente compativel). Status: experimental / pre-1.0.

## Stack & estrutura

TypeScript 5 + Node.js 18 + `@modelcontextprotocol/sdk` + Winston + Vitest (unit/integration/e2e/performance)

```
mcp-hub/
  src/
    index.ts              # entry point MCP + handlers dos hub-native tools
    registry/             # ciclo de vida, conexao e tool-discovery de downstream servers
    intelligence/         # scoring de smart-search e recommendations
    cache/                # cache de resultados e metadados
    utils/
      redaction.ts        # sumariza args sem logar valores sensiveis
      env-loader.ts       # carrega .env e envFile dos servers
  tests/
    unit/                 # testes unitarios por modulo
    integration/          # testes de integracao (hub + servidor mock)
    e2e/                  # testes end-to-end
    performance/          # benchmarks de latencia e throughput
    fixtures/             # mocks e fixtures compartilhados
  hub-config.example.json # template de config (copiar para hub-config.json local)
  .env.example            # variaveis de ambiente documentadas
  tsconfig.json
  vitest.*.config.ts
```

## Como rodar / validar

```bash
# Setup
npm ci
cp hub-config.example.json hub-config.json   # editar com servidores reais
# opcional: cp .env.example .env

# Dev (tsx, sem build)
npm run dev

# Producao (requer build)
npm run build
HUB_CONFIG="$PWD/hub-config.json" npm start

# Validar antes de DONE (obrigatorio)
npm run type-check
npm run lint
npm run format:check
npm test
```

## Invariantes / regras criticas

- `hub-config.json` e `hub-config.*.json` NUNCA entram no git -- contem paths e env-refs de maquina; usar `hub-config.example.json` como modelo.
- `.env` e arquivos de credencial (`tokens/`, `auth-state/`, `credentials.json`, `token.json`) NUNCA commitados -- rodar `gitleaks` antes de qualquer push.
- `toolCallRetries` so deve ser habilitado para tools explicitamente idempontentes; usar em mutating tools e bug critico de seguranca.
- Downstream stdio servers herdam apenas o baseline de runtime por padrao; variaveis extras devem ser declaradas em `inheritEnv` -- nunca passar `process.env` inteiro.
- `src/utils/redaction.ts` e o ponto central de sanitizacao; nao logar args brutos em nenhum outro modulo.
- Para validar o pacote npm antes de publicar: `npm pack --dry-run --json` -- garantir que `testing-interface/`, `tests/`, `logs/` e configs locais nao entrem no tarball.

## Gotchas

- `HUB_CONFIG` deve apontar para um path absoluto ou relativo valido; se nao definido, o hub tenta paths canonicos locais -- falha silenciosa se nenhum existir.
- `npm run clean && npm run build` e necessario apos mudancas de estrutura de modulo; `dist/` stale causa erros de importacao dificeis de diagnosticar.
- `npm run dev` usa `tsx` (sem build); `npm start` usa `dist/` compilado -- comportamentos podem divergir se o build estiver desatualizado.
- Testes de e2e e performance requerem que o ambiente tenha pelo menos um servidor MCP mock configurado (ver `tests/fixtures/`).

## Documentacao canonica

- Tracking: Linear team JAR
