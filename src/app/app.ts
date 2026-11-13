import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <main class="page">
      <router-outlet />
    </main>
    <nav class="tabbar" aria-label="Navigation principale">
      @for (t of tabs; track t.path) {
        <a [routerLink]="t.path" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: t.path === '/' }">
          <span class="jp" aria-hidden="true">{{ t.kanji }}</span>
          <span class="lbl">{{ t.label }}</span>
        </a>
      }
    </nav>
  `,
})
export class App {
  readonly tabs = [
    { path: '/', kanji: '家', label: 'Accueil' },
    { path: '/revision', kanji: '習', label: 'Révision' },
    { path: '/phrases', kanji: '語', label: 'Phrases' },
    { path: '/conversation', kanji: '話', label: 'Parler' },
    { path: '/reglages', kanji: '設', label: 'Réglages' },
  ];
}
