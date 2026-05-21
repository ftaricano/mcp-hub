# Security Policy

## Supported Versions

MCP Hub is currently pre-1.0. Security fixes are applied to the default branch and the latest published package version when a package release exists.

## Reporting a Vulnerability

Please report security issues privately through GitHub Security Advisories:

https://github.com/ftaricano/mcp-hub/security/advisories/new

Do not open a public issue with exploit details, tokens, logs, or private infrastructure information. Include a minimal description, affected version or commit, reproduction steps, and the expected impact.

## Secret Handling

MCP Hub is a gateway for downstream MCP servers, so local deployments often reference credentials owned by those downstream servers. Keep secrets outside the repository.

Never commit:

- `.env`, `.env.*` except `.env.example`
- `hub-config.json` or machine-specific hub config variants
- `tokens/`, `auth-state/`, `config/auth-state/`
- `credentials.json`, `token.json`, private keys, certificates, logs, JSONL traces, dumps, or screenshots containing credentials
- OAuth refresh tokens, access tokens, API keys, bearer tokens, client secrets, session cookies, or generated MCP client state

Use `envFile`, environment variables, a key vault, or your downstream server's documented secret storage. Keep example values generic and non-working.

## If a Secret Is Exposed

1. Revoke or rotate the credential at the provider.
2. Remove the secret from the working tree.
3. Audit Git history to determine whether a history rewrite or fresh public snapshot is required.
4. Review CI logs, package tarballs, release artifacts, screenshots, and generated traces for copies.
5. Open a private security advisory if users may have pulled the exposed version.

Do not rely on deleting a file from a later commit if the secret was already pushed to a public repository.

## Dependency and Package Checks

Before publishing or cutting a release, run:

```bash
npm ci
npm run type-check
npm run lint
npm run format:check
npm test
npm run build
npm audit --omit=dev
npm pack --dry-run --json
```

Inspect the package tarball list and confirm that it excludes local configs, logs, tests, coverage, `testing-interface/`, and generated artifacts.
