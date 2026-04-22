import { readFileSync, existsSync } from 'fs';
import { parse } from 'dotenv';
import { logger } from './logger.js';

function normalizeServerIdForEnv(serverId: string): string {
  return serverId
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase();
}

function resolveEnvPath(serverId: string): string {
  const normalizedServerId = normalizeServerIdForEnv(serverId);
  const genericEnvVar = `MCP_${normalizedServerId}_ENV_PATH`;

  const legacyAliases: Record<string, string[]> = {
    'outlook-fernando': ['MCP_EMAIL_ENV_PATH'],
    'outlook-faturamento': ['MCP_EMAIL_ENV_PATH'],
    'onedrive-sharepoint': ['MCP_ONEDRIVE_ENV_PATH'],
  };

  const candidateEnvVars = [
    genericEnvVar,
    ...(legacyAliases[serverId] || []),
  ];

  for (const envVar of candidateEnvVars) {
    const envPath = process.env[envVar];
    if (envPath) {
      if (envVar !== genericEnvVar) {
        logger.warn(`Using legacy environment alias ${envVar} for ${serverId}. Prefer ${genericEnvVar}.`);
      }
      logger.debug(`Using ${envVar} for server environment`, { serverId, envVar, envPath });
      return envPath;
    }
  }

  return '';
}

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
export function loadServerEnv(serverId: string, explicitEnvPath?: string): Record<string, string> {
  const envPath = explicitEnvPath || resolveEnvPath(serverId);
  if (!envPath) {
    logger.debug(`No environment path configured for server: ${serverId}. Set MCP_${normalizeServerIdForEnv(serverId)}_ENV_PATH or envFile to enable per-server .env loading.`);
    return {};
  }

  return loadEnvFromPath(envPath);
}
