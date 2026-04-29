import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useNotesStore } from '@/features/notes/notesStore';
import { useSettingsStore } from '@/features/settings/settingsStore';

vi.mock('@/features/notes/notesRepository', () => {
  const calls: unknown[] = [];

  return {
    __esModule: true,
    calls,
    loadPersistedState: vi.fn(async () => ({
      data: {
        version: 1,
        notes: [],
        settings: {
          launchAtStartup: false,
          showOnStartup: true,
          defaultNoteColor: 'yellow',
          defaultNoteWidth: 260,
          defaultNoteHeight: 220,
          autosaveDebounceMs: 500,
          theme: 'system',
        },
        lastSavedAt: new Date().toISOString(),
      },
      restoredFromBackup: false,
    })),
    savePersistedState: vi.fn(async (state: unknown) => {
      calls.push(state);
    }),
  };
});

vi.mock('@/features/settings/settingsRepository', () => ({
  readLaunchAtStartup: vi.fn(async () => false),
  writeLaunchAtStartup: vi.fn(async () => {}),
}));

describe('notes persistence integration', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.useFakeTimers();
    vi.stubGlobal('window', {
      innerWidth: 1200,
      innerHeight: 900,
      setTimeout,
      clearTimeout,
    });
  });

  it('loads notes during initialization', async () => {
    const settingsStore = useSettingsStore();
    const notesStore = useNotesStore();

    await settingsStore.initialize();
    await notesStore.initialize();

    expect(notesStore.initialized).toBe(true);
    expect(settingsStore.initialized).toBe(true);
  });

  it('debounces autosave writes', async () => {
    const settingsStore = useSettingsStore();
    const notesStore = useNotesStore();
    await settingsStore.initialize();
    await notesStore.initialize();

    notesStore.createNote();
    notesStore.updateNote(notesStore.notes[0].id, { content: 'a' });
    notesStore.updateNote(notesStore.notes[0].id, { content: 'ab' });

    const repository = await import('@/features/notes/notesRepository');
    expect(repository.calls).toHaveLength(1);

    vi.advanceTimersByTime(500);
    await Promise.resolve();

    expect(repository.calls).toHaveLength(2);
  });

  it('surfaces save errors', async () => {
    const settingsStore = useSettingsStore();
    const notesStore = useNotesStore();
    await settingsStore.initialize();
    await notesStore.initialize();

    const repository = await import('@/features/notes/notesRepository');
    vi.mocked(repository.savePersistedState).mockRejectedValueOnce(new Error('boom'));

    notesStore.createNote();
    vi.advanceTimersByTime(500);
    await Promise.resolve();
    await Promise.resolve();

    expect(notesStore.saveError).toContain('Unable to save sticky notes');
  });
});
