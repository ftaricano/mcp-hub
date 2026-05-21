#!/usr/bin/env bash

set -euo pipefail

# Start MCP Hub from a local checkout.
cd "$(dirname "$0")"

# Set HUB_CONFIG if not already set
export HUB_CONFIG=${HUB_CONFIG:-"$(pwd)/hub-config.json"}

node dist/index.js
