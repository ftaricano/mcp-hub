// Server routes
import { Router } from 'express';
import type { Request, Response } from 'express';
import { HubClient } from '../integration/hub-client.js';
import type { ApiResponse, ServerInfo } from '../types/api.js';

export function createServerRoutes(hubClient: HubClient): Router {
  const router = Router();

  /**
   * GET /api/servers
   * List all configured servers with status
   */
  router.get('/', async (req: Request, res: Response) => {
    try {
      const servers = await hubClient.getServers();

      // Get tool counts for each server
      const serversWithCounts = await Promise.all(
        servers.map(async (server) => {
          const tools = await hubClient.getToolsForServer(server.id);
          return {
            ...server,
            toolCount: tools.length
          };
        })
      );

      const response: ApiResponse<{ servers: ServerInfo[]; total: number }> = {
        success: true,
        data: {
          servers: serversWithCounts,
          total: serversWithCounts.length
        },
        timestamp: new Date().toISOString()
      };

      res.json(response);
    } catch (error: any) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'SERVER_LIST_ERROR',
          message: error.message || 'Failed to list servers'
        },
        timestamp: new Date().toISOString()
      };
      res.status(500).json(response);
    }
  });

  /**
   * GET /api/servers/:serverId/tools
   * Get tools for a specific server
   */
  router.get('/:serverId/tools', async (req: Request, res: Response) => {
    try {
      const { serverId } = req.params;
      const tools = await hubClient.getToolsForServer(serverId);

      const response: ApiResponse = {
        success: true,
        data: {
          serverId,
          serverName: serverId,
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
          code: 'TOOLS_LIST_ERROR',
          message: error.message || 'Failed to list tools'
        },
        timestamp: new Date().toISOString()
      };
      res.status(500).json(response);
    }
  });

  return router;
}
