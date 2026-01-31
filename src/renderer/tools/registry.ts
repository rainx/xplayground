import { Tool, ToolMetadata } from '@/shared/types';

// Import tools
import * as ClipboardManagerTool from './clipboard-manager';

class ToolRegistry {
  private tools: Map<string, Tool> = new Map();

  register(tool: Tool): void {
    this.tools.set(tool.metadata.id, tool);
  }

  get(id: string): Tool | undefined {
    return this.tools.get(id);
  }

  getAll(): ToolMetadata[] {
    return Array.from(this.tools.values()).map((t) => t.metadata);
  }
}

export const toolRegistry = new ToolRegistry();

// Register tools
toolRegistry.register({
  metadata: ClipboardManagerTool.metadata,
  Component: ClipboardManagerTool.Component,
});
