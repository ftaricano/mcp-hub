// Main Express server
import express from 'express';
import cors from 'cors';
import { HubClient } from './integration/hub-client.js';
import { createServerRoutes } from './routes/servers.js';
import { createToolRoutes } from './routes/tools.js';
import { createExecuteRoutes } from './routes/execute.js';
import type { ApiResponse } from './types/api.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Initialize Hub Client
const hubClient = new HubClient();

// Routes
app.get('/api/health', (req, res) => {
  const response: ApiResponse = {
    success: true,
    data: {
      status: 'healthy',
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    },
    timestamp: new Date().toISOString()
  };
  res.json(response);
});

app.use('/api/servers', createServerRoutes(hubClient));
app.use('/api/tools', createToolRoutes(hubClient));
app.use('/api/execute', createExecuteRoutes(hubClient));

// 404 handler
app.use((req, res) => {
  const response: ApiResponse = {
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`
    },
    timestamp: new Date().toISOString()
  };
  res.status(404).json(response);
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);

  const response: ApiResponse = {
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: err.message || 'An unexpected error occurred'
    },
    timestamp: new Date().toISOString()
  };

  res.status(500).json(response);
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 MCP Hub Testing API Server`);
  console.log(`📡 Running on http://localhost:${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
  console.log(`📚 API Documentation:`);
  console.log(`   GET  /api/servers          - List all servers`);
  console.log(`   GET  /api/servers/:id/tools - List tools for server`);
  console.log(`   GET  /api/tools            - List all tools`);
  console.log(`   GET  /api/tools/:sid/:tool - Get tool details`);
  console.log(`   POST /api/execute          - Execute a tool\n`);
});

export default app;
