# MCP Hub

Status: experimental

MCP Hub is a generic aggregation layer for Model Context Protocol servers. It does not ship with built-in downstream MCPs. Instead, you register any MCP servers you already run and expose them through one shared hub for discovery, routing, and recommendations.

## What this repo is

Use MCP Hub when you want one MCP entry point in front of many independent MCP servers.

The hub can:
- aggregate tool metadata across registered MCP servers,
- route tool calls to the correct downstream server,
- search the combined tool catalog with natural-language queries,
- return recommendation-style results based on the available tool metadata.

The repository also includes caching, retries, typed configuration, and unit/integration/e2e/performance test coverage.

## What this repo is not

- It is not a bundle of preinstalled MCP integrations.
- It is not coupled to any single vendor, app, or workflow.
- Example server IDs in this repo are placeholders or test fixtures, not embedded product dependencies.

## Quickstart

Prerequisites:
- Node.js 18+
- One or more MCP servers you can run locally or reach over HTTP/SSE

1. Install dependencies

```bash
git clone https://github.com/ftaricano/mcp-hub.git
cd mcp-hub
npm install
```

2. Create a local hub config

```bash
cp hub-config.example.json hub-config.json
```

Edit `hub-config.json` so each entry points to real MCP servers in your environment.

Minimal example:

```json
{
  "servers": [
    {
      "id": "docs-server",
      "name": "Documentation MCP Server",
      "command": "node",
      "args": ["/absolute/path/to/your-docs-mcp/dist/index.js"],
      "env": {
        "DOCS_API_KEY": "replace_with_real_secret_if_needed"
      },
      "envFile": "/absolute/path/to/your-docs-mcp/.env",
      "inheritEnv": ["DOCS_REGION"],
      "protocol": "stdio",
      "enabled": true,
      "timeout": 30000,
      "retries": 2,
      "toolCallRetries": {
        "enabled": true,
        "maxAttempts": 2,
        "retryableTools": ["search_docs"]
      },
      "tags": ["docs", "knowledge"]
    }
  ],
  "cache": {
    "enabled": true,
    "ttl": 300000
  },
  "security": {
    "rate_limit": 100,
    "validate_schemas": true
  },
  "logging": {
    "level": "info",
    "format": "json"
  }
}
```

3. Build the hub

```bash
npm run build
```

4. Register the hub in your MCP client

```json
{
  "mcpServers": {
    "hub": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-hub/dist/index.js"],
      "env": {
        "HUB_CONFIG": "/absolute/path/to/mcp-hub/hub-config.json"
      }
    }
  }
}
```

## Hub-native interface

MCP Hub adds four hub-native commands on top of the downstream servers you register:
- `list-all-tools` to browse the aggregated catalog,
- `call-tool` to execute a specific tool on a specific downstream server,
- `smart-search` to rank tools for a natural-language query,
- `get-recommendations` to return recommendation-oriented results.

## MCPorter pilot

This repo also carries a local MCPorter pilot for the Ferd tools workspace. MCPorter is used beside MCP Hub for CLI-friendly inventory, smoke checks, and generated TypeScript surfaces; it does not replace the existing hand-written domain CLIs.

```bash
npm run mcporter:list
npm run mcporter:smoke
```

See `docs/mcporter.md` for the policy, active pilot servers, and backlog of local MCPs to promote after auth/build checks.

## Configuration notes

- `HUB_CONFIG` can point to any JSON file matching the hub config shape.
- If `HUB_CONFIG` is not set, the hub also attempts to discover `hub-config.json` in common local paths.
- Registered servers can use `stdio` or `http` entries.
- Downstream stdio servers only inherit a small runtime-safe environment baseline (`PATH`, temp/home/shell locale essentials). Use `inheritEnv` to pass through additional parent variables explicitly, and `env`/`envFile` for server-specific credentials.
- Tool calls do not retry by default. To opt in safely for known-idempotent tools, use `toolCallRetries.retryableTools` with an explicit `maxAttempts`.
- The hub only exposes what you configure; no downstream MCP is bundled automatically.

## Typical use cases

- keep client configuration centered on one hub instead of many separate server entries,
- expose a smaller operational surface when downstream servers publish many tools,
- search for the right server/tool combination before making a call,
- compose internal, local, or third-party MCP servers behind one MCP endpoint.

## Development

```bash
npm run build
npm run lint
npm run type-check
npm test
```

## License

MIT
