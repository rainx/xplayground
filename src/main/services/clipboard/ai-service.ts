/**
 * AI Service - OpenAI-compatible API integration for text modification
 */

import type { AISettings } from './types';

export class AIService {
  private settings: AISettings | null = null;

  setSettings(settings: AISettings): void {
    this.settings = settings;
  }

  getSettings(): AISettings | null {
    return this.settings;
  }

  async modifyText(originalText: string, instruction: string): Promise<string> {
    if (!this.settings || !this.settings.apiKey) {
      throw new Error('AI settings not configured. Please set your API key in settings.');
    }

    const baseUrl = this.settings.baseUrl || 'https://api.openai.com/v1';
    const model = this.settings.model || 'gpt-4o-mini';

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.settings.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: 'You are a text modification assistant. Modify the user\'s text according to their instructions. Return only the modified text without any explanations, prefixes, or formatting.',
          },
          {
            role: 'user',
            content: `Original text:\n${originalText}\n\nInstruction: ${instruction}`,
          },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      let errorMessage = `API request failed with status ${response.status}`;
      try {
        const errorData = await response.json() as { error?: { message?: string } };
        if (errorData.error?.message) {
          errorMessage = errorData.error.message;
        }
      } catch {
        // Ignore JSON parsing errors
      }
      throw new Error(errorMessage);
    }

    const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No response from AI model');
    }

    return content.trim();
  }
}

// Singleton instance
let instance: AIService | null = null;

export function getAIService(): AIService {
  if (!instance) {
    instance = new AIService();
  }
  return instance;
}
