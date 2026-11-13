import { Component, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { StoreService } from '../core/store.service';
import { THEMES } from '../data/vocab';

@Component({
  selector: 'app-home',
  imports: [RouterLink],
  template: `
    <header class="hero">
      <div class="seal jp" aria-hidden="true">旅</div>
      <div>
        <p class="muted small">{{ greeting() }}</p>
        <h1 class="jp">今日も頑張ろう！</h1>
        <p class="muted small">« Courage pour aujourd'hui aussi ! »</p>
      </div>
    </header>

    <section class="stats">
      <div class="stat"><strong>{{ due() }}</strong><span>à réviser</span></div>
      <div class="stat"><strong>{{ newToday() }}</strong><span>nouvelles</span></div>
      <div class="stat"><strong>{{ store.streak() }}</strong><span>jour{{ store.streak() > 1 ? 's' : '' }} d'affilée</span></div>
    </section>

    @if (daysLeft() !== null) {
      <p class="countdown">
        @if (daysLeft()! > 0) {
          ✈️ Départ dans <strong>{{ daysLeft() }}</strong> jour{{ daysLeft()! > 1 ? 's' : '' }}
        } @else {
          🇯🇵 C'est le voyage ! いってらっしゃい
        }
      </p>
    }

    <a class="btn btn-primary btn-block" routerLink="/revision">
      @if (due() + newToday() > 0) { Commencer la session · {{ due() + newToday() }} cartes } @else { Session terminée pour aujourd'hui ✓ }
    </a>
    <p class="muted small center">Aujourd'hui : {{ store.today().reviews }} révision(s), {{ store.today().newCards }} nouvelle(s) carte(s)</p>

    <h2>Progression par thème</h2>
    <ul class="themes">
      @for (t of themes(); track t.id) {
        <li>
          <span class="ico" aria-hidden="true">{{ t.icon }}</span>
          <span class="name">{{ t.label }}</span>
          <span class="bar"><span [style.width.%]="t.pct"></span></span>
          <span class="muted small count">{{ t.seen }}/{{ t.total }}</span>
        </li>
      }
    </ul>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: `
    .hero { display: flex; gap: 14px; align-items: center; margin-bottom: 18px; }
    .hero h1 { margin: 0; }
    .hero p { margin: 0; }
    .seal {
      width: 64px; height: 64px; flex: none; border-radius: 12px;
      background: var(--shu); color: #fff; font-size: 2.2rem;
      display: grid; place-items: center; transform: rotate(-4deg);
      box-shadow: 0 2px 0 rgba(0,0,0,.15);
    }
    .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 14px; }
    .stat { background: #fffdf8; border: 1px solid var(--line); border-radius: var(--radius); padding: 12px; text-align: center; }
    .stat strong { display: block; font-size: 1.6rem; color: var(--indigo); }
    .stat span { font-size: 0.78rem; color: var(--ink-2); }
    .countdown { background: var(--indigo); color: #fff; border-radius: var(--radius); padding: 10px 14px; margin: 0 0 14px; }
    .center { text-align: center; }
    .themes { list-style: none; padding: 0; margin: 0; }
    .themes li { display: grid; grid-template-columns: 28px 1fr 90px 48px; align-items: center; gap: 8px; padding: 8px 0; border-bottom: 1px solid var(--line); }
    .bar { height: 6px; background: var(--paper-2); border-radius: 999px; overflow: hidden; }
    .bar span { display: block; height: 100%; background: var(--matcha); }
    .count { text-align: right; }
  `,
})
export class HomePage {
  protected readonly store = inject(StoreService);

  protected readonly due = computed(() => {
    this.store.cards();
    return this.store.dueCards().length;
  });
  protected readonly newToday = computed(() => {
    this.store.cards();
    this.store.settings();
    return this.store.newCardsAvailable().length;
  });

  protected readonly daysLeft = computed(() => {
    const d = this.store.settings().tripDate;
    if (!d) return null;
    const trip = new Date(d + 'T00:00:00').getTime();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.round((trip - today.getTime()) / 86_400_000);
  });

  protected readonly themes = computed(() => {
    this.store.cards();
    return THEMES.map((t) => {
      const p = this.store.themeProgress(t.id);
      return { ...t, ...p, pct: p.total ? (100 * p.seen) / p.total : 0 };
    }).filter((t) => t.total > 0);
  });

  protected greeting(): string {
    const h = new Date().getHours();
    if (h < 11) return 'おはようございます — bonjour';
    if (h < 18) return 'こんにちは — bonjour';
    return 'こんばんは — bonsoir';
  }
}
