/**
 * Secure Credentials Management System for MCP Hub
 * Handles environment variables, encryption, and validation
 */

import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';
import { z } from 'zod';

// Encryption configuration
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;

// Validation schemas
const CredentialSchema = z.object({
  value: z.string().min(1),
  encrypted: z.boolean().default(false),
  lastRotated: z.string().optional(),
  expiresAt: z.string().optional(),
});

const ServiceCredentialsSchema = z.object({
  // Microsoft Graph (Email, OneDrive)
  MICROSOFT_GRAPH_CLIENT_ID: CredentialSchema.optional(),
  MICROSOFT_GRAPH_CLIENT_SECRET: CredentialSchema.optional(),
  MICROSOFT_GRAPH_TENANT_ID: CredentialSchema.optional(),

  // Trello
  TRELLO_API_KEY: CredentialSchema.optional(),
  TRELLO_TOKEN: CredentialSchema.optional(),

  // Spotify
  SPOTIFY_CLIENT_ID: CredentialSchema.optional(),
  SPOTIFY_CLIENT_SECRET: CredentialSchema.optional(),

  // YouTube
  YOUTUBE_CLIENT_ID: CredentialSchema.optional(),
  YOUTUBE_CLIENT_SECRET: CredentialSchema.optional(),

  // GitHub
  GITHUB_TOKEN: CredentialSchema.optional(),

  // Notion
  NOTION_TOKEN: CredentialSchema.optional(),

  // WhatsApp
  WHATSAPP_ACCESS_TOKEN: CredentialSchema.optional(),
  WHATSAPP_PHONE_NUMBER_ID: CredentialSchema.optional(),
});

type ServiceCredentials = z.infer<typeof ServiceCredentialsSchema>;

export interface CredentialConfig {
  environment: 'development' | 'production' | 'staging';
  encryptionEnabled: boolean;
  keyVault?: {
    provider: 'azure' | 'aws' | 'env';
    keyId?: string;
  };
  rotationPolicy?: {
    enabled: boolean;
    intervalDays: number;
  };
}

export class CredentialsManager {
  private encryptionKey: Buffer | null = null;
  private credentials: ServiceCredentials = {};
  private config: CredentialConfig;

  constructor(config: CredentialConfig) {
    this.config = config;
    if (config.encryptionEnabled) {
      this.initializeEncryption();
    }
  }

  /**
   * Initialize encryption key from environment or generate new one
   */
  private initializeEncryption(): void {
    const keyEnv = process.env.MCP_ENCRYPTION_KEY;

    if (keyEnv) {
      this.encryptionKey = Buffer.from(keyEnv, 'hex');
    } else {
      // Generate new key and warn user to save it
      this.encryptionKey = crypto.randomBytes(KEY_LENGTH);
      console.warn(
        '🔑 NEW ENCRYPTION KEY GENERATED - SAVE THIS SECURELY:\n' +
          `MCP_ENCRYPTION_KEY=${this.encryptionKey.toString('hex')}\n` +
          'Add this to your environment variables!'
      );
    }
  }

  /**
   * Load credentials from environment variables with fallback support
   */
  async loadFromEnvironment(): Promise<void> {
    const envCredentials: Partial<ServiceCredentials> = {};

    // Define environment variable mappings
    const envMappings = {
      // Microsoft Graph
      MICROSOFT_GRAPH_CLIENT_ID: process.env.MICROSOFT_GRAPH_CLIENT_ID,
      MICROSOFT_GRAPH_CLIENT_SECRET: process.env.MICROSOFT_GRAPH_CLIENT_SECRET,
      MICROSOFT_GRAPH_TENANT_ID: process.env.MICROSOFT_GRAPH_TENANT_ID,

      // Trello
      TRELLO_API_KEY: process.env.TRELLO_API_KEY,
      TRELLO_TOKEN: process.env.TRELLO_TOKEN,

      // Spotify
      SPOTIFY_CLIENT_ID: process.env.SPOTIFY_CLIENT_ID,
      SPOTIFY_CLIENT_SECRET: process.env.SPOTIFY_CLIENT_SECRET,

      // YouTube
      YOUTUBE_CLIENT_ID: process.env.YOUTUBE_CLIENT_ID,
      YOUTUBE_CLIENT_SECRET: process.env.YOUTUBE_CLIENT_SECRET,

      // GitHub
      GITHUB_TOKEN: process.env.GITHUB_TOKEN,

      // Notion
      NOTION_TOKEN: process.env.NOTION_TOKEN,

      // WhatsApp
      WHATSAPP_ACCESS_TOKEN: process.env.WHATSAPP_ACCESS_TOKEN,
      WHATSAPP_PHONE_NUMBER_ID: process.env.WHATSAPP_PHONE_NUMBER_ID,
    };

    // Process each credential
    for (const [key, value] of Object.entries(envMappings)) {
      if (value && value.trim() !== '') {
        const credKey = key as keyof ServiceCredentials;
        envCredentials[credKey] = {
          value: value,
          encrypted: false,
          lastRotated: new Date().toISOString(),
        };
      }
    }

    // Validate loaded credentials
    const validated = ServiceCredentialsSchema.parse(envCredentials);
    this.credentials = validated;

    console.log(`✅ Loaded ${Object.keys(validated).length} credentials from environment`);
  }

