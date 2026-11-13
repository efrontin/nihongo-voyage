import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Grade } from '../core/models';
import { SpeechService } from '../core/speech.service';
import { formatDelay } from '../core/srs';
import { LEARN_AHEAD, StoreService, parseCardId } from '../core/store.service';
import { THEMES } from '../data/vocab';

@Component({
  selector: 'app-review',
  imports: [RouterLink],
  host: { '(document:keydown)': 'onKey($event)' },
  template: `
    @if (current(); as c) {
      <div class="progress row small muted">
        <span>{{ done() }} faite(s)</span>
        <span class="spacer"></span>
        <span>{{ queue().length }} restante(s)</span>
      </div>

      <article class="card" [class.prod]="c.dir === 'prod'">
        <div class="meta row">
          <span class="chip">{{ themeLabel(c.entry.theme) }}</span>
          <span class="chip">{{ c.dir === 'rec' ? '👂 Comprendre' : '🗣️ Dire' }}</span>
          @if (c.isNew) { <span class="chip new">Nouveau</span> }
          <span class="spacer"></span>
          @if (c.dir === 'rec' || revealed()) {
            <button class="icon-btn" (click)="speak()" aria-label="Écouter">🔊</button>
          }
        </div>

        <div class="front">
          @if (c.dir === 'rec') {
            <p class="jp big">{{ c.entry.jp }}</p>
          } @else {
            <p class="fr-big">{{ c.entry.fr }}</p>
            <p class="muted small">Comment le dire en japonais ?</p>
          }
        </div>

        @if (revealed()) {
          <div class="back">
            @if (c.dir === 'prod') { <p class="jp big">{{ c.entry.jp }}</p> }
            @if (c.entry.kana !== c.entry.jp) { <p class="jp kana">{{ c.entry.kana }}</p> }
            @if (store.settings().showRomaji) { <p class="romaji">{{ c.entry.romaji }}</p> }
            @if (c.dir === 'rec') { <p class="fr">{{ c.entry.fr }}</p> }
            @if (c.entry.note) { <p class="note small">💡 {{ c.entry.note }}</p> }
          </div>
        }
      </article>

      @if (!revealed()) {
        <button class="btn-primary btn-block" (click)="reveal()">Afficher la réponse <span class="kbd">espace</span></button>
      } @else {
        <div class="grades">
          @for (g of grades; track g.value) {
            <button [class]="'grade g' + g.value" (click)="answer(g.value)">
              <strong>{{ g.label }}</strong>
              <span class="small">{{ delay(g.value) }}</span>
            </button>
          }
        </div>
      }
    } @else {
      <section class="empty">
        <p class="jp big">お疲れ様でした！</p>
        <p class="muted">« Beau travail ! » — plus rien à réviser pour le moment.</p>
        @if (done() > 0) { <p>{{ done() }} carte(s) révisée(s) pendant cette session.</p> }
        @if (later() > 0) { <p class="muted small">{{ later() }} carte(s) en apprentissage reviendront dans moins d'une heure.</p> }
        <div class="actions">
          @if (moreAvailable()) {
            <button class="btn-primary" (click)="learnMore()">Apprendre 5 mots de plus</button>
          }
          <a class="btn" routerLink="/conversation">S'entraîner à parler</a>
          <a class="btn" routerLink="/">Accueil</a>
        </div>
      </section>
    }
  `,
  styles: `
    .progress { margin-bottom: 10px; }
    .card {
      background: #fffdf8; border: 1px solid var(--line); border-radius: 18px;
      padding: 16px 18px 22px; min-height: 300px; margin-bottom: 14px;
      box-shadow: 0 6px 0 var(--paper-2);
      display: flex; flex-direction: column;
    }
    .card.prod { border-top: 4px solid var(--shu); }
    .card:not(.prod) { border-top: 4px solid var(--indigo); }
    .chip.new { background: #f3d9d4; color: var(--shu); }
    .front, .back { text-align: center; }
    .front { flex: 1; display: flex; flex-direction: column; justify-content: center; padding: 24px 0 8px; }
    .back { border-top: 1px dashed var(--line); padding-top: 14px; }
    .big { font-size: clamp(1.8rem, 8vw, 2.8rem); line-height: 1.25; margin: 0; word-break: keep-all; overflow-wrap: anywhere; }
    .fr-big { font-size: 1.4rem; font-weight: 600; margin: 0 0 6px; }
    .kana { font-size: 1.2rem; margin: 6px 0 0; }
    .romaji { color: var(--ink-2); font-style: italic; margin: 4px 0 0; }
    .fr { font-size: 1.15rem; font-weight: 600; margin: 10px 0 0; }
    .note { background: var(--paper); border-radius: 10px; padding: 8px 10px; margin: 12px 0 0; text-align: left; }
    .kbd { font-size: 0.7rem; opacity: 0.7; border: 1px solid rgba(255,255,255,.4); border-radius: 4px; padding: 0 4px; }
    .grades { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
    .grade { flex-direction: column; padding: 12px 4px; gap: 2px; color: #fff; border: none; }
    .g1 { background: var(--shu); }
    .g2 { background: #b7832f; }
    .g3 { background: var(--matcha); }
    .g4 { background: var(--indigo-2); }
    .empty { text-align: center; padding-top: 40px; }
    .actions { display: flex; flex-direction: column; gap: 10px; margin-top: 20px; }
  `,
})
export class ReviewPage implements OnInit {
  protected readonly store = inject(StoreService);
  private readonly speech = inject(SpeechService);

