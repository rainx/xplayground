import { useState } from 'react';
import { ToolMetadata } from '@/shared/types';
import { KeyboardShortcutsDialog } from './keyboard-shortcuts-dialog';
import logo from '../assets/logo.svg';

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
  const [showShortcutsDialog, setShowShortcutsDialog] = useState(false);

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <img src={logo} alt="xToolbox Logo" className="sidebar-logo" />
        <span className="sidebar-title">xToolbox</span>
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

      <div className="sidebar-footer">
        <button
          className="settings-btn"
          onClick={() => setShowShortcutsDialog(true)}
          title="Keyboard Shortcuts"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 12h.01M12 12h.01M16 12h.01M6 16h8" />
          </svg>
          <span>Shortcuts</span>
        </button>
      </div>

      <KeyboardShortcutsDialog
        isOpen={showShortcutsDialog}
        onClose={() => setShowShortcutsDialog(false)}
      />
    </aside>
  );
}
