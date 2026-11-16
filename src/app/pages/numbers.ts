import { ChangeDetectionStrategy, Component, ElementRef, OnInit, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NumberItem, NumberKind, checkAnswer, randomItem } from '../core/numbers';
import { SpeechService } from '../core/speech.service';

const KINDS: { id: NumberKind | 'all'; label: string; hint: string }[] = [
  { id: 'all', label: 'Tout', hint: '' },
  { id: 'prix', label: '💴 Prix', hint: 'Tape le prix en yens' },
  { id: 'heure', label: '🕘 Heures', hint: 'Tape l\'heure : 905 ou 9:05' },
  { id: 'quai', label: '🚉 Quais', hint: 'Tape le numéro du quai' },
];

/** Écoute des nombres : la voix dit un prix, une heure ou un quai à vitesse réelle, on tape les chiffres. */
@Component({
  selector: 'app-numbers',
  imports: [FormsModule, RouterLink],
  template: `
    <div class="top row">
      <a class="icon-btn" routerLink="/" aria-label="Retour">←</a>
      <strong>Écoute des nombres</strong>
      <span class="spacer"></span>
      @if (total()) { <span class="muted small">{{ right() }}/{{ total() }} juste(s)</span> }
    </div>

    <div class="tabs">
      @for (k of kinds; track k.id) {
        <button [class.on]="kind() === k.id" (click)="setKind(k.id)">{{ k.label }}</button>
      }
    </div>

    @if (item(); as it) {
      <article class="card" [class.ok]="verdict() === true" [class.ko]="verdict() === false">
        <div class="play">
          <button class="listen" (click)="speak()" aria-label="Réécouter">🔊</button>
          <button class="small" (click)="speak(0.65)">🐢 Lentement</button>
        </div>

        @if (verdict() === null) {
          <p class="muted small">{{ hint(it.kind) }}</p>
        } @else {
          <p class="verdict">{{ verdict() ? '✓ Juste' : '✗ Tu as tapé ' + typed() }}</p>
          <p class="answer">{{ it.label }}</p>
          <p class="jp kana">{{ it.kana }}</p>
        }
      </article>

      @if (verdict() === null) {
        <form class="row" (ngSubmit)="check()">
          <input #field name="answer" inputmode="numeric" autocomplete="off" [(ngModel)]="input" placeholder="…" aria-label="Ta réponse" />
          <button class="btn-primary" type="submit" [disabled]="!input().trim()">Vérifier</button>
        </form>
      } @else {
        <button class="btn-primary btn-block" (click)="next()">Suivant</button>
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: `
    .top { margin-bottom: 10px; gap: 10px; }
    .top a { text-decoration: none; }
    .tabs { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 12px; }
    .tabs button { padding: 6px 12px; font-size: 0.9rem; }
    .tabs .on { background: var(--indigo); border-color: var(--indigo); color: #fff; }
    .card {
      background: #fffdf8; border: 1px solid var(--line); border-top: 4px solid var(--indigo); border-radius: 18px;
      padding: 22px 18px; min-height: 250px; margin-bottom: 14px; text-align: center;
      box-shadow: 0 6px 0 var(--paper-2);
    }
    .card.ok { border-top-color: var(--matcha); }
    .card.ko { border-top-color: var(--shu); }
    .play { display: flex; flex-direction: column; align-items: center; gap: 10px; margin-bottom: 12px; }
    .listen {
      width: 96px; height: 96px; border-radius: 50%; font-size: 2.4rem;
      background: var(--indigo); border: none; display: grid; place-items: center;
    }
    .verdict { font-weight: 600; margin: 0; }
    .ok .verdict { color: var(--matcha); }
    .ko .verdict { color: var(--shu); }
    .answer { font-size: 2rem; font-weight: 700; margin: 6px 0; }
    .kana { margin: 0; overflow-wrap: anywhere; }
    form input { flex: 1; font-size: 1.3rem; text-align: center; }
  `,
})
export class NumbersPage implements OnInit {
  private readonly speech = inject(SpeechService);
  private readonly field = viewChild<ElementRef<HTMLInputElement>>('field');

  protected readonly kinds = KINDS;
  protected readonly kind = signal<NumberKind | 'all'>('all');
  protected readonly item = signal<NumberItem | null>(null);
  protected readonly input = signal('');
  protected readonly typed = signal('');
  protected readonly verdict = signal<boolean | null>(null);
  protected readonly right = signal(0);
  protected readonly total = signal(0);

  ngOnInit(): void {
    this.next();
  }

  protected hint(kind: NumberKind): string {
    return KINDS.find((k) => k.id === kind)?.hint ?? '';
  }

  protected setKind(k: NumberKind | 'all'): void {
    this.kind.set(k);
    this.next();
  }

  protected next(): void {
    const k = this.kind();
    const kind: NumberKind = k === 'all' ? (['prix', 'prix', 'heure', 'quai'] as const)[Math.floor(Math.random() * 4)] : k;
    this.item.set(randomItem(kind));
    this.input.set('');
    this.verdict.set(null);
    setTimeout(() => {
      this.speak();
      this.field()?.nativeElement.focus();
    }, 150);
  }

  /** Vitesse réelle par défaut : c'est celle qu'on entendra à la caisse. */
  protected speak(rate = 1): void {
    const it = this.item();
    if (it) this.speech.speak(it.kana, rate);
  }

  protected check(): void {
    const it = this.item();
    const answer = this.input().trim();
    if (!it || !answer) return;
    const ok = checkAnswer(it, answer);
    this.typed.set(answer);
    this.verdict.set(ok);
    this.total.update((n) => n + 1);
    if (ok) this.right.update((n) => n + 1);
  }
}
