// Execute routes
import { Router } from 'express';
import type { Request, Response } from 'express';
import { HubClient } from '../integration/hub-client.js';
import type { ApiResponse, ExecutionRequest, ExecutionResult } from '../types/api.js';
import { randomUUID } from 'crypto';

export function createExecuteRoutes(hubClient: HubClient): Router {
  const router = Router();

  /**
   * POST /api/execute
   * Execute a tool with parameters
   */
  router.post('/', async (req: Request, res: Response) => {
    const startTime = Date.now();

    try {
      const executionRequest = req.body as ExecutionRequest;
      const { serverId, toolName, parameters, metadata } = executionRequest;

      // Validate request
      if (!serverId || !toolName) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'serverId and toolName are required',
          },
          timestamp: new Date().toISOString(),
        };
        return res.status(400).json(response);
      }

      // Execute tool
      const result = await hubClient.executeTool(serverId, toolName, parameters || {});
      const executionTime = Date.now() - startTime;

      const executionResult: ExecutionResult = {
        executionId: randomUUID(),
        serverId,
        toolName,
        result,
        executionTime,
        timestamp: new Date().toISOString(),
        status: 'success',
      };

      const response: ApiResponse<ExecutionResult> = {
        success: true,
        data: executionResult,
        timestamp: new Date().toISOString(),
      };

      res.json(response);
    } catch (error: any) {
      const executionTime = Date.now() - startTime;

      const executionResult: ExecutionResult = {
        executionId: randomUUID(),
        serverId: req.body.serverId,
        toolName: req.body.toolName,
        result: null,
        executionTime,
        timestamp: new Date().toISOString(),
        status: 'error',
        error: {
          code: 'EXECUTION_ERROR',
          message: error.message || 'Tool execution failed',
          details: error,
        },
      };

      const response: ApiResponse<ExecutionResult> = {
        success: false,
        data: executionResult,
        error: {
          code: 'EXECUTION_ERROR',
          message: error.message || 'Tool execution failed',
        },
        timestamp: new Date().toISOString(),
      };

      res.status(500).json(response);
    }
  });

  return router;
}
