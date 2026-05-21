import { exec } from 'child_process';
import { promisify } from 'util';
import { ChildProcess } from 'child_process';
import { createLogger } from './logger.js';

const execAsync = promisify(exec);
const logger = createLogger();

export class ProcessManager {
  private static instance: ProcessManager;
  private managedProcesses: Map<string, ChildProcess> = new Map();
  private cleanupRegistered = false;

  private constructor() {
    this.registerCleanupHandlers();
  }

  public static getInstance(): ProcessManager {
    if (!ProcessManager.instance) {
      ProcessManager.instance = new ProcessManager();
    }
    return ProcessManager.instance;
  }

  /**
   * Clean up orphaned MCP processes before starting
   */
  async cleanupOrphans(): Promise<void> {
    try {
      logger.info('Cleaning up orphaned MCP processes...');

      // Find all node processes running MCP servers
      const { stdout } = await execAsync(
        'ps aux | grep -E "node.*mcp.*index.js" | grep -v grep | grep -v mcp-hub || true'
      );

      const lines = stdout
        .trim()
        .split('\n')
        .filter((line) => line);

      if (lines.length > 0) {
        logger.warn(`Found ${lines.length} orphaned MCP processes`);

        // Extract PIDs and kill them
        const pids = lines
          .map((line) => {
            const parts = line.trim().split(/\s+/);
            return parts[1]; // PID is the second column
          })
          .filter((pid) => pid && !isNaN(Number(pid)));

        if (pids.length > 0) {
          logger.info(`Killing orphaned processes: ${pids.join(', ')}`);
          await execAsync(`kill -TERM ${pids.join(' ')} 2>/dev/null || true`);

          // Wait a moment for graceful shutdown
          await new Promise((resolve) => setTimeout(resolve, 1000));

          // Force kill any remaining
          await execAsync(`kill -9 ${pids.join(' ')} 2>/dev/null || true`);
        }
      } else {
        logger.info('No orphaned MCP processes found');
      }
    } catch (error) {
      logger.error('Error cleaning up orphaned processes:', error);
    }
  }

  /**
   * Register a process to be managed
   */
  registerProcess(serverId: string, process: ChildProcess): void {
    // Clean up any existing process for this server
    this.cleanupProcess(serverId);

    this.managedProcesses.set(serverId, process);
    logger.info(`Registered process for server: ${serverId} (PID: ${process.pid})`);

    // Handle process exit
    process.on('exit', (code, signal) => {
      logger.info(`Process for ${serverId} exited (code: ${code}, signal: ${signal})`);
      this.managedProcesses.delete(serverId);
    });

    process.on('error', (error) => {
      logger.error(`Process error for ${serverId}:`, error);
    });
  }

  /**
   * Clean up a specific server's process
   */
  cleanupProcess(serverId: string): void {
    const process = this.managedProcesses.get(serverId);
    if (process && !process.killed) {
      try {
        logger.info(`Cleaning up process for server: ${serverId} (PID: ${process.pid})`);
        process.kill('SIGTERM');

        // Force kill after timeout
        setTimeout(() => {
          if (!process.killed) {
            process.kill('SIGKILL');
          }
        }, 5000);

        this.managedProcesses.delete(serverId);
      } catch (error) {
        logger.error(`Error cleaning up process for ${serverId}:`, error);
      }
    }
  }

  /**
   * Clean up all managed processes
   */
  async cleanupAll(): Promise<void> {
    logger.info('Cleaning up all managed processes...');

    const promises: Promise<void>[] = [];

    for (const [serverId, process] of this.managedProcesses) {
      promises.push(
        new Promise<void>((resolve) => {
          if (!process.killed) {
            logger.info(`Terminating process for ${serverId} (PID: ${process.pid})`);

            process.once('exit', () => {
              logger.info(`Process for ${serverId} terminated`);
              resolve();
            });

            process.kill('SIGTERM');

            // Force kill after timeout
            setTimeout(() => {
              if (!process.killed) {
                process.kill('SIGKILL');
              }
              resolve();
            }, 5000);
          } else {
            resolve();
          }
        })
      );
    }

    await Promise.all(promises);
    this.managedProcesses.clear();

    // Final cleanup of any remaining orphans
    await this.cleanupOrphans();
  }

  /**
   * Register cleanup handlers for process exit
   */
  private registerCleanupHandlers(): void {
    if (this.cleanupRegistered) return;

    const cleanup = async () => {
      logger.info('Process manager cleanup initiated...');
      await this.cleanupAll();
      process.exit(0);
    };

    // Handle various exit signals
    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
    process.on('SIGHUP', cleanup);
    process.on('exit', () => {
      // Synchronous cleanup as last resort
      for (const [serverId, proc] of this.managedProcesses) {
        if (!proc.killed) {
          try {
            proc.kill('SIGKILL');
          } catch (error) {
            // Ignore errors during final cleanup
          }
        }
      }
    });

    this.cleanupRegistered = true;
    logger.info('Process cleanup handlers registered');
  }

  /**
   * Check if a server has an active process
   */
  hasProcess(serverId: string): boolean {
    const process = this.managedProcesses.get(serverId);
    return !!process && !process.killed;
  }

  /**
   * Get process info for monitoring
   */
  getProcessInfo(): Array<{ serverId: string; pid: number | undefined; killed: boolean }> {
    const info: Array<{ serverId: string; pid: number | undefined; killed: boolean }> = [];

    for (const [serverId, process] of this.managedProcesses) {
      info.push({
        serverId,
        pid: process.pid,
        killed: process.killed,
      });
    }

    return info;
  }
}

export default ProcessManager.getInstance();
