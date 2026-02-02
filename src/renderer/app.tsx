import { useState, useEffect } from 'react';
import { Sidebar } from './components/sidebar';
import { ToolContainer } from './components/tool-container';
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
          <div className="welcome">
            <h1>xToolbox</h1>
            <p>Select a tool from the sidebar to get started.</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
