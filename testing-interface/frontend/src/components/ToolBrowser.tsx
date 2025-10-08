import { useState } from 'react';
import type { ToolInfo } from '../lib/api';

interface ToolBrowserProps {
  tools: ToolInfo[];
  onToolSelect: (tool: ToolInfo) => void;
}

export function ToolBrowser({ tools, onToolSelect }: ToolBrowserProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedServer, setSelectedServer] = useState<string>('');

  // Get unique categories and servers
  const categories = Array.from(new Set(tools.map(t => t.category || 'Outros')));
  const servers = Array.from(new Set(tools.map(t => t.serverId)));

  // Filter tools
  const filteredTools = tools.filter(tool => {
    const matchesSearch =
      searchQuery === '' ||
      tool.toolName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.ptName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.ptDescription?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      selectedCategory === '' || (tool.category || 'Outros') === selectedCategory;

    const matchesServer = selectedServer === '' || tool.serverId === selectedServer;

    return matchesSearch && matchesCategory && matchesServer;
  });

  return (
    <div className="tool-browser">
      <div className="section-header">
        <h2>🔧 Explorador de Ferramentas</h2>
        <div className="tool-count">
          {filteredTools.length} / {tools.length} ferramentas
        </div>
      </div>

      <div className="filters">
        <input
          type="text"
          placeholder="🔍 Buscar ferramentas..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="search-input"
        />

        <select
          value={selectedCategory}
          onChange={e => setSelectedCategory(e.target.value)}
          className="filter-select"
        >
          <option value="">Todas as Categorias</option>
          {categories.sort().map(category => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>

        <select
          value={selectedServer}
          onChange={e => setSelectedServer(e.target.value)}
          className="filter-select"
        >
          <option value="">Todos os Servidores</option>
          {servers.sort().map(server => (
            <option key={server} value={server}>
              {server}
            </option>
          ))}
        </select>

        {(searchQuery || selectedCategory || selectedServer) && (
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('');
              setSelectedServer('');
            }}
            className="clear-filters-btn"
          >
            ❌ Limpar Filtros
          </button>
        )}
      </div>

      <div className="tools-grid">
        {filteredTools.map(tool => (
          <div key={`${tool.serverId}-${tool.toolName}`} className="tool-card">
            <div className="tool-card-header">
              <h3>{tool.ptName || tool.toolName}</h3>
              <span className="server-badge">{tool.serverId}</span>
            </div>

            <div className="tool-card-body">
              <p className="tool-description">
                {tool.ptDescription || tool.description}
              </p>

              <div className="tool-meta">
                {tool.category && (
                  <span className="meta-badge category">{tool.category}</span>
                )}
                {tool.complexity && (
                  <span className={`meta-badge complexity ${tool.complexity}`}>
                    {tool.complexity}
                  </span>
                )}
                {tool.reliabilityScore !== undefined && (
                  <span className="meta-badge reliability">
                    ⭐ {tool.reliabilityScore}/10
                  </span>
                )}
              </div>

              <button
                onClick={() => onToolSelect(tool)}
                className="test-tool-btn"
              >
                🧪 Testar Ferramenta
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredTools.length === 0 && (
        <div className="empty-state">
          <p>Nenhuma ferramenta encontrada com os filtros aplicados.</p>
        </div>
      )}
    </div>
  );
}
