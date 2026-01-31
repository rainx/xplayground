import { ComponentType } from 'react';

export interface ToolMetadata {
  id: string;
  name: string;
  description: string;
  icon?: string;
}

export type ToolComponent = ComponentType<Record<string, never>>;

export interface Tool {
  metadata: ToolMetadata;
  Component: ToolComponent;
}
