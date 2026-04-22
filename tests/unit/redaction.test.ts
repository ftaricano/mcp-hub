import { describe, expect, it } from 'vitest';

import { summarizeToolArguments } from '../../src/utils/redaction.js';

describe('tool argument redaction', () => {
  it('summarizes keys without leaking raw argument values', () => {
    const summary = summarizeToolArguments({
      username: 'alice',
      apiKey: 'super-secret-api-key',
      client_secret: 'shh',
      nested: { authorization: 'Bearer hidden' },
      count: 3,
    });

    expect(summary).toEqual({
      argumentKeys: ['apiKey', 'client_secret', 'count', 'nested', 'username'],
      sensitiveKeys: ['apiKey', 'client_secret'],
    });
    expect(JSON.stringify(summary)).not.toContain('super-secret-api-key');
    expect(JSON.stringify(summary)).not.toContain('Bearer hidden');
  });

  it('flags common secret-bearing key variants and handles empty input', () => {
    expect(summarizeToolArguments(undefined)).toEqual({
      argumentKeys: [],
      sensitiveKeys: [],
    });

    const summary = summarizeToolArguments({
      sessionToken: 'token',
      cookie: 'cookie-data',
      authorization: 'Bearer token',
      regularField: 'safe',
    });

    expect(summary.argumentKeys).toEqual(['authorization', 'cookie', 'regularField', 'sessionToken']);
    expect(summary.sensitiveKeys).toEqual(['authorization', 'cookie', 'sessionToken']);
  });
});
