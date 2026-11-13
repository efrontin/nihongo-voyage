import { VocabEntry } from './models';

export function download(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const clean = (s: string) => s.replace(/[\t\n\r]+/g, ' ');

/** Fichier texte importable dans Anki (Fichier → Importer) : recto, verso, étiquettes. */
export function toAnkiTsv(entries: VocabEntry[]): string {
  const header = ['#separator:tab', '#html:true', '#tags column:3'];
  const lines = entries.map((e) => {
    const front = clean(e.jp);
    const back = [e.kana !== e.jp ? e.kana : '', e.romaji, `<b>${e.fr}</b>`, e.note ?? '']
      .filter(Boolean)
      .map(clean)
      .join('<br>');
    return [front, back, `nihongo-voyage ${e.theme}`].join('\t');
  });
  return [...header, ...lines].join('\n');
}

/** Rappel quotidien : un événement récurrent à importer dans Calendrier (Mac/iPhone) ou Google Agenda. */
export function dailyReminderIcs(time: string, appUrl: string): string {
  const [h, m] = time.split(':').map(Number);
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, h, m);
  const end = new Date(start.getTime() + 15 * 60_000);
  const fmt = (d: Date) =>
    `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}00`;
  const stamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//nihongo-voyage//FR',
    'BEGIN:VEVENT',
    `UID:nihongo-voyage-${Date.now()}@local`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    'RRULE:FREQ=DAILY',
    'SUMMARY:🇯🇵 Session de japonais (15 min)',
    `DESCRIPTION:Révisions du jour : ${appUrl}`,
    `URL:${appUrl}`,
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    'DESCRIPTION:Session de japonais',
    'TRIGGER:PT0M',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}
