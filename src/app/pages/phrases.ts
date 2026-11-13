import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EntryType, ThemeId, VocabEntry } from '../core/models';
import { SpeechService } from '../core/speech.service';
import { StoreService } from '../core/store.service';
import { THEMES } from '../data/vocab';

@Component({
  selector: 'app-phrases',
  imports: [FormsModule],
  template: `
    <h1>Phrases de survie</h1>

    <input type="search" placeholder="Chercher (français, japonais, romaji)…" [ngModel]="query()" (ngModelChange)="query.set($event)" />

    <div class="filters">
      <button [class.on]="theme() === 'all'" (click)="theme.set('all')">Tout</button>
      @for (t of themes; track t.id) {
        <button [class.on]="theme() === t.id" (click)="theme.set(t.id)">{{ t.icon }} {{ t.label }}</button>
      }
    </div>

    <div class="row">
      <span class="muted small">{{ list().length }} élément(s)</span>
      <span class="spacer"></span>
      <button class="small" (click)="showForm.set(!showForm())">{{ showForm() ? 'Fermer' : '＋ Ajouter une carte' }}</button>
    </div>

    @if (showForm()) {
      <form class="add" (ngSubmit)="add()">
        <label for="f-jp">Japonais (kanji/kana)</label>
        <input id="f-jp" name="jp" [(ngModel)]="draft.jp" required placeholder="例：駅はどこですか" />
        <label for="f-kana">Lecture en kana</label>
        <input id="f-kana" name="kana" [(ngModel)]="draft.kana" placeholder="えきはどこですか" />
        <label for="f-romaji">Romaji</label>
        <input id="f-romaji" name="romaji" [(ngModel)]="draft.romaji" placeholder="eki wa doko desu ka" />
        <label for="f-fr">Français</label>
        <input id="f-fr" name="fr" [(ngModel)]="draft.fr" required placeholder="Où est la gare ?" />
        <label for="f-type">Type</label>
        <select id="f-type" name="type" [(ngModel)]="draft.type">
          <option value="phrase">Phrase</option>
          <option value="mot">Mot</option>
          <option value="verbe">Verbe</option>
          <option value="kanji">Kanji (lecture seule)</option>
        </select>
        <button class="btn-primary btn-block" type="submit" [disabled]="!draft.jp || !draft.fr">Ajouter à mes cartes</button>
        <p class="muted small">Astuce « sentence mining » : ajoute ici les phrases entendues dans tes animes. Elles entrent dans tes révisions.</p>
      </form>
    }

    <ul class="list">
      @for (e of list(); track e.id) {
        <li>
          <div class="txt">
            <p class="jp line">{{ e.jp }}</p>
            @if (e.kana !== e.jp) { <p class="jp kana">{{ e.kana }}</p> }
            @if (store.settings().showRomaji) { <p class="romaji">{{ e.romaji }}</p> }
            <p class="fr">{{ e.fr }}</p>
          </div>
          <div class="acts">
            <button class="icon-btn" (click)="speech.speak(e.kana || e.jp)" aria-label="Écouter">🔊</button>
            <button class="icon-btn" (click)="shown.set(e)" aria-label="Montrer en grand">📱</button>
            @if (e.theme === 'perso') {
              <button class="icon-btn" (click)="store.removeCustom(e.id)" aria-label="Supprimer">🗑</button>
            }
          </div>
        </li>
      } @empty {
        <li class="muted">Aucun résultat.</li>
      }
    </ul>

    @if (shown(); as s) {
      <div class="show" (click)="shown.set(null)" role="dialog" aria-label="Phrase en grand">
        <p class="jp huge">{{ s.jp }}</p>
        @if (s.kana !== s.jp) { <p class="jp">{{ s.kana }}</p> }
        <p class="fr">{{ s.fr }}</p>
        <p class="hint jp">すみません、これを見てください 🙏</p>
        <p class="hint small">Touchez pour fermer</p>
      </div>
    }
  `,
  styles: `
    .filters { display: flex; gap: 6px; overflow-x: auto; padding: 10px 0; scrollbar-width: none; }
    .filters button { white-space: nowrap; padding: 6px 12px; border-radius: 999px; font-size: 0.85rem; }
    .filters button.on { background: var(--indigo); color: #fff; border-color: var(--indigo); }
    .add { background: #fffdf8; border: 1px solid var(--line); border-radius: var(--radius); padding: 4px 14px 14px; margin: 10px 0; }
    .add button[type=submit] { margin-top: 14px; }
    .list { list-style: none; padding: 0; margin: 8px 0 0; }
    .list li { display: flex; gap: 10px; padding: 12px 0; border-bottom: 1px solid var(--line); }
    .txt { flex: 1; min-width: 0; }
    .txt p { margin: 0; }
    .line { font-size: 1.2rem; }
    .kana { color: var(--ink-2); font-size: 0.9rem; }
    .romaji { color: var(--ink-2); font-style: italic; font-size: 0.85rem; }
    .fr { margin-top: 2px !important; }
    .acts { display: flex; flex-direction: column; gap: 4px; }
    .show {
      position: fixed; inset: 0; z-index: 10; background: #fffdf8;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      padding: 24px; text-align: center; gap: 10px;
    }
    .huge { font-size: clamp(2.2rem, 11vw, 4rem); line-height: 1.25; margin: 0; }
    .show .fr { color: var(--ink-2); }
    .hint { color: var(--ink-2); margin-top: 24px; }
  `,
})
export class PhrasesPage {
  protected readonly store = inject(StoreService);
  protected readonly speech = inject(SpeechService);
  protected readonly themes = THEMES;

  protected readonly query = signal('');
  protected readonly theme = signal<ThemeId | 'all'>('all');
  protected readonly showForm = signal(false);
  protected readonly shown = signal<VocabEntry | null>(null);

  protected draft: { jp: string; kana: string; romaji: string; fr: string; type: EntryType } = this.emptyDraft();

  protected readonly list = computed(() => {
    const q = normalize(this.query());
    const th = this.theme();
    return this.store
      .entries()
      .filter((e) => th === 'all' || e.theme === th)
      .filter((e) => !q || normalize(`${e.jp} ${e.kana} ${e.romaji} ${e.fr}`).includes(q));
  });

  protected add(): void {
    const d = this.draft;
    this.store.addCustom({
      jp: d.jp.trim(),
      kana: d.kana.trim() || d.jp.trim(),
      romaji: d.romaji.trim(),
      fr: d.fr.trim(),
      type: d.type,
      priority: 1,
    });
    this.draft = this.emptyDraft();
    this.theme.set('perso');
    this.showForm.set(false);
  }

  private emptyDraft() {
    return { jp: '', kana: '', romaji: '', fr: '', type: 'phrase' as EntryType };
  }
}

function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
}
