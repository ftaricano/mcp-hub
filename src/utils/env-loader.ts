import { readFileSync, existsSync } from 'fs';
import { parse } from 'dotenv';
import { logger } from './logger.js';

/**
 * Load environment variables from a .env file path
 * @param envPath Path to the .env file
 * @returns Object with environment variables or empty object if file doesn't exist
 */
export function loadEnvFromPath(envPath: string): Record<string, string> {
  try {
    if (!envPath || !existsSync(envPath)) {
      logger.warn(`Environment file not found: ${envPath}`);
      return {};
    }

    const envContent = readFileSync(envPath, 'utf-8');
    const parsed = parse(envContent);
    
    logger.info(`Loaded ${Object.keys(parsed).length} environment variables from ${envPath}`);
    return parsed;
  } catch (error) {
    logger.error(`Failed to load environment from ${envPath}:`, error);
    return {};
  }
}

/**
 * Load environment variables for a specific server based on MCP Hub configuration
 * @param serverId The server ID to load environment for
 * @returns Object with environment variables
 */
export function loadServerEnv(serverId: string): Record<string, string> {
  const envPathMapping: Record<string, string> = {
    'outlook-fernando': process.env.MCP_EMAIL_ENV_PATH || '',
    'outlook-faturamento': process.env.MCP_EMAIL_ENV_PATH || '',
    'trello': process.env.MCP_TRELLO_ENV_PATH || '',
    'spotify': process.env.MCP_SPOTIFY_ENV_PATH || '',
    'youtube': process.env.MCP_YOUTUBE_ENV_PATH || '',
    'github': process.env.MCP_GITHUB_ENV_PATH || '',
    'notion': process.env.MCP_NOTION_ENV_PATH || '',
    'whatsapp': process.env.MCP_WHATSAPP_ENV_PATH || '',
    'onedrive-sharepoint': process.env.MCP_ONEDRIVE_ENV_PATH || '',
  };

  const envPath = envPathMapping[serverId];
  if (!envPath) {
    logger.warn(`No environment path configured for server: ${serverId}`);
    return {};
  }

  const env = loadEnvFromPath(envPath);
  
  // Special handling for outlook-faturamento
  if (serverId === 'outlook-faturamento' && env.TARGET_USER_EMAIL) {
    // Override TARGET_USER_EMAIL for faturamento account
    env.TARGET_USER_EMAIL = 'faturamento@cpzseg.com.br';
  }
  
  return env;
}
