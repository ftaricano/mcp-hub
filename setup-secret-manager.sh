#!/bin/bash

##############################################################################
# MCP Secret Manager Setup Script - 100% Free Local Solution
##############################################################################

set -e

echo "🔐 Setting up MCP Secret Manager..."
echo "=================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HUB_DIR="$SCRIPT_DIR"

echo -e "${BLUE}📍 Working directory: $HUB_DIR${NC}"
echo ""

# Check if we're in the right directory
if [[ ! -f "$HUB_DIR/package.json" ]]; then
    echo -e "${RED}❌ Error: package.json not found. Are you in the mcp-hub directory?${NC}"
    exit 1
fi

# Check Node.js version
echo -e "${BLUE}🔍 Checking Node.js version...${NC}"
NODE_VERSION=$(node --version 2>/dev/null || echo "not found")
if [[ "$NODE_VERSION" == "not found" ]]; then
    echo -e "${RED}❌ Node.js not found. Please install Node.js 18+ first.${NC}"
    exit 1
fi

NODE_MAJOR=$(echo $NODE_VERSION | cut -d'.' -f1 | sed 's/v//')
if [[ $NODE_MAJOR -lt 18 ]]; then
    echo -e "${RED}❌ Node.js $NODE_VERSION found. Please upgrade to Node.js 18+ first.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Node.js $NODE_VERSION${NC}"

# Install dependencies
echo ""
echo -e "${BLUE}📦 Installing dependencies...${NC}"
if ! npm install; then
    echo -e "${RED}❌ Failed to install dependencies${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Dependencies installed${NC}"

# Build the project
echo ""
echo -e "${BLUE}🔨 Building the project...${NC}"
if ! npm run build; then
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Project built successfully${NC}"

# Make CLI executable
echo ""
echo -e "${BLUE}⚙️ Setting up CLI...${NC}"
chmod +x "$HUB_DIR/bin/mcp-secret"
echo -e "${GREEN}✅ CLI made executable${NC}"

# Test the secret manager
echo ""
echo -e "${BLUE}🧪 Testing Secret Manager...${NC}"
if ! npx tsx src/secrets/test-secret-manager.ts; then
    echo -e "${RED}❌ Secret Manager test failed${NC}"
    exit 1
fi

# Setup instructions
echo ""
echo -e "${GREEN}🎉 MCP Secret Manager setup complete!${NC}"
echo ""
echo "📋 Next Steps:"
echo "=============="
echo ""

# Check if CLI is already in PATH
if command -v mcp-secret &> /dev/null; then
    echo -e "${GREEN}✅ CLI already available in PATH${NC}"
else
    echo -e "${YELLOW}📝 Add CLI to your PATH:${NC}"
    echo ""
    echo "   # Option 1: Add to your shell profile (.bashrc, .zshrc, etc.)"
    echo "   export PATH=\"\$PATH:$HUB_DIR/bin\""
    echo ""
    echo "   # Option 2: Create system-wide symlink"
    echo "   sudo ln -sf $HUB_DIR/bin/mcp-secret /usr/local/bin/mcp-secret"
    echo ""
fi

echo -e "${BLUE}🚀 Quick Start Guide:${NC}"
echo ""
echo "1. Add your first secret:"
echo "   mcp-secret add CLIENT_SECRET --service spotify"
echo ""
echo "2. Import from environment variables:"
echo "   mcp-secret import"
echo ""
echo "3. List all secrets:"
echo "   mcp-secret list"
echo ""
echo "4. Create a backup:"
echo "   mcp-secret backup --reason \"Initial setup\""
echo ""
echo "5. Get help:"
echo "   mcp-secret help"
echo ""

# Show security info
echo -e "${BLUE}🔐 Security Features:${NC}"
echo "   • AES-256-GCM encryption"
echo "   • System keychain integration"
echo "   • File permissions: owner-only"
echo "   • Memory protection"
echo "   • Auto-rotation for OAuth2 tokens"
echo "   • Encrypted backups"
echo ""

# Show storage location
echo -e "${BLUE}💾 Storage Location:${NC}"
echo "   ~/.mcp-secrets/"
echo "   ├── vault.json (encrypted)"
echo "   ├── backups/ (encrypted)"
echo "   └── .master-key (if not in keychain)"
echo ""

# Check if secrets directory exists
SECRETS_DIR="$HOME/.mcp-secrets"
if [[ -d "$SECRETS_DIR" ]]; then
    echo -e "${GREEN}✅ Secrets directory already exists: $SECRETS_DIR${NC}"
else
    echo -e "${YELLOW}📁 Secrets directory will be created on first use: $SECRETS_DIR${NC}"
fi

echo ""
echo -e "${GREEN}✨ Your secrets are now managed securely and locally!${NC}"
echo -e "${GREEN}💰 100% free forever - no cloud dependencies!${NC}"
echo ""