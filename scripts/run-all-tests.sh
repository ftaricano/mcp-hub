#!/bin/bash

# MCP Hub - Test Execution Script
# Executa todos os testes do MCP Hub de forma organizada

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to run test with timing
run_test() {
    local test_name="$1"
    local test_command="$2"
    
    print_status "Executando: $test_name"
    local start_time=$(date +%s)
    
    if eval "$test_command"; then
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        print_success "$test_name concluído em ${duration}s"
        return 0
    else
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        print_error "$test_name falhou após ${duration}s"
        return 1
    fi
}

# Main execution
main() {
    echo "======================================"
    echo "🧪 MCP Hub - Suite de Testes Completa"
    echo "======================================"
    echo ""
    
    # Check prerequisites
    print_status "Verificando pré-requisitos..."
    
    if ! command_exists node; then
        print_error "Node.js não encontrado. Instale o Node.js 18+ para continuar."
        exit 1
    fi
    
    if ! command_exists npm; then
        print_error "npm não encontrado. Instale o npm para continuar."
        exit 1
    fi
    
    # Check Node version
    node_version=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$node_version" -lt 18 ]; then
        print_error "Node.js 18+ é necessário. Versão atual: $(node --version)"
        exit 1
    fi
    
    print_success "Pré-requisitos verificados (Node.js $(node --version))"
    echo ""
    
    # Install dependencies
    print_status "Instalando dependências..."
    if npm ci > /dev/null 2>&1; then
        print_success "Dependências instaladas"
    else
        print_error "Falha na instalação das dependências"
        exit 1
    fi
    echo ""
    
    # Build project
    print_status "Compilando projeto..."
    if npm run build > /dev/null 2>&1; then
        print_success "Projeto compilado"
    else
        print_error "Falha na compilação"
        exit 1
    fi
    echo ""
    
    # Test execution tracking
    local tests_passed=0
    local tests_failed=0
    local total_start_time=$(date +%s)
    
    echo "🔍 Executando testes..."
    echo "========================"
    
    # 1. Lint and Type Check
    if run_test "Lint e Type Check" "npm run lint && npm run type-check"; then
        ((tests_passed++))
    else
        ((tests_failed++))
    fi
    echo ""
    
    # 2. Unit Tests
    if run_test "Testes Unitários" "npm run test:unit"; then
        ((tests_passed++))
    else
        ((tests_failed++))
    fi
    echo ""
    
    # 3. Integration Tests
    if run_test "Testes de Integração" "npm run test:integration"; then
        ((tests_passed++))
    else
        ((tests_failed++))
    fi
    echo ""
    
    # 4. E2E Tests
    if run_test "Testes End-to-End" "npm run test:e2e"; then
        ((tests_passed++))
    else
        ((tests_failed++))
        print_warning "Testes E2E podem falhar em ambientes sem configuração completa"
    fi
    echo ""
    
    # 5. Performance Tests
    if run_test "Testes de Performance" "npm run test:performance"; then
        ((tests_passed++))
    else
        ((tests_failed++))
    fi
    echo ""
    
    # 6. Coverage Report
    if run_test "Relatório de Cobertura" "npm run test:coverage"; then
        ((tests_passed++))
        
        # Show coverage summary
        if [ -f "coverage/coverage-summary.json" ]; then
            print_status "Resumo da Cobertura:"
            # Extract coverage percentages (simplified)
            echo "  - Verifique o relatório completo em coverage/index.html"
        fi
    else
        ((tests_failed++))
    fi
    echo ""
    
    # Calculate total execution time
    local total_end_time=$(date +%s)
    local total_duration=$((total_end_time - total_start_time))
    
    # Final summary
    echo "======================================"
    echo "📊 Resumo da Execução"
    echo "======================================"
    echo ""
    echo "✅ Testes Aprovados: $tests_passed"
    echo "❌ Testes Falharam: $tests_failed"
    echo "⏱️  Tempo Total: ${total_duration}s"
    echo ""
    
    if [ $tests_failed -eq 0 ]; then
        print_success "🎉 Todos os testes foram executados com sucesso!"
        echo ""
        echo "🚀 O MCP Hub está pronto para uso!"
        echo ""
        echo "Próximos passos:"
        echo "  1. Verifique o relatório de cobertura: open coverage/index.html"
        echo "  2. Execute o Hub: npm start"
        echo "  3. Configure seus servidores MCP conforme a documentação"
        echo ""
        exit 0
    else
        print_error "❌ Alguns testes falharam. Verifique os logs acima."
        echo ""
        echo "🔧 Para resolver problemas:"
        echo "  1. Verifique os logs de erro específicos"
        echo "  2. Execute testes individuais: npm run test:unit, test:integration, etc."
        echo "  3. Verifique a configuração de ambiente em .env.test"
        echo ""
        exit 1
    fi
}

# Handle script interruption
trap 'print_warning "Script interrompido pelo usuário"; exit 130' INT

# Parse command line arguments
SKIP_BUILD=false
VERBOSE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-build)
            SKIP_BUILD=true
            shift
            ;;
        --verbose|-v)
            VERBOSE=true
            shift
            ;;
        --help|-h)
            echo "Uso: $0 [OPÇÕES]"
            echo ""
            echo "Opções:"
            echo "  --skip-build    Pula a etapa de build"
            echo "  --verbose, -v   Saída verbosa"
            echo "  --help, -h      Mostra esta ajuda"
            echo ""
            exit 0
            ;;
        *)
            print_error "Opção desconhecida: $1"
            echo "Use --help para ver opções disponíveis"
            exit 1
            ;;
    esac
done

# Set verbose mode
if [ "$VERBOSE" = true ]; then
    set -x
fi

# Run main function
main "$@"