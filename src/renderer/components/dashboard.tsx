import React, { useState, useEffect } from 'react';
import { ToolMetadata } from '@/shared/types';
import { Command, Camera, Zap, Lightbulb } from 'lucide-react';

interface DashboardProps {
  tools: ToolMetadata[];
  onSelectTool: (id: string) => void;
}

export function Dashboard({ tools, onSelectTool }: DashboardProps): JSX.Element {
  const [tip, setTip] = useState('');

  const tips = [
    "Press ⌘+Shift+V to toggle the clipboard history popup anywhere.",
    "Use ⌘+Shift+C to capture a screen region quickly.",
    "You can navigate the clipboard history with arrow keys.",
    "Press Esc to close the popup or clear selection.",
    "Double-click an item in the clipboard history to paste it immediately."
  ];

  useEffect(() => {
    setTip(tips[Math.floor(Math.random() * tips.length)]);
  }, []);

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Welcome to xToolbox</h1>
        <p>Your productivity toolkit</p>
      </div>

      <div className="dashboard-section">
        <h2>Quick Actions</h2>
        <div className="quick-actions-grid">
          {tools.map(tool => (
            <button 
              key={tool.id} 
              className="quick-action-card"
              onClick={() => onSelectTool(tool.id)}
            >
              <div className="action-icon">
                {tool.id === 'clipboard-manager' ? <Command size={24} /> : 
                 tool.id === 'snap' ? <Camera size={24} /> : <Zap size={24} />}
              </div>
              <span className="action-label">Open {tool.name}</span>
            </button>
          ))}
          
          <button 
            className="quick-action-card secondary"
            onClick={() => window.api.snap.captureRegion()}
          >
            <div className="action-icon">
              <Camera size={24} />
            </div>
            <span className="action-label">Capture Region</span>
          </button>
        </div>
      </div>

      <div className="dashboard-section">
        <h2><Lightbulb size={18} style={{ display: 'inline', marginRight: '8px' }}/>Tip of the Day</h2>
        <div className="tip-card">
          <p>{tip}</p>
        </div>
      </div>
    </div>
  );
}
