import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { hasProd } from '../core/cards';
import { CardDirection, VocabEntry } from '../core/models';
import { SpeechService } from '../core/speech.service';
import { StoreService } from '../core/store.service';
import { THEMES } from '../data/vocab';

interface Decision {
  entryId: string;
  /** sens écartés ; vide = « à apprendre » */
  dirs: CardDirection[];
}

/**
 * Tri rapide : on passe les entrées jamais vues et on écarte celles qu'on connaît déjà.
 * Une carte écartée part en révision à 21-30 jours ; les autres restent des nouvelles cartes.
 */
@Component({
  selector: 'app-triage',
  imports: [RouterLink],
  host: { '(document:keydown)': 'onKey($event)' },
  template: `
    <div class="top row">
      <a class="icon-btn" routerLink="/" aria-label="Retour">←</a>
      <strong>Tri rapide</strong>
      <span class="spacer"></span>
      @if (history().length) { <button class="small" (click)="undo()">↩︎ Annuler</button> }
    </div>

    @if (current(); as e) {
      <p class="muted small">
        Écarte ce que tu connais déjà : ces cartes ne reviendront que dans 3 à 4 semaines, pour vérification.
        Dans le doute, garde-la à apprendre.
      </p>
      <div class="progress row small muted">
        <span>{{ known() }} écartée(s)</span>
        <span class="spacer"></span>
        <span>{{ queue().length - index() }} restante(s)</span>
      </div>

      <article class="card">
        <div class="meta row">
          <span class="chip">{{ themeLabel(e.theme) }}</span>
          <span class="spacer"></span>
          <button class="icon-btn" (click)="speak()" aria-label="Écouter">🔊</button>
        </div>
        <p class="jp big">{{ e.jp }}</p>
        @if (shown()) {
          @if (e.kana !== e.jp) { <p class="jp kana">{{ e.kana }}</p> }
          <p class="fr">{{ e.fr }}</p>
        } @else {
          <button class="small show" (click)="shown.set(true)">Vérifier le sens <span class="kbd">espace</span></button>
        }
      </article>

      <div class="choices">
        <button class="learn" (click)="decide([])"><strong>À apprendre</strong><span class="small">reste une nouvelle carte</span></button>
        <button class="rec" (click)="decide(['rec'])"><strong>Je comprends</strong><span class="small">{{ canSay() ? 'reste à savoir la dire' : 'écartée' }}</span></button>
        @if (canSay()) {
          <button class="both" (click)="decide(['rec', 'prod'])"><strong>Je sais la dire</strong><span class="small">écartée</span></button>
        }
      </div>
    } @else {
      <section class="empty">
        <p class="jp big">よくできました！</p>
        @if (queue().length) {
          <p>{{ known() }} carte(s) écartée(s), {{ queue().length - known() }} à apprendre.</p>
        } @else {
          <p class="muted">Il n'y a plus rien à trier : toutes les cartes ont déjà été vues.</p>
        }
        <div class="actions">
          <a class="btn btn-primary" routerLink="/revision">Commencer la session</a>
          <a class="btn" routerLink="/">Accueil</a>
        </div>
      </section>
    }
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: `
    .top { margin-bottom: 8px; gap: 10px; }
    .top a { text-decoration: none; }
    .progress { margin-bottom: 10px; }
    .card {
      background: #fffdf8; border: 1px solid var(--line); border-top: 4px solid var(--matcha); border-radius: 18px;
      padding: 16px 18px 22px; min-height: 240px; margin-bottom: 14px; text-align: center;
      box-shadow: 0 6px 0 var(--paper-2);
    }
    .big { font-size: clamp(1.8rem, 8vw, 2.8rem); line-height: 1.25; margin: 28px 0 10px; word-break: keep-all; overflow-wrap: anywhere; }
    .kana { font-size: 1.2rem; margin: 0; }
    .fr { font-size: 1.15rem; font-weight: 600; margin: 10px 0 0; }
    .show { margin: 8px auto 0; }
    .kbd { font-size: 0.7rem; opacity: 0.7; border: 1px solid var(--line); border-radius: 4px; padding: 0 4px; }
    .choices { display: grid; grid-auto-flow: column; grid-auto-columns: 1fr; gap: 8px; }
    .choices button { flex-direction: column; padding: 12px 4px; gap: 2px; color: #fff; border: none; }
    .learn { background: var(--shu); }
    .rec { background: var(--indigo-2); }
    .both { background: var(--matcha); }
    .empty { text-align: center; padding-top: 40px; }
    .actions { display: flex; flex-direction: column; gap: 10px; margin-top: 20px; }
  `,
})
export class TriagePage implements OnInit {
  private readonly store = inject(StoreService);
  private readonly speech = inject(SpeechService);

  /** File figée à l'ouverture : les décisions ne la font pas bouger sous les doigts. */
  protected readonly queue = signal<VocabEntry[]>([]);
  protected readonly index = signal(0);
  protected readonly shown = signal(false);
  protected readonly history = signal<Decision[]>([]);

  protected readonly current = computed(() => this.queue()[this.index()] ?? null);
  protected readonly canSay = computed(() => {
    const e = this.current();
    return !!e && hasProd(e);
  });
  protected readonly known = computed(() => this.history().filter((d) => d.dirs.length).length);

  ngOnInit(): void {
    this.queue.set(this.store.triageQueue());
  }

  protected themeLabel(id: string): string {
    return THEMES.find((t) => t.id === id)?.label ?? id;
  }

  protected speak(): void {
    const e = this.current();
    if (e) this.speech.speak(e.kana || e.jp);
  }

  protected decide(dirs: CardDirection[]): void {
    const e = this.current();
    if (!e) return;
    if (dirs.length) this.store.markKnown(e.id, dirs);
    this.history.update((h) => [...h, { entryId: e.id, dirs }]);
    this.index.update((i) => i + 1);
    this.shown.set(false);
  }

  protected undo(): void {
    const last = this.history().at(-1);
    if (!last) return;
    if (last.dirs.length) this.store.unmarkKnown(last.entryId, last.dirs);
    this.history.update((h) => h.slice(0, -1));
    this.index.update((i) => i - 1);
    this.shown.set(false);
  }

  onKey(ev: KeyboardEvent): void {
    if (!this.current()) return;
    if (ev.key === ' ') {
      ev.preventDefault();
      this.shown.set(true);
    } else if (ev.key === '1') this.decide([]);
    else if (ev.key === '2') this.decide(['rec']);
    else if (ev.key === '3' && this.canSay()) this.decide(['rec', 'prod']);
    else if (ev.key === 'z') this.undo();
  }
}
