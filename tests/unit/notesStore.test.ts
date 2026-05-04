import { setActivePinia, createPinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { minimumNoteHeight, minimumNoteWidth } from '@/features/notes/noteLayout';
import { createNoteModel, useNotesStore } from '@/features/notes/notesStore';
import { clampNoteToViewport } from '@/lib/screenBounds';
import { mergeSettings, migratePersistedState } from '@/features/notes/notesPersistence';
import { defaultSettings } from '@/features/settings/settingsTypes';

vi.mock('@/features/notes/noteWindow', () => ({
  closeNoteWindow: vi.fn(),
  ensureNoteWindowVisible: vi.fn(),
  hideNoteWindow: vi.fn(),
  focusNoteWindow: vi.fn(),
  setNoteWindowPinned: vi.fn(),
}));

describe('notes domain', () => {
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

  it('creates a note with the expected default fields', () => {
    const note = createNoteModel('yellow', 260, 220, 2);

    expect(note).toMatchObject({
      title: 'Untitled note',
      content: '',
      color: 'yellow',
      width: 260,
      height: 220,
      isPinned: false,
      isVisible: true,
      zIndex: 2,
      deletedAt: null,
    });
    expect(note.id).toBeTypeOf('string');
    expect(note.createdAt).toBe(note.updatedAt);
  });

  it('updates updatedAt when content changes', () => {
    const store = useNotesStore();
    store.notes = [createNoteModel('yellow', 260, 220, 1)];
    const original = store.notes[0].updatedAt;

    vi.advanceTimersByTime(2);
    store.updateNote(store.notes[0].id, { content: 'updated' });

    expect(store.notes[0].content).toBe('updated');
    expect(store.notes[0].updatedAt >= original).toBe(true);
  });

  it('deleting one note keeps the others', () => {
    const store = useNotesStore();
    const first = createNoteModel('yellow', 260, 220, 1);
    const second = createNoteModel('mint', 260, 220, 2);
    store.notes = [first, second];

    store.deleteNote(first.id);

    expect(store.notes).toHaveLength(2);
    expect(store.visibleNotes).toHaveLength(1);
    expect(store.visibleNotes[0].id).toBe(second.id);
  });

  it('toggles note pin state', async () => {
    const store = useNotesStore();
    store.notes = [createNoteModel('yellow', 260, 220, 1)];

    await store.toggleNotePinned(store.notes[0].id);

    expect(store.notes[0].isPinned).toBe(true);
  });

  it('clamps note size updates to the shared minimum dimensions', () => {
    const store = useNotesStore();
    const note = createNoteModel('yellow', 260, 220, 1);
    store.notes = [note];

    store.updateNoteSize(note.id, minimumNoteWidth - 64, minimumNoteHeight - 32);

    expect(store.notes[0].width).toBe(minimumNoteWidth);
    expect(store.notes[0].height).toBe(minimumNoteHeight);
  });

  it('clamps a note back into the viewport', () => {
    const note = createNoteModel('yellow', 260, 220, 1);
    note.x = 5000;
    note.y = 5000;

    const clamped = clampNoteToViewport(note, 1280, 720);

    expect(clamped.x).toBeLessThanOrEqual(1020);
    expect(clamped.y).toBeLessThanOrEqual(500);
  });

  it('merges settings with defaults', () => {
    const merged = mergeSettings({ defaultNoteColor: 'mint' });

    expect(merged).toEqual({
      ...defaultSettings,
      defaultNoteColor: 'mint',
    });
  });

  it('migrates older data to the current shape', () => {
    const migrated = migratePersistedState({
      version: 0,
      notes: [createNoteModel('yellow', 260, 220, 1)],
      settings: { showOnStartup: false },
    });

    expect(migrated.version).toBe(1);
    expect(migrated.notes).toHaveLength(1);
    expect(migrated.notes[0].title).toBe('Untitled note');
    expect(migrated.notes[0].isPinned).toBe(false);
    expect(migrated.settings.showOnStartup).toBe(false);
    expect(migrated.settings.defaultNoteWidth).toBe(defaultSettings.defaultNoteWidth);
  });
});
