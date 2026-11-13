import { Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ClaudeService, SCENARIOS, Scenario, TutorReply, buildAppPrompt } from '../core/claude.service';
import { parseCardsFromText } from '../core/import';
import { ChatMessage } from '../core/models';
import { SpeechService } from '../core/speech.service';
import { StoreService } from '../core/store.service';

interface Turn {
  role: 'user' | 'assistant';
  text: string;
  reply?: TutorReply;
  showFr?: boolean;
  saved?: boolean;
}

// Reconnaissance vocale (Safari / Chrome)
type Recognition = {
  lang: string;
  interimResults: boolean;
  onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void;
  onend: () => void;
  onerror: () => void;
  start: () => void;
};
const SpeechRecognitionCtor: (new () => Recognition) | undefined =
  typeof window !== 'undefined'
    ? ((window as unknown as Record<string, unknown>)['SpeechRecognition'] as new () => Recognition) ??
      ((window as unknown as Record<string, unknown>)['webkitSpeechRecognition'] as new () => Recognition)
    : undefined;

@Component({
  selector: 'app-conversation',
  imports: [FormsModule, RouterLink, NgTemplateOutlet],
  template: `
    @if (!scenario()) {
      <h1>Jeu de rôle</h1>
      <p class="muted">Choisis une situation. Claude joue le Japonais en face de toi, corrige tes phrases et te souffle des réponses.</p>
      @if (!store.settings().apiKey) {
        <p class="info small">Mode gratuit : la scène s'ouvre dans l'app Claude (offre gratuite, mode vocal compris). Avec une clé API (<a routerLink="/reglages">réglages</a>), elle se joue directement ici.</p>
      }
      <div class="grid">
        @for (s of scenarios; track s.id) {
          <button class="scn" (click)="start(s)">
            <span class="ico">{{ s.icon }}</span>
            <strong>{{ s.label }}</strong>
            <span class="small muted">{{ s.goal }}</span>
          </button>
        }
      </div>
      <ng-container *ngTemplateOutlet="importBlock" />
    } @else if (mode() === 'app') {
      <div class="top row">
        <button class="icon-btn" (click)="stop()" aria-label="Retour">←</button>
        <strong>{{ scenario()!.icon }} {{ scenario()!.label }}</strong>
      </div>

      <ol class="steps">
        <li>
          <button class="btn-primary btn-block" (click)="openInClaude()">Copier la scène et ouvrir Claude</button>
          @if (copied() === true) { <p class="small ok">✓ Scène copiée. Si le message n'est pas déjà rempli dans Claude, colle-le.</p> }
          @if (copied() === false) { <p class="small warn">Copie impossible ici : ouvre « Voir le message de la scène » ci-dessous et copie-le à la main.</p> }
        </li>
        <li>
          Dans l'app Claude, envoie le message. Pour <strong>parler</strong>, touche l'icône du mode vocal.
          <span class="muted small">La première fois, choisis le japonais dans Réglages → Voix → Langue parlée.</span>
        </li>
        <li>Pendant la scène : dis « <span class="jp">aide</span> » pour des idées de réponse, « traduis » si tu bloques.</li>
        <li>À la fin, dis « fin » : Claude te donne la liste des phrases. Copie-la et colle-la ci-dessous.</li>
      </ol>

      <details class="prompt">
        <summary class="small">Voir le message de la scène</summary>
        <pre>{{ appPrompt() }}</pre>
      </details>

      <ng-container *ngTemplateOutlet="importBlock" />
    } @else {
      <div class="top row">
        <button class="icon-btn" (click)="stop()" aria-label="Retour">←</button>
        <strong>{{ scenario()!.icon }} {{ scenario()!.label }}</strong>
        <span class="spacer"></span>
        <button class="small" (click)="start(scenario()!)">Recommencer</button>
      </div>

      <div class="chat" #chat>
        @for (t of turns(); track $index) {
          @if (t.role === 'user') {
            <div class="bubble me jp">{{ t.text }}</div>
          } @else {
            @if (t.reply; as r) {
            <div class="bubble them">
              @if (r.correction) { <p class="corr small">✏️ {{ r.correction }}</p> }
              <p class="jp line">{{ r.jp }}</p>
              @if (r.kana && r.kana !== r.jp) { <p class="jp kana">{{ r.kana }}</p> }
              @if (store.settings().showRomaji && r.romaji) { <p class="romaji">{{ r.romaji }}</p> }
              @if (t.showFr) { <p class="fr">{{ r.fr }}</p> }
              <div class="row acts">
                <button class="icon-btn" (click)="speech.speak(r.kana || r.jp)" aria-label="Écouter">🔊</button>
                <button class="small" (click)="toggleFr(t)">{{ t.showFr ? 'Masquer' : 'Traduire' }}</button>
                <button class="small" (click)="save(t)" [disabled]="t.saved">{{ t.saved ? '✓ Ajoutée' : '＋ Carte' }}</button>
              </div>
            </div>
            }
          }
        }
        @if (loading()) { <div class="bubble them muted">…</div> }
        @if (error()) { <p class="warn small">{{ error() }}</p> }
      </div>

      @if (lastSuggestions().length) {
        <div class="sugg">
          @for (s of lastSuggestions(); track $index) {
            <button (click)="input.set(s.jp)" [title]="s.fr">
              <span class="jp">{{ s.jp }}</span>
              <span class="small muted">{{ s.fr }}</span>
            </button>
          }
        </div>
      }

      <form class="composer row" (ngSubmit)="send()">
        @if (canListen) {
          <button type="button" class="icon-btn" [class.rec]="listening()" (click)="listen()" aria-label="Parler">🎤</button>
        }
        <input name="msg" [(ngModel)]="input" placeholder="Réponds en japonais, romaji ou français…" autocomplete="off" />
        <button class="btn-primary" type="submit" [disabled]="!input().trim() || loading()">送る</button>
      </form>
    }

    <ng-template #importBlock>
      <section class="import">
        <h2>Ramener les phrases dans mes révisions</h2>
        <textarea rows="5" [ngModel]="pasted()" (ngModelChange)="pasted.set($event)"
          placeholder="Colle ici la liste donnée par Claude à la fin de la scène :&#10;日本語 | かな | romaji | français"></textarea>
        <div class="row">
          <span class="muted small">{{ preview().length }} phrase(s) reconnue(s)</span>
          <span class="spacer"></span>
          <button class="btn-primary" (click)="importPasted()" [disabled]="!preview().length">Ajouter à mes cartes</button>
        </div>
        @if (imported() === 0) {
          <p class="small muted">Ces phrases sont déjà toutes dans tes cartes.</p>
        } @else if (imported() !== null) {
          <p class="small ok">✓ {{ imported() }} nouvelle(s) carte(s) dans « Mes cartes ». Elles arrivent dans tes prochaines révisions.</p>
        }
      </section>
    </ng-template>
  `,
  styles: `
    .info { background: #e6ebf3; color: var(--indigo); padding: 10px 12px; border-radius: 10px; }
    .ok { color: var(--matcha); }
    .steps { padding-left: 20px; margin: 4px 0 12px; }
    .steps li { margin-bottom: 12px; }
    .prompt pre { white-space: pre-wrap; font-family: var(--jp); font-size: 0.8rem; background: #fffdf8; border: 1px solid var(--line); border-radius: 10px; padding: 10px; }
    .import textarea { font-family: var(--jp); font-size: 0.9rem; margin-bottom: 8px; }
    .warn { background: #f3d9d4; color: #7a2418; padding: 10px 12px; border-radius: 10px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 14px; }
    .scn { flex-direction: column; align-items: flex-start; text-align: left; padding: 12px; gap: 4px; }
    .scn .ico { font-size: 1.6rem; }
    .top { margin-bottom: 10px; }
    .chat { display: flex; flex-direction: column; gap: 10px; padding-bottom: 8px; }
    .bubble { max-width: 88%; padding: 10px 12px; border-radius: 14px; }
    .bubble p { margin: 0; }
    .me { align-self: flex-end; background: var(--indigo); color: #fff; border-bottom-right-radius: 4px; }
    .them { align-self: flex-start; background: #fffdf8; border: 1px solid var(--line); border-bottom-left-radius: 4px; }
    .line { font-size: 1.15rem; }
    .kana { color: var(--ink-2); font-size: 0.9rem; }
    .romaji { color: var(--ink-2); font-style: italic; font-size: 0.85rem; }
    .fr { margin-top: 6px !important; font-weight: 600; }
    .corr { background: #fbf0d9; border-radius: 8px; padding: 6px 8px; margin-bottom: 8px !important; }
    .acts { margin-top: 8px; gap: 6px; }
    .acts button { padding: 4px 10px; font-size: 0.8rem; }
    .sugg { display: flex; gap: 6px; overflow-x: auto; padding: 6px 0; }
    .sugg button { flex-direction: column; align-items: flex-start; white-space: nowrap; padding: 6px 10px; }
    .composer {
      position: sticky; bottom: calc(70px + env(safe-area-inset-bottom));
      background: var(--paper); padding: 8px 0;
    }
    .rec { background: var(--shu); color: #fff; }
  `,
})
export class ConversationPage {
  protected readonly store = inject(StoreService);
  protected readonly speech = inject(SpeechService);
  private readonly claude = inject(ClaudeService);
  private readonly chatEl = viewChild<ElementRef<HTMLElement>>('chat');

