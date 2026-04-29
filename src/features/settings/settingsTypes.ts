import type { StickyNoteColor } from '@/features/notes/notesTypes';

export type AppTheme = 'system' | 'light' | 'dark';

export type AppSettings = {
  launchAtStartup: boolean;
  showOnStartup: boolean;
  defaultNoteColor: StickyNoteColor;
  defaultNoteWidth: number;
  defaultNoteHeight: number;
  autosaveDebounceMs: number;
  theme: AppTheme;
};

export const defaultSettings: AppSettings = {
  launchAtStartup: false,
  showOnStartup: true,
  defaultNoteColor: 'yellow',
  defaultNoteWidth: 260,
  defaultNoteHeight: 220,
  autosaveDebounceMs: 500,
  theme: 'system',
};
