#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const configPath = resolve(repoRoot, 'config/mcporter.json');
const expectedServers = new Set(['cpz-sharepoint', 'whatsapp']);

const result = spawnSync(
  'npx',
  [
    '--yes',
    'mcporter',
    'list',
    '--config',
    configPath,
    '--json',
    '--timeout',
    '15000'
  ],
  {
    cwd: repoRoot,
    encoding: 'utf8'
  }
);

if (result.stderr) {
  process.stderr.write(result.stderr);
}

if (result.status !== 0) {
  process.stderr.write(result.stdout);
  process.exit(result.status ?? 1);
}

let payload;
try {
  payload = JSON.parse(result.stdout);
} catch (error) {
  process.stderr.write(`Failed to parse mcporter JSON output: ${error.message}\n`);
  process.stderr.write(result.stdout);
  process.exit(1);
}

const servers = Array.isArray(payload.servers) ? payload.servers : [payload];
const rows = servers
  .filter((server) => expectedServers.has(server.name))
  .map((server) => ({
    name: server.name,
    status: server.status,
    tools: Array.isArray(server.tools) ? server.tools.length : 0,
    transport: server.transport
  }));

const missing = [...expectedServers].filter(
  (name) => !rows.some((row) => row.name === name)
);
const unhealthy = rows.filter((row) => row.status !== 'ok');

console.log(JSON.stringify({ servers: rows, missing, unhealthy }, null, 2));

if (missing.length > 0 || unhealthy.length > 0) {
  process.exit(1);
}
