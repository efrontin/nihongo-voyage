import { Injectable, inject } from '@angular/core';
import { StoreService } from './store.service';

/** Synthèse vocale japonaise du navigateur (voix « Kyoko » / « Otoya » sur Mac et iPhone). */
@Injectable({ providedIn: 'root' })
export class SpeechService {
  private readonly store = inject(StoreService);
  private voice: SpeechSynthesisVoice | null = null;

  readonly supported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  constructor() {
    if (!this.supported) return;
    const pick = () => {
      const voices = speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith('ja'));
      this.voice = voices.find((v) => /kyoko|otoya|google/i.test(v.name)) ?? voices[0] ?? null;
    };
    pick();
    speechSynthesis.addEventListener('voiceschanged', pick);
  }

  speak(text: string): void {
    if (!this.supported) return;
    // « 〜 » et « / » se lisent mal : on les retire
    const clean = text.replace(/[〜~]/g, '').replace(/\s*\/\s*/g, '、');
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(clean);
    u.lang = 'ja-JP';
    u.rate = this.store.settings().speechRate;
    if (this.voice) u.voice = this.voice;
    speechSynthesis.speak(u);
  }
}
