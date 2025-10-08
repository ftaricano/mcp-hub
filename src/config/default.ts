import { HubConfig } from '../types/index.js';
import { readFileSync, existsSync } from 'fs';
import { resolve, join } from 'path';

export const defaultConfig: HubConfig = {
  servers: [],
  cache: {
    enabled: true,
    ttl: 300000, // 5 minutes
  },
  security: {
    rate_limit: 100, // requests per minute
    validate_schemas: true,
  },
  logging: {
    level: 'info',
    format: 'json',
  },
};

export function loadConfig(): HubConfig {
  const configPath = process.env.HUB_CONFIG;
  
  if (configPath) {
    try {
      const fullPath = resolve(configPath);
      const configData = readFileSync(fullPath, 'utf-8');
      const config = JSON.parse(configData);
      
      // Merge with defaults
      return {
        ...defaultConfig,
        ...config,
        cache: { ...defaultConfig.cache, ...config.cache },
        security: { ...defaultConfig.security, ...config.security },
        logging: { ...defaultConfig.logging, ...config.logging },
      };
    } catch (error) {
      console.error('Failed to load config file:', error);
      // Fall through to attempt auto-discovery
    }
  }

  // Auto-discovery fallback: try common locations when HUB_CONFIG is not set
  try {
    const candidates = [
      // Running from repo root
      resolve(process.cwd(), 'mcp-hub/hub-config.json'),
      // Running inside mcp-hub package (dist or src)
      resolve(process.cwd(), 'hub-config.json'),
      // Typical relative path from compiled dist
      resolve(join(__dirname, '..', '..', 'hub-config.json')),
    ];

    for (const candidate of candidates) {
      if (existsSync(candidate)) {
        const data = readFileSync(candidate, 'utf-8');
        const cfg = JSON.parse(data);
        return {
          ...defaultConfig,
          ...cfg,
          cache: { ...defaultConfig.cache, ...cfg.cache },
          security: { ...defaultConfig.security, ...cfg.security },
          logging: { ...defaultConfig.logging, ...cfg.logging },
        };
      }
    }
  } catch (e) {
    console.error('Auto-discovery of hub-config.json failed:', e);
  }

  return defaultConfig;
}
