import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./pages/home').then((m) => m.HomePage), title: 'Nihongo Voyage' },
  { path: 'revision', loadComponent: () => import('./pages/review').then((m) => m.ReviewPage), title: 'Révision' },
  { path: 'phrases', loadComponent: () => import('./pages/phrases').then((m) => m.PhrasesPage), title: 'Phrases' },
  { path: 'conversation', loadComponent: () => import('./pages/conversation').then((m) => m.ConversationPage), title: 'Conversation' },
  { path: 'reglages', loadComponent: () => import('./pages/settings').then((m) => m.SettingsPage), title: 'Réglages' },
  { path: '**', redirectTo: '' },
];