  /**
   * Load credentials from encrypted file
   */
  async loadFromFile(filePath: string): Promise<void> {
    try {
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const encryptedData = JSON.parse(fileContent);

      if (this.config.encryptionEnabled && this.encryptionKey) {
        const decrypted = this.decryptCredentials(encryptedData);
        this.credentials = ServiceCredentialsSchema.parse(decrypted);
      } else {
        this.credentials = ServiceCredentialsSchema.parse(encryptedData);
      }

      console.log(`✅ Loaded credentials from file: ${filePath}`);
    } catch (error) {
      console.warn(`⚠️ Could not load credentials from file: ${error}`);
      throw new Error(`Failed to load credentials from ${filePath}`);
    }
  }

  /**
   * Save credentials to encrypted file
   */
  async saveToFile(filePath: string): Promise<void> {
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });

    let dataToSave: any = this.credentials;

    if (this.config.encryptionEnabled && this.encryptionKey) {
      dataToSave = this.encryptCredentials(this.credentials);
    }

    await fs.writeFile(filePath, JSON.stringify(dataToSave, null, 2), {
      mode: 0o600, // Read/write for owner only
    });

    console.log(`✅ Saved credentials to file: ${filePath}`);
  }

  /**
   * Get credential value by key
   */
  getCredential(key: keyof ServiceCredentials): string | undefined {
    const credential = this.credentials[key];
    return credential?.value;
  }

  /**
   * Set credential value
   */
  setCredential(key: keyof ServiceCredentials, value: string): void {
    this.credentials[key] = {
      value,
      encrypted: false,
      lastRotated: new Date().toISOString(),
    };
  }

  /**
   * Get environment variables for a specific server
   */
  getServerEnvironment(serverId: string): Record<string, string> {
    const env: Record<string, string> = {};

    switch (serverId) {
      case 'trello':
        this.addToEnv(env, 'TRELLO_API_KEY');
        this.addToEnv(env, 'TRELLO_TOKEN');
        break;

      case 'email-advanced':
      case 'onedrive-sharepoint':
        this.addToEnv(env, 'MICROSOFT_GRAPH_CLIENT_ID');
        this.addToEnv(env, 'MICROSOFT_GRAPH_CLIENT_SECRET');
        this.addToEnv(env, 'MICROSOFT_GRAPH_TENANT_ID');
        break;

      case 'spotify':
        this.addToEnv(env, 'SPOTIFY_CLIENT_ID');
        this.addToEnv(env, 'SPOTIFY_CLIENT_SECRET');
        break;

      case 'youtube':
        this.addToEnv(env, 'YOUTUBE_CLIENT_ID');
        this.addToEnv(env, 'YOUTUBE_CLIENT_SECRET');
        break;

      case 'github':
        this.addToEnv(env, 'GITHUB_TOKEN');
        break;

      case 'notion':
        this.addToEnv(env, 'NOTION_TOKEN');
        break;

      case 'whatsapp':
        this.addToEnv(env, 'WHATSAPP_ACCESS_TOKEN');
        this.addToEnv(env, 'WHATSAPP_PHONE_NUMBER_ID');
        break;
    }

    return env;
  }

  /**
   * Helper to add credential to environment object
   */
  private addToEnv(env: Record<string, string>, key: keyof ServiceCredentials): void {
    const value = this.getCredential(key);
    if (value) {
      env[key] = value;
    }
  }

  /**
   * Encrypt credentials object
   */
  private encryptCredentials(credentials: ServiceCredentials): any {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not initialized');
    }

    const encrypted: any = {};

    for (const [key, credential] of Object.entries(credentials)) {
      if (credential?.value) {
        const iv = crypto.randomBytes(IV_LENGTH);
        const cipher = crypto.createCipheriv(
          ENCRYPTION_ALGORITHM,
          this.encryptionKey,
          iv
        ) as crypto.CipherGCM;

        let encryptedValue = cipher.update(credential.value, 'utf8', 'hex');
        encryptedValue += cipher.final('hex');

        const authTag = cipher.getAuthTag();

        encrypted[key] = {
          ...credential,
          value: encryptedValue,
          iv: iv.toString('hex'),
          authTag: authTag.toString('hex'),
          encrypted: true,
        };
      }
    }

    return encrypted;
  }

  /**
   * Decrypt credentials object
   */
  private decryptCredentials(encryptedCredentials: any): ServiceCredentials {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not initialized');
    }

    const decrypted: ServiceCredentials = {};

    for (const [key, credential] of Object.entries(encryptedCredentials)) {
      if (credential && typeof credential === 'object' && 'value' in credential) {
        const cred = credential as any;

        if (cred.encrypted && cred.iv && cred.authTag) {
          const iv = Buffer.from(cred.iv, 'hex');
          const authTag = Buffer.from(cred.authTag, 'hex');

          const decipher = crypto.createDecipheriv(
            ENCRYPTION_ALGORITHM,
            this.encryptionKey,
            iv
          ) as crypto.DecipherGCM;
          decipher.setAuthTag(authTag);

          let decryptedValue = decipher.update(cred.value, 'hex', 'utf8');
          decryptedValue += decipher.final('utf8');

          decrypted[key as keyof ServiceCredentials] = {
            value: decryptedValue,
            encrypted: false,
            lastRotated: cred.lastRotated,
            expiresAt: cred.expiresAt,
          };
        } else {
          // Not encrypted, use as-is
          decrypted[key as keyof ServiceCredentials] = cred;
        }
      }
    }

    return decrypted;
  }

  /**
   * Validate all required credentials for enabled servers
   */
  validateCredentials(enabledServers: string[]): {
    valid: boolean;
    missing: string[];
    warnings: string[];
  } {
    const missing: string[] = [];
    const warnings: string[] = [];

    const requirements = {
      trello: ['TRELLO_API_KEY', 'TRELLO_TOKEN'],
      'email-advanced': [
        'MICROSOFT_GRAPH_CLIENT_ID',
        'MICROSOFT_GRAPH_CLIENT_SECRET',
        'MICROSOFT_GRAPH_TENANT_ID',
      ],
      'onedrive-sharepoint': [
        'MICROSOFT_GRAPH_CLIENT_ID',
        'MICROSOFT_GRAPH_CLIENT_SECRET',
        'MICROSOFT_GRAPH_TENANT_ID',
      ],
      spotify: ['SPOTIFY_CLIENT_ID', 'SPOTIFY_CLIENT_SECRET'],
      youtube: ['YOUTUBE_CLIENT_ID', 'YOUTUBE_CLIENT_SECRET'],
      github: ['GITHUB_TOKEN'],
      notion: ['NOTION_TOKEN'],
      whatsapp: ['WHATSAPP_ACCESS_TOKEN', 'WHATSAPP_PHONE_NUMBER_ID'],
    };

    for (const serverId of enabledServers) {
      const required = requirements[serverId as keyof typeof requirements];
      if (required) {
        for (const credKey of required) {
          const credential = this.getCredential(credKey as keyof ServiceCredentials);
          if (!credential || credential.trim() === '') {
            missing.push(`${serverId}: ${credKey}`);
          }
        }
      }
    }

    // Check for expiring credentials
    for (const [key, credential] of Object.entries(this.credentials)) {
      if (credential?.expiresAt) {
        const expiresAt = new Date(credential.expiresAt);
        const now = new Date();
        const daysUntilExpiry = Math.ceil(
          (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysUntilExpiry < 7) {
          warnings.push(`${key} expires in ${daysUntilExpiry} days`);
        }
      }
    }

    return {
      valid: missing.length === 0,
      missing,
      warnings,
    };
  }

  /**
   * Generate secure configuration template
   */
  generateSecureConfig(): string {
    return `# MCP Hub Secure Configuration
# Copy this to your .env file and fill in your actual credentials

# Microsoft Graph (for Email and OneDrive servers)
MICROSOFT_GRAPH_CLIENT_ID=your_client_id_here
MICROSOFT_GRAPH_CLIENT_SECRET=your_client_secret_here
MICROSOFT_GRAPH_TENANT_ID=your_tenant_id_here

# Trello
TRELLO_API_KEY=your_trello_api_key_here
TRELLO_TOKEN=your_trello_token_here

# Spotify
SPOTIFY_CLIENT_ID=your_spotify_client_id_here
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret_here

# YouTube
YOUTUBE_CLIENT_ID=your_youtube_client_id_here
YOUTUBE_CLIENT_SECRET=your_youtube_client_secret_here

# GitHub
GITHUB_TOKEN=your_github_token_here

# Notion
NOTION_TOKEN=your_notion_token_here

# WhatsApp (optional)
WHATSAPP_ACCESS_TOKEN=your_whatsapp_token_here
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id_here

# Encryption (optional but recommended for production)
MCP_ENCRYPTION_KEY=generate_with_crypto_randomBytes_32_hex

# Environment
NODE_ENV=development
`;
  }
}

/**
 * Factory function to create credentials manager
 */
export function createCredentialsManager(
  environment: 'development' | 'production' | 'staging' = 'development'
): CredentialsManager {
  const config: CredentialConfig = {
    environment,
    encryptionEnabled: environment === 'production',
    rotationPolicy: {
      enabled: environment === 'production',
      intervalDays: 90,
    },
  };

  return new CredentialsManager(config);
}