  protected readonly scenarios = SCENARIOS;
  protected readonly scenario = signal<Scenario | null>(null);
  protected readonly turns = signal<Turn[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal('');
  protected readonly lastSuggestions = signal<TutorReply['suggestions']>([]);
  protected readonly listening = signal(false);
  protected readonly canListen = !!SpeechRecognitionCtor;
  protected readonly input = signal('');

  protected readonly mode = signal<'app' | 'api'>('app');
  protected readonly copied = signal<boolean | null>(null);
  protected readonly pasted = signal('');
  protected readonly imported = signal<number | null>(null);
  protected readonly appPrompt = computed(() => {
    const s = this.scenario();
    return s ? buildAppPrompt(s) : '';
  });
  protected readonly preview = computed(() => parseCardsFromText(this.pasted()));

  protected start(s: Scenario): void {
    this.mode.set(this.store.settings().apiKey ? 'api' : 'app');
    this.copied.set(null);
    this.imported.set(null);
    this.scenario.set(s);
    if (this.mode() === 'app') return;
    this.turns.set([]);
    this.lastSuggestions.set([]);
    this.ask();
  }

  protected stop(): void {
    this.scenario.set(null);
    this.turns.set([]);
    this.imported.set(null);
    this.copied.set(null);
  }

  protected send(): void {
    const text = this.input().trim();
    if (!text || this.loading()) return;
    this.input.set('');
    this.turns.update((t) => [...t, { role: 'user', text }]);
    this.ask();
  }

  private async ask(): Promise<void> {
    const s = this.scenario();
    if (!s) return;
    this.loading.set(true);
    this.error.set('');
    this.lastSuggestions.set([]);
    const history: ChatMessage[] = this.turns().map((t) => ({ role: t.role, content: t.text }));
    try {
      const reply = await this.claude.reply(s, history);
      this.turns.update((t) => [...t, { role: 'assistant', text: JSON.stringify(reply), reply }]);
      this.lastSuggestions.set(reply.suggestions);
      this.speech.speak(reply.kana || reply.jp);
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : String(e));
    } finally {
      this.loading.set(false);
      setTimeout(() => this.chatEl()?.nativeElement.lastElementChild?.scrollIntoView({ behavior: 'smooth', block: 'end' }), 50);
    }
  }

