# MCPorter Pilot

This repository keeps MCP Hub as the aggregation layer and uses MCPorter as a portable inspection and wrapper layer for local MCP servers.

## Policy

- MCPorter is optional infrastructure for inventory, smoke tests, generated TypeScript clients, and generated helper CLIs.
- Existing domain CLIs remain canonical when they encode local auth, redaction, path guards, business defaults, or hand-written UX.
- Do not store secrets in `config/mcporter.json`. Keep credentials in each server's existing `.env`, Keychain, token cache, or documented local config.
- Prefer read-only discovery commands for smoke tests. Tool calls that mutate external systems should stay explicit and reviewed.

## Active Pilot Servers

`config/mcporter.json` currently registers only servers that completed a local MCP handshake without adding secrets to this repository.

| Server | Source | Purpose | Notes |
| --- | --- | --- | --- |
| `cpz-sharepoint` | `/Users/jarvis/jarvis-hub/repos/tools/mcp-onedrive-sharepoint/scripts/run-stdio.sh` | Microsoft Graph OneDrive/SharePoint MCP | Requires the SharePoint MCP build artifact and its existing auth path. |
| `whatsapp` | `/Users/jarvis/jarvis-hub/repos/tools/mcp-whatsapp/build/index.js` | WhatsApp messaging MCP | Requires the WhatsApp MCP build artifact and local session state. |

## Commands

From `/Users/jarvis/jarvis-hub/repos/tools/mcp-hub`:

```bash
npm run mcporter:list
npm run mcporter:smoke
```

Direct MCPorter calls:

```bash
npx --yes mcporter list --config config/mcporter.json --json
npx --yes mcporter list cpz-sharepoint --config config/mcporter.json --schema
npx --yes mcporter emit-ts cpz-sharepoint --config config/mcporter.json --mode types --out generated/mcporter/cpz-sharepoint.d.ts
```

Generated files should go under `generated/mcporter/` or another ignored/local path until reviewed for repository fit.

## Candidate Backlog

These local MCPs are good candidates, but they were not added to the active pilot yet:

| Candidate | Current blocker observed during pilot | Next action |
| --- | --- | --- |
| `mcp-gmail-calendar` | MCP connection closed during MCPorter handshake. | Inspect startup requirements and confirm whether `gws-mcp` needs env/bootstrap before `tools/list`. |
| `mcp-outlook` | Startup requires Microsoft Graph env variables. | Add a safe wrapper that loads the existing local `.env` without committing secrets. |
| `mcp-slack` | MCP connection closed during MCPorter handshake. | Inspect built server startup and required Slack env/session state. |
| `mcp-notion` | `dist/index.js` was missing in the local checkout. | Build the repo, then retest the handshake. |

## Fit With MCP Hub

MCP Hub still exposes one MCP entry point in front of downstream servers. MCPorter sits beside it:

- use MCP Hub when an agent needs aggregated search/routing across many servers;
- use MCPorter when a human or script needs a composable CLI, typed surface, or quick server inventory;
- use generated CLIs only after reviewing the generated surface against local auth and safety expectations.
