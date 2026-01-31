import { ToolMetadata } from '@/shared/types';

interface SidebarProps {
  tools: ToolMetadata[];
  activeToolId: string | null;
  onSelectTool: (id: string) => void;
}

export function Sidebar({
  tools,
  activeToolId,
  onSelectTool,
}: SidebarProps): JSX.Element {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h2>Tools</h2>
      </div>
      <nav className="tool-list">
        {tools.length === 0 ? (
          <p style={{ padding: '12px', color: 'var(--text-secondary)', fontSize: '13px' }}>
            No tools installed yet.
          </p>
        ) : (
          tools.map((tool) => (
            <div
              key={tool.id}
              className={`tool-item ${activeToolId === tool.id ? 'active' : ''}`}
              onClick={() => onSelectTool(tool.id)}
            >
              <span className="tool-item-name">{tool.name}</span>
            </div>
          ))
        )}
      </nav>
    </aside>
  );
}
