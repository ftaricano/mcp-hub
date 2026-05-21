import chalk from 'chalk';

// ANSI escape codes for better formatting
const CLEAR_LINE = '\x1b[2K\r';
const MOVE_UP = '\x1b[1A';

export class DebugLogger {
  private servers: Map<string, any> = new Map();
  private tools: Map<string, any[]> = new Map();
  private recentActivity: Array<{ time: string; message: string }> = [];
  private isMonitoring = false;

  constructor() {
    // Initialize
  }

  public logStartup() {
    console.clear();
    console.log(
      chalk.green.bold('\n╔════════════════════════════════════════════════════════════╗')
    );
    console.log(
      chalk.green.bold('║                    MCP HUB DEBUG MONITOR                      ║')
    );
    console.log(
      chalk.green.bold('╚════════════════════════════════════════════════════════════╝\n')
    );
    console.log(chalk.white('  Started at: ') + chalk.cyan(new Date().toLocaleString()));
    console.log(chalk.white('  PID: ') + chalk.cyan(process.pid));
    console.log(chalk.white('  Node: ') + chalk.cyan(process.version));
    console.log(chalk.gray('\n  Waiting for servers to connect...\n'));
  }

  public updateServerStatus(
    serverId: string,
    status: 'connected' | 'disconnected' | 'error',
    toolCount?: number
  ) {
    this.servers.set(serverId, {
      status,
      toolCount: toolCount || 0,
      lastUpdate: new Date().toLocaleTimeString(),
    });
    this.displayStatus();
  }

  public updateTools(serverName: string, tools: any[]) {
    this.tools.set(serverName, tools);
    this.addActivity(`Loaded ${tools.length} tools from ${serverName}`);
    this.displayStatus();
  }

  public logToolCall(serverName: string, toolName: string, success: boolean, duration?: number) {
    const status = success ? chalk.green('✓') : chalk.red('✗');
    const message = `${status} ${serverName}/${toolName} ${duration ? `(${duration}ms)` : ''}`;
    this.addActivity(message);
    this.displayStatus();
  }

  private addActivity(message: string) {
    const time = new Date().toLocaleTimeString();
    this.recentActivity.push({ time, message });
    if (this.recentActivity.length > 10) {
      this.recentActivity.shift();
    }
  }

  private displayStatus() {
    if (!this.isMonitoring) return;

    // Clear console and redraw
    console.clear();

    // Header
    console.log(
      chalk.cyan.bold('\n╔════════════════════════════════════════════════════════════╗')
    );
    console.log(
      chalk.cyan.bold('║                    MCP HUB LIVE STATUS                        ║')
    );
    console.log(
      chalk.cyan.bold('╚════════════════════════════════════════════════════════════╝\n')
    );

    // Server Status
    console.log(chalk.yellow.bold('📡 CONNECTED SERVERS:'));
    console.log(chalk.gray('─'.repeat(60)));

    if (this.servers.size === 0) {
      console.log(chalk.gray('  No servers connected yet...'));
    } else {
      this.servers.forEach((info, serverId) => {
        const statusIcon =
          info.status === 'connected' ? '🟢' : info.status === 'error' ? '🔴' : '🟡';
        const statusColor =
          info.status === 'connected'
            ? chalk.green
            : info.status === 'error'
              ? chalk.red
              : chalk.yellow;

        console.log(
          `  ${statusIcon} ${chalk.white(serverId.padEnd(25))} ${statusColor(info.status.padEnd(12))} ${chalk.gray(`${info.toolCount} tools`)}`
        );
      });
    }

    // Tools Summary
    console.log(chalk.yellow.bold('\n🔧 AVAILABLE TOOLS:'));
    console.log(chalk.gray('─'.repeat(60)));

    let totalTools = 0;
    this.tools.forEach((tools, serverName) => {
      totalTools += tools.length;
      console.log(
        `  ${chalk.cyan(serverName.padEnd(25))} ${chalk.white(tools.length.toString().padStart(3))} tools`
      );

      // Show first 3 tools as preview
      tools.slice(0, 3).forEach((tool) => {
        console.log(chalk.gray(`    • ${tool.name}`));
      });
      if (tools.length > 3) {
        console.log(chalk.gray(`    ... and ${tools.length - 3} more`));
      }
    });

    console.log(chalk.gray('─'.repeat(60)));
    console.log(chalk.white.bold(`  Total: ${totalTools} tools across ${this.tools.size} servers`));

    // Recent Activity
    console.log(chalk.yellow.bold('\n📊 RECENT ACTIVITY:'));
    console.log(chalk.gray('─'.repeat(60)));

    if (this.recentActivity.length === 0) {
      console.log(chalk.gray('  No recent activity...'));
    } else {
      this.recentActivity.forEach((activity) => {
        console.log(`  ${chalk.gray(activity.time)} ${activity.message}`);
      });
    }

    // Footer
    console.log(chalk.gray('\n─'.repeat(60)));
    console.log(
      chalk.gray(`Last update: ${new Date().toLocaleTimeString()} | Press Ctrl+C to exit`)
    );
  }

  public startMonitoring() {
    this.isMonitoring = true;
    this.displayStatus();

    // Refresh display every 2 seconds
    setInterval(() => {
      if (this.isMonitoring) {
        this.displayStatus();
      }
    }, 2000);
  }

  public stopMonitoring() {
    this.isMonitoring = false;
  }

  // Simple log methods for non-monitoring mode
  public log(message: string, level: 'info' | 'success' | 'warn' | 'error' = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const prefix = chalk.gray(`[${timestamp}]`);

    switch (level) {
      case 'success':
        console.log(`${prefix} ${chalk.green('✓')} ${message}`);
        break;
      case 'warn':
        console.log(`${prefix} ${chalk.yellow('⚠')} ${message}`);
        break;
      case 'error':
        console.log(`${prefix} ${chalk.red('✗')} ${message}`);
        break;
      default:
        console.log(`${prefix} ${chalk.blue('ℹ')} ${message}`);
    }
  }

  public table(data: any[], columns?: string[]) {
    console.table(data, columns);
  }
}

// Singleton instance
export const debugLogger = new DebugLogger();
