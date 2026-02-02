import { useState, useEffect } from 'react';
import { TitleBar } from './components/titlebar';
import { Sidebar } from './components/sidebar';
import { ToolContainer } from './components/tool-container';
import { Dashboard } from './components/dashboard';
import { toolRegistry } from './tools/registry';

function App(): JSX.Element {
  const [activeToolId, setActiveToolId] = useState<string | null>(null);
  const tools = toolRegistry.getAll();

  // Listen for snap:navigate event from global shortcut
  useEffect(() => {
    const unsubscribe = window.api.snap.onNavigate(() => {
      setActiveToolId('snap');
    });
    return () => unsubscribe();
  }, []);

  return (
    <>
      <TitleBar />
      <div className="app">
        <Sidebar
          tools={tools}
          activeToolId={activeToolId}
          onSelectTool={setActiveToolId}
        />
        <main className="main-content">
          {activeToolId ? (
            <ToolContainer toolId={activeToolId} />
          ) : (
            <Dashboard tools={tools} onSelectTool={setActiveToolId} />
          )}
        </main>
      </div>
    </>
  );
}

export default App;
