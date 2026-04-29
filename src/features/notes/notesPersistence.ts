import { loadPersistedState, savePersistedState, type PersistedState } from '@/features/notes/notesRepository';
import type { StickyNote } from '@/features/notes/notesTypes';
import { defaultSettings, type AppSettings } from '@/features/settings/settingsTypes';

export const PERSISTENCE_VERSION = 1;

export const createPersistedState = (notes: StickyNote[], settings: AppSettings): PersistedState => ({
  version: PERSISTENCE_VERSION,
  notes,
  settings,
  lastSavedAt: new Date().toISOString(),
});

export const mergeSettings = (settings: Partial<AppSettings> | undefined): AppSettings => ({
  ...defaultSettings,
  ...settings,
});

export const migratePersistedState = (input: unknown): PersistedState => {
  if (!input || typeof input !== 'object') {
    return createPersistedState([], defaultSettings);
  }

  const candidate = input as Partial<PersistedState>;

  return {
    version: PERSISTENCE_VERSION,
    notes: Array.isArray(candidate.notes)
      ? candidate.notes.map((note) => ({
          ...note,
          title:
            typeof (note as Partial<StickyNote>).title === 'string' && (note as Partial<StickyNote>).title.trim()
              ? (note as Partial<StickyNote>).title as string
              : 'Untitled note',
        }))
      : [],
    settings: mergeSettings(candidate.settings),
    lastSavedAt: typeof candidate.lastSavedAt === 'string' ? candidate.lastSavedAt : new Date().toISOString(),
  };
};

export const loadNotesState = async () => {
  const result = await loadPersistedState();
  return {
    state: migratePersistedState(result.data),
    restoredFromBackup: result.restoredFromBackup,
  };
};

export const persistNotesState = async (notes: StickyNote[], settings: AppSettings) => {
  await savePersistedState(createPersistedState(notes, settings));
};
