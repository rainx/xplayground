import { Tool, ToolMetadata } from '@/shared/types';

// Import tools here as they are created
// import * as ExampleTool from './example';

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

// Register tools here
// toolRegistry.register({
//   metadata: ExampleTool.metadata,
//   Component: ExampleTool.Component,
// });
