import { useState } from 'react';
import type { ToolInfo, ExecutionResult } from '../lib/api';
import { api } from '../lib/api';

interface ToolTesterProps {
  tool: ToolInfo;
  onBack: () => void;
}

export function ToolTester({ tool, onBack }: ToolTesterProps) {
  const [parameters, setParameters] = useState<Record<string, any>>({});
  const [executing, setExecuting] = useState(false);
  const [result, setResult] = useState<ExecutionResult | null>(null);

  const schema = tool.schema?.properties || {};
  const parameterNames = Object.keys(schema);

  const handleParameterChange = (name: string, value: any) => {
    setParameters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleExecute = async () => {
    try {
      setExecuting(true);
      setResult(null);

      const executionResult = await api.executeTool(
        tool.serverId,
        tool.toolName,
        parameters
      );

      setResult(executionResult);
    } catch (error: any) {
      console.error('Execution error:', error);
      setResult({
        executionId: 'error',
        serverId: tool.serverId,
        toolName: tool.toolName,
        result: null,
        executionTime: 0,
        timestamp: new Date().toISOString(),
        status: 'error',
        error: {
          code: 'EXECUTION_FAILED',
          message: error.message || 'Failed to execute tool'
        }
      });
    } finally {
      setExecuting(false);
    }
  };

  const renderParameterInput = (name: string, paramSchema: any) => {
    const type = paramSchema.type || 'string';
    const value = parameters[name] || '';

    switch (type) {
      case 'number':
      case 'integer':
        return (
          <input
            type="number"
            value={value}
            onChange={e => handleParameterChange(name, parseFloat(e.target.value))}
            className="param-input"
          />
        );

      case 'boolean':
        return (
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={!!value}
              onChange={e => handleParameterChange(name, e.target.checked)}
            />
            <span>{value ? 'Sim' : 'Não'}</span>
          </label>
        );

      case 'array':
        return (
          <textarea
            value={Array.isArray(value) ? value.join('\n') : value}
            onChange={e =>
              handleParameterChange(
                name,
                e.target.value.split('\n').filter(Boolean)
              )
            }
            placeholder="Um item por linha..."
            className="param-textarea"
            rows={4}
          />
        );

      case 'object':
        return (
          <textarea
            value={typeof value === 'object' ? JSON.stringify(value, null, 2) : value}
            onChange={e => {
              try {
                const parsed = JSON.parse(e.target.value);
                handleParameterChange(name, parsed);
              } catch {
                // Invalid JSON, keep as string
                handleParameterChange(name, e.target.value);
              }
            }}
            placeholder='{"key": "value"}'
            className="param-textarea"
            rows={6}
          />
        );

      default:
        return (
          <input
            type="text"
            value={value}
            onChange={e => handleParameterChange(name, e.target.value)}
            className="param-input"
            placeholder={paramSchema.description || `Enter ${name}...`}
          />
        );
    }
  };

  return (
    <div className="tool-tester">
      <div className="tester-header">
        <button onClick={onBack} className="back-btn">
          ← Voltar
        </button>
        <div className="tool-info-header">
          <h2>{tool.ptName || tool.toolName}</h2>
          <span className="server-badge">{tool.serverId}</span>
        </div>
      </div>

      <div className="tester-content">
        <section className="tool-details">
          <h3>📋 Informações da Ferramenta</h3>
          <div className="detail-grid">
            <div className="detail-item">
              <strong>Nome Técnico:</strong>
              <span>{tool.toolName}</span>
            </div>
            <div className="detail-item">
              <strong>Descrição:</strong>
              <span>{tool.ptDescription || tool.description}</span>
            </div>
            {tool.category && (
              <div className="detail-item">
                <strong>Categoria:</strong>
                <span>{tool.category}</span>
              </div>
            )}
            {tool.complexity && (
              <div className="detail-item">
                <strong>Complexidade:</strong>
                <span className={`complexity-badge ${tool.complexity}`}>
                  {tool.complexity}
                </span>
              </div>
            )}
            {tool.reliabilityScore !== undefined && (
              <div className="detail-item">
                <strong>Confiabilidade:</strong>
                <span>⭐ {tool.reliabilityScore}/10</span>
              </div>
            )}
          </div>
        </section>

        <section className="parameters-section">
          <h3>⚙️ Parâmetros</h3>
          {parameterNames.length > 0 ? (
            <div className="parameters-form">
              {parameterNames.map(name => (
                <div key={name} className="parameter-field">
                  <label className="parameter-label">
                    <strong>{name}</strong>
                    {schema[name].description && (
                      <span className="param-description">
                        {schema[name].description}
                      </span>
                    )}
                    <span className="param-type">{schema[name].type}</span>
                  </label>
                  {renderParameterInput(name, schema[name])}
                </div>
              ))}
            </div>
          ) : (
            <p className="no-params">Esta ferramenta não requer parâmetros.</p>
          )}

          <button
            onClick={handleExecute}
            disabled={executing}
            className="execute-btn"
          >
            {executing ? '⏳ Executando...' : '▶️ Executar Ferramenta'}
          </button>
        </section>

        {result && (
          <section className="results-section">
            <h3>
              {result.status === 'success' ? '✅ Resultado' : '❌ Erro'}
            </h3>

            <div className="result-meta">
              <span>
                <strong>Execution ID:</strong> {result.executionId}
              </span>
              <span>
                <strong>Tempo:</strong> {result.executionTime}ms
              </span>
              <span>
                <strong>Timestamp:</strong>{' '}
                {new Date(result.timestamp).toLocaleString()}
              </span>
            </div>

            {result.status === 'error' && result.error && (
              <div className="error-box">
                <strong>{result.error.code}</strong>
                <p>{result.error.message}</p>
              </div>
            )}

            {result.status === 'success' && (
              <div className="result-box">
                <pre>{JSON.stringify(result.result, null, 2)}</pre>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
