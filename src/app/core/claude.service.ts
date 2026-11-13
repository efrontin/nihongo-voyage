import { Injectable, inject } from '@angular/core';
import { ChatMessage } from './models';
import { StoreService } from './store.service';
import { Scenario, TutorReply, apiSystemPrompt } from './claude.prompts';

export { SCENARIOS, buildAppPrompt } from './claude.prompts';
export type { Scenario, TutorReply } from './claude.prompts';

@Injectable({ providedIn: 'root' })
export class ClaudeService {
  private readonly store = inject(StoreService);

  async reply(scenario: Scenario, history: ChatMessage[]): Promise<TutorReply> {
    const { apiKey, model } = this.store.settings();
    if (!apiKey) throw new Error('Ajoute ta clé API Anthropic dans les réglages.');

    const messages: ChatMessage[] = history.length
      ? history
      : [{ role: 'user', content: '(Commence la scène.)' }];

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        // la clé reste sur ton appareil ; cet en-tête autorise l'appel direct depuis le navigateur
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({ model, max_tokens: 700, system: apiSystemPrompt(scenario), messages }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Erreur API (${res.status}) : ${body.slice(0, 200)}`);
    }
    const data = (await res.json()) as { content: { type: string; text?: string }[] };
    const text = data.content.filter((b) => b.type === 'text').map((b) => b.text ?? '').join('');
    return parseReply(text);
  }
}

export function parseReply(text: string): TutorReply {
  const match = text.match(/\{[\s\S]*\}/);
  try {
    const obj = JSON.parse(match ? match[0] : text) as Partial<TutorReply>;
    return {
      jp: obj.jp ?? '',
      kana: obj.kana ?? '',
      romaji: obj.romaji ?? '',
      fr: obj.fr ?? '',
      correction: obj.correction ?? null,
      suggestions: Array.isArray(obj.suggestions) ? obj.suggestions : [],
    };
  } catch {
    return { jp: text, kana: '', romaji: '', fr: '', correction: null, suggestions: [] };
  }
}
