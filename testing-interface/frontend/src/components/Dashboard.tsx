import type { ServerInfo, ToolInfo } from '../lib/api';

interface DashboardProps {
  servers: ServerInfo[];
  tools: ToolInfo[];
}

export function Dashboard({ servers, tools }: DashboardProps) {
  const activeServers = servers.filter((s) => s.enabled);
  const connectedServers = servers.filter((s) => s.connected);
  const healthyServers = servers.filter((s) => s.health === 'healthy');

  // Group tools by category
  const toolsByCategory = tools.reduce(
    (acc, tool) => {
      const category = tool.category || 'Outros';
      if (!acc[category]) acc[category] = [];
      acc[category].push(tool);
      return acc;
    },
    {} as Record<string, ToolInfo[]>
  );

  // Group tools by server
  const toolsByServer = tools.reduce(
    (acc, tool) => {
      if (!acc[tool.serverId]) acc[tool.serverId] = [];
      acc[tool.serverId].push(tool);
      return acc;
    },
    {} as Record<string, ToolInfo[]>
  );

  return (
    <div className="dashboard">
      <h2>📊 Dashboard</h2>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{servers.length}</div>
          <div className="stat-label">Servidores Totais</div>
        </div>

        <div className="stat-card success">
          <div className="stat-value">{activeServers.length}</div>
          <div className="stat-label">Servidores Ativos</div>
        </div>

        <div className="stat-card">
          <div className="stat-value">{connectedServers.length}</div>
          <div className="stat-label">Conectados</div>
        </div>

        <div className="stat-card success">
          <div className="stat-value">{healthyServers.length}</div>
          <div className="stat-label">Saudáveis</div>
        </div>

        <div className="stat-card primary">
          <div className="stat-value">{tools.length}</div>
          <div className="stat-label">Ferramentas Totais</div>
        </div>

        <div className="stat-card">
          <div className="stat-value">{Object.keys(toolsByCategory).length}</div>
          <div className="stat-label">Categorias</div>
        </div>
      </div>

      <div className="dashboard-grid">
        <section className="dashboard-section">
          <h3>🖥️ Status dos Servidores</h3>
          <div className="server-status-list">
            {servers.map((server) => (
              <div key={server.id} className="server-status-item">
                <div className="server-status-header">
                  <span className={`status-indicator ${server.health}`}></span>
                  <strong>{server.name}</strong>
                  <span className="tool-count">{server.toolCount} tools</span>
                </div>
                <div className="server-status-info">
                  <span className={server.enabled ? 'enabled' : 'disabled'}>
                    {server.enabled ? '✅ Habilitado' : '⏸️ Desabilitado'}
                  </span>
                  <span className={server.connected ? 'connected' : 'disconnected'}>
                    {server.connected ? '🟢 Conectado' : '🔴 Desconectado'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="dashboard-section">
          <h3>📂 Ferramentas por Categoria</h3>
          <div className="category-list">
            {Object.entries(toolsByCategory)
              .sort(([, a], [, b]) => b.length - a.length)
              .map(([category, categoryTools]) => (
                <div key={category} className="category-item">
                  <div className="category-header">
                    <strong>{category}</strong>
                    <span className="category-count">{categoryTools.length}</span>
                  </div>
                  <div className="category-bar">
                    <div
                      className="category-bar-fill"
                      style={{ width: `${(categoryTools.length / tools.length) * 100}%` }}
                    ></div>
                  </div>
                </div>
              ))}
          </div>
        </section>

        <section className="dashboard-section">
          <h3>🔧 Ferramentas por Servidor</h3>
          <div className="server-tools-list">
            {Object.entries(toolsByServer)
              .sort(([, a], [, b]) => b.length - a.length)
              .map(([serverId, serverTools]) => (
                <div key={serverId} className="server-tools-item">
                  <strong>{serverId}</strong>
                  <span className="tools-count">{serverTools.length} ferramentas</span>
                </div>
              ))}
          </div>
        </section>
      </div>
    </div>
  );
}
