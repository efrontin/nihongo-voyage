import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { dailyReminderIcs, download, toAnkiTsv } from '../core/export';
import { Settings } from '../core/models';
import { StoreService } from '../core/store.service';
import { THEMES } from '../data/vocab';

@Component({
  selector: 'app-settings',
  imports: [FormsModule],
  template: `
    <h1>Réglages</h1>

    <h2>Apprentissage</h2>
    <label for="s-new">Nouvelles cartes par jour : <strong>{{ s().newPerDay }}</strong></label>
    <input id="s-new" type="range" min="0" max="40" step="1" [ngModel]="s().newPerDay" (ngModelChange)="set('newPerDay', +$event)" />

    <label for="s-focus">Thème prioritaire des nouvelles cartes</label>
    <select id="s-focus" [ngModel]="s().focusTheme" (ngModelChange)="set('focusTheme', $event)">
      <option value="all">Tous (par priorité)</option>
      @for (t of themes; track t.id) { <option [value]="t.id">{{ t.icon }} {{ t.label }}</option> }
    </select>

    <label class="check"><input type="checkbox" [ngModel]="s().showRomaji" (ngModelChange)="set('showRomaji', $event)" /> Afficher le romaji</label>

    <label for="s-rate">Vitesse de la voix : {{ s().speechRate }}×</label>
    <input id="s-rate" type="range" min="0.5" max="1.2" step="0.05" [ngModel]="s().speechRate" (ngModelChange)="set('speechRate', +$event)" />

    <h2>Voyage</h2>
    <label for="s-trip">Date de départ</label>
    <input id="s-trip" type="date" [ngModel]="s().tripDate" (ngModelChange)="set('tripDate', $event)" />

    <h2>Rappel quotidien</h2>
    <div class="row">
      <input type="time" [ngModel]="s().reminderTime" (ngModelChange)="set('reminderTime', $event)" aria-label="Heure du rappel" />
      <button (click)="reminder()">📅 Ajouter au calendrier</button>
    </div>
    <p class="muted small">Télécharge un événement quotidien (.ics) à ouvrir avec Calendrier ou Google Agenda.</p>

    <h2>Conversation (IA)</h2>
    <label for="s-key">Clé API Anthropic</label>
    <input id="s-key" type="password" autocomplete="off" placeholder="sk-ant-…" [ngModel]="s().apiKey" (ngModelChange)="set('apiKey', $event.trim())" />
    <label for="s-model">Modèle</label>
    <input id="s-model" [ngModel]="s().model" (ngModelChange)="set('model', $event.trim())" />
    <p class="muted small">Facultatif. Sans clé, l'onglet Parler ouvre la scène dans l'app Claude (gratuit, mode vocal compris). L'API, elle, est facturée à part de tout abonnement Claude. La clé reste stockée sur cet appareil uniquement (localStorage).</p>

    <h2>Données</h2>
    <div class="stack">
      <button (click)="exportAnki()">⬇️ Exporter pour Anki (.txt)</button>
      <button (click)="exportBackup()">💾 Sauvegarder ma progression (.json)</button>
      <label class="btn file">📂 Restaurer une sauvegarde<input type="file" accept="application/json" (change)="importBackup($event)" hidden /></label>
      <button class="danger" (click)="reset()">Réinitialiser la progression</button>
    </div>
    @if (message()) { <p class="small msg">{{ message() }}</p> }
  `,
  styles: `
    input[type=range] { padding: 0; }
    .check { display: flex; align-items: center; gap: 8px; color: var(--ink); margin-top: 16px; }
    .check input { width: auto; }
    .row input[type=time] { width: 120px; }
    .stack { display: flex; flex-direction: column; gap: 8px; }
    .file { margin: 0; color: var(--ink); font-size: 1rem; }
    .danger { color: var(--shu); border-color: #e7b7ae; }
    .msg { background: var(--paper-2); border-radius: 10px; padding: 8px 12px; }
  `,
})
export class SettingsPage {
  private readonly store = inject(StoreService);
  protected readonly s = this.store.settings;
  protected readonly themes = THEMES;
  protected readonly message = signal('');

  protected set<K extends keyof Settings>(key: K, value: Settings[K]): void {
    this.store.updateSettings({ [key]: value } as Partial<Settings>);
  }

  protected reminder(): void {
    download('rappel-japonais.ics', dailyReminderIcs(this.s().reminderTime, location.origin), 'text/calendar');
  }

  protected exportAnki(): void {
    download('nihongo-voyage-anki.txt', toAnkiTsv(this.store.entries()), 'text/plain;charset=utf-8');
    this.message.set('Dans Anki : Fichier → Importer, puis choisis ce fichier (séparateur tabulation détecté automatiquement).');
  }

  protected exportBackup(): void {
    const date = new Date().toISOString().slice(0, 10);
    download(`nihongo-voyage-${date}.json`, this.store.exportBackup(), 'application/json');
  }

  protected async importBackup(ev: Event): Promise<void> {
    const file = (ev.target as HTMLInputElement).files?.[0];
    if (!file) return;
    try {
      this.store.importBackup(await file.text());
      this.message.set('Sauvegarde restaurée ✓');
    } catch (e) {
      this.message.set(e instanceof Error ? e.message : 'Fichier invalide');
    }
  }

  protected reset(): void {
    if (confirm('Effacer toute la progression ? Tes cartes perso sont conservées.')) {
      this.store.resetProgress();
      this.message.set('Progression réinitialisée.');
    }
  }
}
