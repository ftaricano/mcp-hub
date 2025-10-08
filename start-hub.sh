#!/bin/bash

# Script to start MCP Hub with environment variables loaded
cd "$(dirname "$0")"

# Load .env file
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Set HUB_CONFIG if not already set
export HUB_CONFIG=${HUB_CONFIG:-"$(pwd)/hub-config.json"}

# Start the Hub
node dist/index.js
