# MCP Hub Testing Interface

Interactive web UI for exploring and testing the tools exposed by MCP Hub.

## What it is for

The testing interface helps you:

- inspect registered MCP servers,
- browse the aggregated tool catalog,
- filter tools by server, category, or query,
- execute tools with custom parameters,
- validate your own hub configuration during development.

It is generic to whatever downstream MCP servers your local `hub-config.json` registers.

## Quick start

### 1. Install dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Start the interface

Option A — start both services:

```bash
npm run dev
```

Option B — start separately:

```bash
# Terminal 1
cd backend
npm run dev

# Terminal 2
cd frontend
npm run dev
```

### 3. Open the UI

Visit: http://localhost:5173

## Backend API

The backend runs on port 3000.

### Servers

- `GET /api/servers` — list all configured servers
- `GET /api/servers/:serverId/tools` — list tools for a server

### Tools

- `GET /api/tools` — list all aggregated tools
- `GET /api/tools/:serverId/:toolName` — get tool details

### Execution

- `POST /api/execute` — execute a tool

Example request:

```json
{
  "serverId": "docs-server",
  "toolName": "search_documents",
  "parameters": {
    "query": "onboarding",
    "limit": 5
  }
}
```

### Health

- `GET /api/health` — backend health status

## Architecture

```text
testing-interface/
├── backend/                 # Express + TypeScript API
│   ├── src/
│   │   ├── server.ts
│   │   ├── routes/
│   │   ├── integration/
│   │   └── types/
│   └── package.json
├── frontend/               # React + Vite + TypeScript
│   ├── src/
│   │   ├── App.tsx
│   │   ├── components/
│   │   ├── lib/
│   │   └── App.css
│   └── package.json
└── README.md
```

## Frontend capabilities

### Dashboard

Overview of:

- active / connected servers,
- total tool count,
- distribution by server,
- health indicators.

### Server list

Per-server visibility into:

- connection status,
- tool count,
- protocol,
- health state.

### Tool browser

Browse with:

- search by name or description,
- filters by server and category,
- tool cards,
- quick navigation into testing.

### Tool tester

Interactive execution with:

- schema-driven forms,
- support for different parameter types,
- result rendering,
- error display.

## Development

### Backend

```bash
cd backend
npm run dev
npm run build
npm start
```

### Frontend

```bash
cd frontend
npm run dev
npm run build
npm run preview
```

## Notes

- The backend can use mock data during initial UI development.
- For real hub integration, point it at a real MCP Hub instance and configured `hub-config.json`.
- The interface is intentionally server-agnostic and should work with any MCP mix exposed by the hub.

## Troubleshooting

Backend will not start:

- verify port 3000 is free,
- install dependencies.

Frontend will not connect:

- verify the backend is running on http://localhost:3000,
- check backend CORS settings.

Tools do not appear:

- inspect backend logs,
- confirm `hub-config.json` contains enabled downstream servers,
- confirm the hub can connect to those downstream MCP servers.

## License

MIT
