/**
 * Secure Configuration Loader for MCP Hub
 * Integrates with credentials manager and provides safe config loading
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { z } from 'zod';
import { CredentialsManager, createCredentialsManager } from './credentials.js';

// Server configuration schema
const ServerConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  command: z.string().optional(),
  args: z.array(z.string()).default([]),
  env: z.record(z.string()).default({}),
  protocol: z.enum(['stdio', 'http']).default('stdio'),
  url: z.string().optional(),
  enabled: z.boolean().default(true),
  timeout: z.number().default(60000),
  retries: z.number().default(3),
  tags: z.array(z.string()).default([]),
});

const HubConfigSchema = z.object({
  servers: z.array(ServerConfigSchema),
  cache: z.object({
    enabled: z.boolean().default(true),
    ttl: z.number().default(600000),
    youtube_transcription_ttl: z.number().default(3600000),
    token_cache_ttl: z.number().default(86400000),
  }).default({}),
  security: z.object({
    rate_limit: z.number().default(200),
    validate_schemas: z.boolean().default(true),
    youtube_rate_limit: z.number().default(50),
    youtube_quota_management: z.boolean().default(true),
  }).default({}),
  logging: z.object({
    level: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
    format: z.enum(['json', 'pretty']).default('json'),
  }).default({}),
});

export type ServerConfig = z.infer<typeof ServerConfigSchema>;
export type HubConfig = z.infer<typeof HubConfigSchema>;

export interface SecureConfigOptions {
  configPath?: string;
  environment?: 'development' | 'production' | 'staging';
  validateCredentials?: boolean;
  fallbackToEnv?: boolean;
}

export class SecureConfigLoader {
  private credentialsManager: CredentialsManager;
  private config: HubConfig | null = null;
  private options: SecureConfigOptions;

  constructor(options: SecureConfigOptions = {}) {
    this.options = {
      environment: 'development',
      validateCredentials: true,
      fallbackToEnv: true,
      ...options,
    };
    
    this.credentialsManager = createCredentialsManager(this.options.environment);
  }

  /**
   * Load and validate configuration
   */
  async loadConfig(): Promise<HubConfig> {
    // Step 1: Load credentials from environment
    await this.credentialsManager.loadFromEnvironment();

    // Step 2: Load base configuration
    const baseConfig = await this.loadBaseConfig();

    // Step 3: Apply secure environment variables to servers
    const secureConfig = this.applySecurity(baseConfig);

    // Step 4: Validate configuration
    const validatedConfig = this.validateConfig(secureConfig);

    // Step 5: Validate credentials if required
    if (this.options.validateCredentials) {
      this.validateCredentials(validatedConfig);
    }

    this.config = validatedConfig;
    return validatedConfig;
  }

  /**
   * Load base configuration from file or use default
   */
  private async loadBaseConfig(): Promise<any> {
    if (this.options.configPath) {
      try {
        const configContent = await fs.readFile(this.options.configPath, 'utf-8');
        return JSON.parse(configContent);
      } catch (error) {
        console.warn(`⚠️ Could not load config from ${this.options.configPath}: ${error}`);
        
        if (!this.options.fallbackToEnv) {
          throw new Error(`Configuration file required but not found: ${this.options.configPath}`);
        }
      }
    }

    // Return default configuration
    return this.getDefaultConfig();
  }

  /**
   * Apply security by replacing credentials in config with environment variables
   */
  private applySecurity(baseConfig: any): any {
    const secureConfig = JSON.parse(JSON.stringify(baseConfig)); // Deep clone

    // Process each server configuration
    for (const server of secureConfig.servers) {
      if (server.enabled) {
        // Get secure environment variables for this server
        const secureEnv = this.credentialsManager.getServerEnvironment(server.id);
        
        // Remove any hardcoded credentials and replace with secure ones
        server.env = {
          ...this.sanitizeEnvironment(server.env),
          ...secureEnv,
        };

        // Add additional secure environment variables
        if (this.options.environment === 'production') {
          server.env.NODE_ENV = 'production';
          server.env.NODE_OPTIONS = server.env.NODE_OPTIONS || '--max-old-space-size=2048';
        }
      }
    }

    return secureConfig;
  }

  /**
   * Remove hardcoded credentials from environment object
   */
  private sanitizeEnvironment(env: Record<string, string>): Record<string, string> {
    const sanitized: Record<string, string> = {};
    const credentialKeys = new Set([
      'MICROSOFT_GRAPH_CLIENT_SECRET',
      'TRELLO_TOKEN',
      'SPOTIFY_CLIENT_SECRET',
      'YOUTUBE_CLIENT_SECRET',
      'GITHUB_TOKEN',
      'NOTION_TOKEN',
      'WHATSAPP_ACCESS_TOKEN',
    ]);

    for (const [key, value] of Object.entries(env)) {
      // Skip credential keys or obvious placeholder values
      if (credentialKeys.has(key) || 
          value.includes('YOUR_') || 
          value.includes('SEU_') ||
          value === 'your_token_here' ||
          value === 'your_client_secret_here') {
        console.warn(`🔒 Removing hardcoded credential: ${key}`);
        continue;
      }

      sanitized[key] = value;
    }

    return sanitized;
  }

  /**
   * Validate configuration against schema
   */
  private validateConfig(config: any): HubConfig {
    try {
      return HubConfigSchema.parse(config);
    } catch (error) {
      console.error('❌ Configuration validation failed:', error);
      throw new Error(`Invalid configuration: ${error}`);
    }
  }

  /**
   * Validate that all required credentials are available
   */
  private validateCredentials(config: HubConfig): void {
    const enabledServers = config.servers
      .filter(s => s.enabled)
      .map(s => s.id);

    const validation = this.credentialsManager.validateCredentials(enabledServers);

    if (!validation.valid) {
      console.error('❌ Missing required credentials:');
      validation.missing.forEach(missing => console.error(`   - ${missing}`));
      
      console.log('\n📝 To fix this, add the missing credentials to your environment:');
      console.log(this.credentialsManager.generateSecureConfig());
      
      throw new Error(`Missing required credentials: ${validation.missing.join(', ')}`);
    }

    if (validation.warnings.length > 0) {
      console.warn('⚠️ Credential warnings:');
      validation.warnings.forEach(warning => console.warn(`   - ${warning}`));
    }

    console.log(`✅ All credentials validated for ${enabledServers.length} enabled servers`);
  }

  /**
   * Get default configuration template
   */
  private getDefaultConfig(): any {
    return {
      servers: [
        {
          id: 'trello',
          name: 'Trello',
          command: '/opt/homebrew/bin/mcp-server-trello',
          args: [],
          env: {},
          protocol: 'stdio',
          enabled: true,
          timeout: 45000,
          retries: 5,
          tags: ['project-management', 'kanban', 'boards'],
        },
        {
          id: 'email-advanced',
          name: 'Email Advanced',
          command: '/usr/local/bin/node',
          args: ['/Users/fernandotaricano/mcp/mcp-email/dist/index.js'],
          env: {},
          protocol: 'stdio',
          enabled: true,
          timeout: 60000,
          retries: 3,
          tags: ['email', 'outlook', 'advanced'],
        },
        {
          id: 'spotify',
          name: 'Spotify',
          command: '/usr/local/bin/node',
          args: ['/Users/fernandotaricano/mcp/mcp-spotify/dist/index.js'],
          env: {
            SPOTIFY_REDIRECT_URI: 'http://localhost:3000/callback',
            CALLBACK_PORT: '3000',
          },
          protocol: 'stdio',
          enabled: true,
          timeout: 60000,
          retries: 3,
          tags: ['music', 'spotify', 'streaming'],
        },
        {
          id: 'onedrive-sharepoint',
          name: 'OneDrive & SharePoint',
          command: '/usr/local/bin/node',
          args: ['/Users/fernandotaricano/mcp/mcp-onedrive-sharepoint/build/index.js'],
          env: {
            TOKEN_STORAGE_SERVICE: 'mcp-onedrive-sharepoint',
            CACHE_DURATION: '3600',
            DEBUG: 'false',
            LOG_LEVEL: 'info',
            RATE_LIMIT_PER_MINUTE: '60',
            BATCH_SIZE: '20',
          },
          protocol: 'stdio',
          enabled: true,
          timeout: 60000,
          retries: 3,
          tags: ['storage', 'onedrive', 'sharepoint', 'files'],
        },
        {
          id: 'notion',
          name: 'Notion Enhanced',
          command: '/usr/local/bin/node',
          args: ['/Users/fernandotaricano/mcp/mcp-notion/dist/index.js'],
          env: {
            DEBUG: 'false',
            LOG_LEVEL: 'info',
          },
          protocol: 'stdio',
          enabled: true,
          timeout: 45000,
          retries: 3,
          tags: ['notion', 'notes', 'database', 'documentation'],
        },
        {
          id: 'youtube',
          name: 'YouTube',
          command: '/usr/local/bin/node',
          args: ['/Users/fernandotaricano/mcp/mcp-youtube/dist/index.js'],
          env: {
            YOUTUBE_REDIRECT_URI: 'http://localhost:8080/callback',
            YOUTUBE_SCOPES: 'https://www.googleapis.com/auth/youtube.readonly,https://www.googleapis.com/auth/youtube.upload,https://www.googleapis.com/auth/youtube,https://www.googleapis.com/auth/youtubepartner,https://www.googleapis.com/auth/yt-analytics.readonly',
            TOKEN_STORAGE_PATH: '/Users/fernandotaricano/.youtube-mcp/tokens.json',
            API_TIMEOUT: '60000',
            API_RETRIES: '5',
            LOG_LEVEL: 'info',
            CACHE_ENABLED: 'true',
            FORCE_TOKEN_REFRESH: 'true',
            AUTO_REFRESH_TOKENS: 'true',
          },
          protocol: 'stdio',
          enabled: true,
          timeout: 90000,
          retries: 5,
          tags: ['youtube', 'video', 'streaming', 'analytics'],
        },
        {
          id: 'github',
          name: 'GitHub',
          command: '/usr/local/bin/node',
          args: ['/Users/fernandotaricano/mcp/mcp-github/dist/index.js'],
          env: {
            CACHE_ENABLED: 'true',
            CACHE_TTL: '300000',
            RATE_LIMIT_BUFFER: '100',
            DEFAULT_PER_PAGE: '30',
            GITHUB_TIMEOUT: '30000',
          },
          protocol: 'stdio',
          enabled: true,
          timeout: 60000,
          retries: 3,
          tags: ['github', 'git', 'repository', 'development'],
        },
      ],
      cache: {
        enabled: true,
        ttl: 600000,
        youtube_transcription_ttl: 3600000,
        token_cache_ttl: 86400000,
      },
      security: {
        rate_limit: 200,
        validate_schemas: true,
        youtube_rate_limit: 50,
        youtube_quota_management: true,
      },
      logging: {
        level: 'info',
        format: 'json',
      },
    };
  }

  /**
   * Get current loaded configuration
   */
  getConfig(): HubConfig {
    if (!this.config) {
      throw new Error('Configuration not loaded. Call loadConfig() first.');
    }
    return this.config;
  }

  /**
   * Get credentials manager instance
   */
  getCredentialsManager(): CredentialsManager {
    return this.credentialsManager;
  }

  /**
   * Save current configuration to file (sanitized)
   */
  async saveConfig(filePath: string): Promise<void> {
    if (!this.config) {
      throw new Error('No configuration to save. Load configuration first.');
    }

    // Create sanitized version without credentials
    const sanitizedConfig = JSON.parse(JSON.stringify(this.config));
    
    for (const server of sanitizedConfig.servers) {
      server.env = this.sanitizeEnvironment(server.env);
      
      // Add placeholder comments for required credentials
      if (server.enabled) {
        const requiredCreds = this.getRequiredCredentials(server.id);
        if (requiredCreds.length > 0) {
          server._required_env = requiredCreds;
        }
      }
    }

    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });

    await fs.writeFile(
      filePath,
      JSON.stringify(sanitizedConfig, null, 2),
      { mode: 0o600 }
    );

    console.log(`✅ Saved sanitized configuration to: ${filePath}`);
  }

  /**
   * Get required credentials for a server
   */
  private getRequiredCredentials(serverId: string): string[] {
    const requirements: Record<string, string[]> = {
      'trello': ['TRELLO_API_KEY', 'TRELLO_TOKEN'],
      'email-advanced': ['MICROSOFT_GRAPH_CLIENT_ID', 'MICROSOFT_GRAPH_CLIENT_SECRET', 'MICROSOFT_GRAPH_TENANT_ID'],
      'onedrive-sharepoint': ['MICROSOFT_GRAPH_CLIENT_ID', 'MICROSOFT_GRAPH_CLIENT_SECRET', 'MICROSOFT_GRAPH_TENANT_ID'],
      'spotify': ['SPOTIFY_CLIENT_ID', 'SPOTIFY_CLIENT_SECRET'],
      'youtube': ['YOUTUBE_CLIENT_ID', 'YOUTUBE_CLIENT_SECRET'],
      'github': ['GITHUB_TOKEN'],
      'notion': ['NOTION_TOKEN'],
      'whatsapp': ['WHATSAPP_ACCESS_TOKEN', 'WHATSAPP_PHONE_NUMBER_ID'],
    };

    return requirements[serverId] || [];
  }
}

/**
 * Factory function to create secure config loader
 */
export function createSecureConfig(options: SecureConfigOptions = {}): SecureConfigLoader {
  return new SecureConfigLoader(options);
}