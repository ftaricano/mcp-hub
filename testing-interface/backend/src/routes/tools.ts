// Tools routes
import { Router } from 'express';
import type { Request, Response } from 'express';
import { HubClient } from '../integration/hub-client.js';
import type { ApiResponse } from '../types/api.js';

export function createToolRoutes(hubClient: HubClient): Router {
  const router = Router();

  /**
   * GET /api/tools
   * List all tools across all servers
   */
  router.get('/', async (req: Request, res: Response) => {
    try {
      const { search, category, server } = req.query;

      let tools = await hubClient.discoverAllTools();

      // Apply filters
      if (search) {
        const searchLower = String(search).toLowerCase();
        tools = tools.filter(tool =>
          tool.toolName.toLowerCase().includes(searchLower) ||
          tool.description.toLowerCase().includes(searchLower) ||
          tool.ptName?.toLowerCase().includes(searchLower)
        );
      }

      if (category) {
        tools = tools.filter(tool => tool.category === category);
      }

      if (server) {
        tools = tools.filter(tool => tool.serverId === server);
      }

      const response: ApiResponse = {
        success: true,
        data: {
          tools,
          total: tools.length,
          hasMore: false
        },
        timestamp: new Date().toISOString()
      };

      res.json(response);
    } catch (error: any) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'TOOLS_DISCOVERY_ERROR',
          message: error.message || 'Failed to discover tools'
        },
        timestamp: new Date().toISOString()
      };
      res.status(500).json(response);
    }
  });

  /**
   * GET /api/tools/:serverId/:toolName
   * Get detailed information about a specific tool
   */
  router.get('/:serverId/:toolName', async (req: Request, res: Response) => {
    try {
      const { serverId, toolName } = req.params;
      const tools = await hubClient.getToolsForServer(serverId);
      const tool = tools.find(t => t.toolName === toolName);

      if (!tool) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'TOOL_NOT_FOUND',
            message: `Tool ${toolName} not found on server ${serverId}`
          },
          timestamp: new Date().toISOString()
        };
        return res.status(404).json(response);
      }

      const response: ApiResponse = {
        success: true,
        data: tool,
        timestamp: new Date().toISOString()
      };

      res.json(response);
    } catch (error: any) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'TOOL_INFO_ERROR',
          message: error.message || 'Failed to get tool information'
        },
        timestamp: new Date().toISOString()
      };
      res.status(500).json(response);
    }
  });

  return router;
}
