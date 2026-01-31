/**
 * Category Storage - Manages category persistence
 */

import { app } from 'electron';
import * as fs from 'fs/promises';
import * as path from 'path';
import type { Category, CategoryCreateInput, CategoryUpdateInput } from './types';

const DEFAULT_COLORS = [
  '#4285f4', // Blue
  '#ea4335', // Red
  '#fbbc04', // Yellow
  '#34a853', // Green
  '#ff6d01', // Orange
  '#46bdc6', // Teal
  '#7b1fa2', // Purple
  '#c2185b', // Pink
];

export class CategoryStorage {
  private categoriesPath: string = '';
  private categoriesCache: Category[] = [];
  private initialized: boolean = false;
  private colorIndex: number = 0;

  private initPaths(): void {
    if (this.initialized) return;

    const userDataPath = app.getPath('userData');
    this.categoriesPath = path.join(userDataPath, 'clipboard', 'data', 'categories.json');
    this.initialized = true;
  }

  async initialize(): Promise<void> {
    this.initPaths();
    await this.loadCategories();
  }

  private async loadCategories(): Promise<void> {
    try {
      const data = await fs.readFile(this.categoriesPath, 'utf-8');
      const parsed = JSON.parse(data);
      this.categoriesCache = parsed.categories || [];
      this.colorIndex = this.categoriesCache.length % DEFAULT_COLORS.length;
    } catch {
      this.categoriesCache = [];
    }
  }

  private async saveCategories(): Promise<void> {
    const data = {
      version: 1,
      lastModified: new Date().toISOString(),
      categories: this.categoriesCache,
    };

    // Ensure directory exists
    const dir = path.dirname(this.categoriesPath);
    await fs.mkdir(dir, { recursive: true });

    await fs.writeFile(this.categoriesPath, JSON.stringify(data, null, 2));
  }

  private generateId(): string {
    return `cat-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  }

  private getNextColor(): string {
    const color = DEFAULT_COLORS[this.colorIndex];
    this.colorIndex = (this.colorIndex + 1) % DEFAULT_COLORS.length;
    return color;
  }

  async getCategories(): Promise<Category[]> {
    return [...this.categoriesCache].sort((a, b) => a.order - b.order);
  }

  async getCategoryById(id: string): Promise<Category | null> {
    return this.categoriesCache.find((cat) => cat.id === id) || null;
  }

  async createCategory(input: CategoryCreateInput): Promise<Category> {
    const now = new Date().toISOString();
    const category: Category = {
      id: this.generateId(),
      name: input.name,
      icon: input.icon,
      color: input.color || this.getNextColor(),
      order: this.categoriesCache.length,
      createdAt: now,
      updatedAt: now,
    };

    this.categoriesCache.push(category);
    await this.saveCategories();
    return category;
  }

  async updateCategory(id: string, updates: CategoryUpdateInput): Promise<Category | null> {
    const index = this.categoriesCache.findIndex((cat) => cat.id === id);
    if (index === -1) return null;

    const category = this.categoriesCache[index];
    const updated: Category = {
      ...category,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    this.categoriesCache[index] = updated;
    await this.saveCategories();
    return updated;
  }

  async deleteCategory(id: string): Promise<boolean> {
    const index = this.categoriesCache.findIndex((cat) => cat.id === id);
    if (index === -1) return false;

    this.categoriesCache.splice(index, 1);

    // Reorder remaining categories
    this.categoriesCache.forEach((cat, i) => {
      cat.order = i;
    });

    await this.saveCategories();
    return true;
  }

  async reorderCategories(orderedIds: string[]): Promise<void> {
    const reordered: Category[] = [];

    for (let i = 0; i < orderedIds.length; i++) {
      const category = this.categoriesCache.find((cat) => cat.id === orderedIds[i]);
      if (category) {
        category.order = i;
        reordered.push(category);
      }
    }

    // Add any categories not in the ordered list at the end
    for (const category of this.categoriesCache) {
      if (!orderedIds.includes(category.id)) {
        category.order = reordered.length;
        reordered.push(category);
      }
    }

    this.categoriesCache = reordered;
    await this.saveCategories();
  }
}
