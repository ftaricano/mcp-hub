import { useState, useEffect } from 'react';
import './App.css';
import { Dashboard } from './components/Dashboard';
import { ServerList } from './components/ServerList';
import { ToolBrowser } from './components/ToolBrowser';
import { ToolTester } from './components/ToolTester';
import type { ServerInfo, ToolInfo } from './lib/api';
import { api } from './lib/api';

type View = 'dashboard' | 'servers' | 'tools' | 'tester';

function App() {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [servers, setServers] = useState<ServerInfo[]>([]);
  const [tools, setTools] = useState<ToolInfo[]>([]);
  const [selectedTool, setSelectedTool] = useState<ToolInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load servers and tools on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [serversData, toolsData] = await Promise.all([api.getServers(), api.getAllTools()]);

      setServers(serversData.servers);
      setTools(toolsData.tools);
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToolSelect = (tool: ToolInfo) => {
    setSelectedTool(tool);
    setCurrentView('tester');
  };

  if (loading) {
    return (
      <div className="app">
        <div className="loading">
          <div className="spinner"></div>
          <p>Carregando MCP Hub...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app">
        <div className="error">
          <h2>❌ Erro</h2>
          <p>{error}</p>
          <button onClick={loadData}>Tentar Novamente</button>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>🧪 MCP Hub Testing Interface</h1>
        <nav className="app-nav">
          <button
            className={currentView === 'dashboard' ? 'active' : ''}
            onClick={() => setCurrentView('dashboard')}
          >
            📊 Dashboard
          </button>
          <button
            className={currentView === 'servers' ? 'active' : ''}
            onClick={() => setCurrentView('servers')}
          >
            🖥️ Servidores
          </button>
          <button
            className={currentView === 'tools' ? 'active' : ''}
            onClick={() => setCurrentView('tools')}
          >
            🔧 Ferramentas
          </button>
          <button
            className={currentView === 'tester' ? 'active' : ''}
            onClick={() => setCurrentView('tester')}
            disabled={!selectedTool}
          >
            🧪 Testar
          </button>
          <button onClick={loadData} className="refresh-btn">
            🔄 Atualizar
          </button>
        </nav>
      </header>

      <main className="app-main">
        {currentView === 'dashboard' && <Dashboard servers={servers} tools={tools} />}
        {currentView === 'servers' && <ServerList servers={servers} onRefresh={loadData} />}
        {currentView === 'tools' && <ToolBrowser tools={tools} onToolSelect={handleToolSelect} />}
        {currentView === 'tester' && selectedTool && (
          <ToolTester tool={selectedTool} onBack={() => setCurrentView('tools')} />
        )}
      </main>

      <footer className="app-footer">
        <p>
          MCP Hub Testing Interface · {servers.length} servidores · {tools.length} ferramentas
        </p>
      </footer>
    </div>
  );
}

export default App;