  protected readonly queue = signal<string[]>([]);
  protected readonly revealed = signal(false);
  protected readonly done = signal(0);
  protected readonly later = signal(0);
  private readonly now = signal(Date.now());

  protected readonly grades: { value: Grade; label: string }[] = [
    { value: 1, label: 'À revoir' },
    { value: 2, label: 'Difficile' },
    { value: 3, label: 'Bien' },
    { value: 4, label: 'Facile' },
  ];

  protected readonly current = computed(() => {
    const id = this.queue()[0];
    if (!id) return null;
    const { entryId, dir } = parseCardId(id);
    const entry = this.store.entryById().get(entryId);
    if (!entry) return null;
    return { id, dir, entry, isNew: !this.store.cards()[id] };
  });

  protected readonly moreAvailable = computed(() => {
    this.store.cards();
    return this.store.newCardsAvailable(1).length > 0;
  });

  ngOnInit(): void {
    this.queue.set(this.store.buildSession());
    this.autoSpeak();
  }

  protected themeLabel(id: string): string {
    return THEMES.find((t) => t.id === id)?.label ?? id;
  }

  protected reveal(): void {
    this.now.set(Date.now());
    this.revealed.set(true);
    if (this.current()?.dir === 'prod') this.speak();
  }

  protected delay(g: Grade): string {
    const c = this.current();
    if (!c) return '';
    return formatDelay(this.store.preview(c.id, g, this.now()).due, this.now());
  }

  protected answer(g: Grade): void {
    const c = this.current();
    if (!c) return;
    const now = Date.now();
    const after = this.store.grade(c.id, g, now);
    this.done.update((n) => n + 1);
    const rest = this.queue().slice(1);
    if (after.due - now < LEARN_AHEAD) {
      // la carte revient plus tard dans la même session
      rest.splice(Math.min(rest.length, 4), 0, c.id);
    } else if (after.status !== 'review') {
      this.later.update((n) => n + 1);
    }
    this.queue.set(rest);
    this.revealed.set(false);
    this.autoSpeak();
  }

  protected learnMore(): void {
    this.queue.set(this.store.newCardsAvailable(5));
    this.autoSpeak();
  }

  protected speak(): void {
    const c = this.current();
    if (c) this.speech.speak(c.entry.kana || c.entry.jp);
  }

  private autoSpeak(): void {
    if (this.current()?.dir === 'rec') setTimeout(() => this.speak(), 150);
  }

  onKey(e: KeyboardEvent): void {
    if (!this.current() || (e.target as HTMLElement)?.tagName === 'INPUT') return;
    if (!this.revealed() && (e.key === ' ' || e.key === 'Enter')) {
      e.preventDefault();
      this.reveal();
    } else if (this.revealed() && ['1', '2', '3', '4'].includes(e.key)) {
      this.answer(Number(e.key) as Grade);
    } else if (e.key === 'r') {
      this.speak();
    }
  }
}
