# LM Studio — Configuring MCP Hub

Use this guide to register MCP Hub in LM Studio as a single entry point for whatever downstream MCP servers you choose to connect.

## What MCP Hub expects

MCP Hub is intentionally generic:

- it does not bundle downstream MCP servers by default,
- it only exposes the servers declared in your `hub-config.json`,
- any server-specific `.env` loading is optional.

If you want per-server `.env` files, the hub now supports a generic naming pattern:

- `MCP_<SERVER_ID>_ENV_PATH`

Normalize the server ID by uppercasing it and replacing non-alphanumeric characters with `_`.

Examples:

- `docs-server` → `MCP_DOCS_SERVER_ENV_PATH`
- `issue-tracker` → `MCP_ISSUE_TRACKER_ENV_PATH`
- `github-enterprise` → `MCP_GITHUB_ENTERPRISE_ENV_PATH`

## JSON to paste into LM Studio

Use one of the following blocks inside your LM Studio config under `mcpServers`.

### Option A — using `node` (stdio)

```json
{
  "mcpServers": {
    "hub": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-hub/dist/index.js"],
      "env": {
        "HUB_CONFIG": "/absolute/path/to/mcp-hub/hub-config.json",
        "MCP_DEBUG": "true",
        "MCP_DOCS_SERVER_ENV_PATH": "/absolute/path/to/docs-server/.env",
        "MCP_ISSUE_TRACKER_ENV_PATH": "/absolute/path/to/issue-tracker/.env"
      }
    }
  }
}
```

### Option B — executable directly (stdio, without `node`)

```json
{
  "mcpServers": {
    "hub": {
      "command": "/absolute/path/to/mcp-hub/dist/index.js",
      "args": [],
      "env": {
        "HUB_CONFIG": "/absolute/path/to/mcp-hub/hub-config.json",
        "MCP_DEBUG": "true",
        "MCP_DOCS_SERVER_ENV_PATH": "/absolute/path/to/docs-server/.env"
      }
    }
  }
}
```

## Minimal example hub-config.json

```json
{
  "servers": [
    {
      "id": "docs-server",
      "name": "Documentation MCP Server",
      "command": "node",
      "args": ["/absolute/path/to/docs-server/dist/index.js"],
      "env": {},
      "protocol": "stdio",
      "enabled": true,
      "timeout": 30000,
      "retries": 2,
      "tags": ["docs", "knowledge"]
    },
    {
      "id": "issue-tracker",
      "name": "Issue Tracker MCP Server",
      "command": "node",
      "args": ["/absolute/path/to/issue-tracker/dist/index.js"],
      "env": {},
      "protocol": "stdio",
      "enabled": true,
      "timeout": 30000,
      "retries": 2,
      "tags": ["tickets", "projects"]
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

## Adding the hub in LM Studio

- Open Settings → Tools / MCP.
- Add a command-based MCP server.
- Paste one of the JSON examples above.
- Save and restart LM Studio if needed.

## Quick validation

After startup, LM Studio should show the hub-native tools:

- `list-all-tools`
- `call-tool`
- `smart-search`
- `get-recommendations`

Then verify that tools from your configured downstream MCPs appear through the hub.

## Troubleshooting

- If the hub starts but downstream tools do not appear, verify `HUB_CONFIG` points to the right file.
- If one downstream server fails, confirm its `command`, `args`, credentials, and optional `MCP_<SERVER_ID>_ENV_PATH` value.
- If you do not use separate `.env` files per server, remove those environment variables and pass config directly in `hub-config.json`.
- If LM Studio still shows stale errors, restart LM Studio after rebuilding the hub.
