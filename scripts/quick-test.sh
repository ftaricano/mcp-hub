#!/bin/bash

# MCP Hub - Quick Test Script
# Executa testes essenciais rapidamente para validação básica

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

echo "🚀 MCP Hub - Teste Rápido"
echo "========================="
echo ""

# Install dependencies
print_status "Instalando dependências..."
npm ci > /dev/null 2>&1

# Build
print_status "Compilando..."
npm run build > /dev/null 2>&1

# Quick lint
print_status "Verificando código..."
if npm run lint > /dev/null 2>&1; then
    print_success "Lint passou"
else
    print_error "Problemas de lint encontrados"
    exit 1
fi

# Type check
print_status "Verificando tipos..."
if npm run type-check > /dev/null 2>&1; then
    print_success "Types corretos"
else
    print_error "Problemas de tipos encontrados"  
    exit 1
fi

# Quick unit test
print_status "Executando testes essenciais..."
if npm run test:unit -- --run > /dev/null 2>&1; then
    print_success "Testes unitários básicos passaram"
else
    print_error "Testes unitários falharam"
    echo ""
    echo "Execute 'npm run test:unit' para ver detalhes"
    exit 1
fi

echo ""
print_success "✅ Teste rápido concluído com sucesso!"
echo ""
echo "Para executar todos os testes: npm run test"
echo "Para testes detalhados: ./scripts/run-all-tests.sh"