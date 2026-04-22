# MCP Hub

Status: experimental

MCP gateway that consolidates multiple servers behind a shared discovery, routing, and recommendation layer.

## Why this exists

Some MCP setups become hard to operate once you have several servers, overlapping tools, and no shared discovery layer. This project sits in front of multiple MCP servers and adds a hub-native workflow for discovery, routing, and recommendations.

In practice, the hub is useful when you want to:
- browse a combined catalog of tools across servers,
- route calls to multiple MCP servers from one entry point,
- add lightweight discovery and recommendation workflows on top of registered servers.

## What it does

The hub registers downstream MCP servers, reads their tools, and adds four hub-native commands:
- `list-all-tools` to browse the combined tool catalog,
- `call-tool` to execute a tool on a selected server,
- `smart-search` to search for tools from a natural-language query,
- `get-recommendations` to return recommendation-oriented results.

The codebase also includes caching, retry handling, typed configuration, and multiple Vitest suites.

## Quickstart

Prerequisites:
- Node.js 18+
- One or more MCP servers you can launch locally

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

Edit `hub-config.json` so each entry points to a real MCP server on your machine.

Minimal example:

```json
{
  "servers": [
    {
      "id": "notion",
      "name": "Notion",
      "command": "node",
      "args": ["/absolute/path/to/mcp-notion/dist/index.js"],
      "env": {
        "NOTION_TOKEN": "your_notion_integration_token"
      },
      "protocol": "stdio",
      "enabled": true,
      "timeout": 30000,
      "retries": 2,
      "tags": ["knowledge", "docs"]
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

4. Add it to your MCP client

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

## Typical use cases

- keep a client configuration centered on one hub instead of many separate servers,
- expose a smaller interface when underlying servers publish a large tool surface,
- search for the right server/tool combination before making a call,
- unify personal automation servers behind one MCP entry point.

## Hub interface

### `list-all-tools`
Returns the aggregated tool catalog across registered servers, with optional filtering.

### `call-tool`
Calls a specific tool on a specific downstream server.

### `smart-search`
Runs a natural-language query against the available tool metadata and returns ranked matches.

### `get-recommendations`
Returns recommendation-style results based on category and usage-oriented parameters.

## Configuration notes

- `HUB_CONFIG` can point to a JSON file with the registered servers.
- If `HUB_CONFIG` is not set, the hub also attempts to discover `hub-config.json` in common local paths.
- The current TypeScript types expect `servers` as an array of server definitions.
- Downstream servers can use `stdio` or `http` entries in the config type, although the main local examples use `stdio`.

## Project status

This repository already includes unit, integration, e2e, and performance test targets, but the package version is still `0.1.0` and the project is best described as experimental rather than production-ready.

## Development

```bash
npm run build
npm run lint
npm run type-check
npm test
```

## License

MIT