  /** Copie la scène puis ouvre une nouvelle conversation Claude (l'app mobile si elle est installée). */
  protected openInClaude(): void {
    const prompt = this.appPrompt();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(prompt).then(
        () => this.copied.set(true),
        () => this.copied.set(false),
      );
    } else {
      this.copied.set(false);
    }
    window.open(`https://claude.ai/new?q=${encodeURIComponent(prompt)}`, '_blank', 'noopener');
  }

  protected importPasted(): void {
    this.imported.set(this.store.importCards(this.preview()));
    this.pasted.set('');
  }

  protected toggleFr(t: Turn): void {
    this.turns.update((list) => list.map((x) => (x === t ? { ...x, showFr: !x.showFr } : x)));
  }

  protected save(t: Turn): void {
    const r = t.reply;
    if (!r) return;
    this.store.addCustom({ jp: r.jp, kana: r.kana || r.jp, romaji: r.romaji, fr: r.fr, type: 'phrase', priority: 1 });
    this.turns.update((list) => list.map((x) => (x === t ? { ...x, saved: true } : x)));
  }

  protected listen(): void {
    if (!SpeechRecognitionCtor || this.listening()) return;
    const rec = new SpeechRecognitionCtor();
    rec.lang = 'ja-JP';
    rec.interimResults = false;
    rec.onresult = (e) => {
      this.input.set(e.results[0][0].transcript);
    };
    rec.onend = () => this.listening.set(false);
    rec.onerror = () => this.listening.set(false);
    this.listening.set(true);
    rec.start();
  }
}
