import { toolRegistry } from '@/tools/registry';

interface ToolContainerProps {
  toolId: string;
}

export function ToolContainer({ toolId }: ToolContainerProps): JSX.Element {
  const tool = toolRegistry.get(toolId);

  if (!tool) {
    return (
      <div className="tool-container">
        <p>Tool not found: {toolId}</p>
      </div>
    );
  }

  const { Component } = tool;

  return (
    <div className="tool-container">
      <Component />
    </div>
  );
}
