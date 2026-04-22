import { beforeEach, describe, expect, it, vi } from 'vitest';

const { loadServerEnvMock } = vi.hoisted(() => ({
  loadServerEnvMock: vi.fn(),
}));

vi.mock('@modelcontextprotocol/sdk/client/index.js', () => ({
  Client: vi.fn().mockImplementation(() => ({
    connect: vi.fn(),
    listTools: vi.fn(),
    callTool: vi.fn(),
  })),
}));

vi.mock('@modelcontextprotocol/sdk/client/stdio.js', () => ({
  StdioClientTransport: vi.fn().mockImplementation(() => ({
    process: undefined,
  })),
}));

vi.mock('@modelcontextprotocol/sdk/client/sse.js', () => ({
  SSEClientTransport: vi.fn(),
}));

vi.mock('../../src/utils/env-loader.js', () => ({
  loadServerEnv: loadServerEnvMock,
}));

vi.mock('../../src/utils/process-manager.js', () => ({
  default: {
    cleanupProcess: vi.fn(),
    registerProcess: vi.fn(),
  },
}));

import { ServerRegistry } from '../../src/registry/index.js';
import type { ServerConfig } from '../../src/types/index.js';

function createServerConfig(overrides: Partial<ServerConfig> = {}): ServerConfig {
  return {
    id: 'docs-server',
    name: 'Docs',
    command: 'node',
    args: ['server.js'],
    protocol: 'stdio',
    enabled: true,
    timeout: 1000,
    retries: 4,
    ...overrides,
  };
}

describe('ServerRegistry hardening', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loadServerEnvMock.mockReturnValue({});
    process.env.PATH = '/usr/bin';
    process.env.HOME = '/tmp/home';
    process.env.SECRET_GLOBAL = 'do-not-pass';
    process.env.DOCS_REGION = 'us-east-1';
  });

  it('scopes stdio environment inheritance to explicit allowlists', () => {
    loadServerEnvMock.mockReturnValue({
      ENV_ONLY: 'from-file',
      SHARED_VALUE: 'from-file',
    });

    const registry = new ServerRegistry();
    const config = createServerConfig({
      envFile: '/tmp/docs.env',
      inheritEnv: ['DOCS_REGION'],
      env: {
        SHARED_VALUE: 'from-config',
        INLINE_ONLY: 'from-config',
      },
    });

    const result = (registry as any).buildServerEnvironment('docs-server', config) as Record<string, string>;

    expect(result.PATH).toBe('/usr/bin');
    expect(result.HOME).toBe('/tmp/home');
    expect(result.DOCS_REGION).toBe('us-east-1');
    expect(result.ENV_ONLY).toBe('from-file');
    expect(result.INLINE_ONLY).toBe('from-config');
    expect(result.SHARED_VALUE).toBe('from-config');
    expect(result.SECRET_GLOBAL).toBeUndefined();
    expect(loadServerEnvMock).toHaveBeenCalledWith('docs-server', '/tmp/docs.env');
  });

  it('does not retry tool calls by default even when connection retries are configured', async () => {
    const registry = new ServerRegistry();
    const callToolMock = vi.fn().mockRejectedValue(new Error('boom'));

    (registry as any).servers.set('docs-server', createServerConfig());
    vi.spyOn(registry, 'getConnection').mockResolvedValue({
      client: {
        callTool: callToolMock,
      },
    } as any);

    await expect(registry.callTool('docs-server', 'create_doc', { title: 'test' })).rejects.toThrow('boom');
    expect(callToolMock).toHaveBeenCalledTimes(1);
  });

  it('retries only explicitly allowlisted idempotent tools', async () => {
    const registry = new ServerRegistry();
    const callToolMock = vi.fn()
      .mockRejectedValueOnce(new Error('transient'))
      .mockResolvedValueOnce({ ok: true });

    (registry as any).servers.set('docs-server', createServerConfig({
      toolCallRetries: {
        enabled: true,
        maxAttempts: 2,
        retryableTools: ['search_docs'],
      },
    }));

    vi.spyOn(registry, 'getConnection').mockResolvedValue({
      client: {
        callTool: callToolMock,
      },
    } as any);

    await expect(registry.callTool('docs-server', 'search_docs', { query: 'hardening' })).resolves.toEqual({ ok: true });
    expect(callToolMock).toHaveBeenCalledTimes(2);
  });
});
