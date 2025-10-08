import type { ServerInfo } from '../lib/api';

interface ServerListProps {
  servers: ServerInfo[];
  onRefresh: () => void;
}

export function ServerList({ servers, onRefresh }: ServerListProps) {
  return (
    <div className="server-list">
      <div className="section-header">
        <h2>🖥️ Servidores MCP</h2>
        <button onClick={onRefresh} className="refresh-btn">
          🔄 Atualizar
        </button>
      </div>

      <div className="servers-grid">
        {servers.map(server => (
          <div key={server.id} className="server-card">
            <div className="server-card-header">
              <h3>{server.name}</h3>
              <span className={`status-badge ${server.health}`}>
                {server.health === 'healthy' && '✅ Saudável'}
                {server.health === 'degraded' && '⚠️ Degradado'}
                {server.health === 'offline' && '❌ Offline'}
              </span>
            </div>

            <div className="server-card-body">
              <div className="server-info">
                <div className="info-row">
                  <span className="info-label">Status:</span>
                  <span className={server.enabled ? 'success' : 'muted'}>
                    {server.enabled ? '✅ Habilitado' : '⏸️ Desabilitado'}
                  </span>
                </div>

                <div className="info-row">
                  <span className="info-label">Conexão:</span>
                  <span className={server.connected ? 'success' : 'error'}>
                    {server.connected ? '🟢 Conectado' : '🔴 Desconectado'}
                  </span>
                </div>

                <div className="info-row">
                  <span className="info-label">Protocolo:</span>
                  <span>{server.protocol}</span>
                </div>

                <div className="info-row">
                  <span className="info-label">Ferramentas:</span>
                  <span className="tool-count-badge">{server.toolCount}</span>
                </div>

                {server.lastSeen && (
                  <div className="info-row">
                    <span className="info-label">Última vez:</span>
                    <span className="muted">{new Date(server.lastSeen).toLocaleString()}</span>
                  </div>
                )}

                {server.responseTime !== undefined && (
                  <div className="info-row">
                    <span className="info-label">Tempo de resposta:</span>
                    <span>{server.responseTime}ms</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {servers.length === 0 && (
        <div className="empty-state">
          <p>Nenhum servidor encontrado.</p>
        </div>
      )}
    </div>
  );
}
