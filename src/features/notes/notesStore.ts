import { defineStore } from 'pinia';
import { createDebouncedTask } from '@/lib/debounce';
import { getErrorDetail, humanizeError } from '@/lib/errors';
import { createId } from '@/lib/ids';
import { loadNotesState, persistNotesState } from '@/features/notes/notesPersistence';
import { closeNoteWindow, ensureNoteWindowVisible, hideNoteWindow, focusNoteWindow } from '@/features/notes/noteWindow';
import { emitNotesChanged } from '@/features/notes/notesEvents';
import type { StickyNote, StickyNoteColor, StickyFontSize } from '@/features/notes/notesTypes';
import { useSettingsStore } from '@/features/settings/settingsStore';

const createNoteModel = (
  color: StickyNoteColor,
  width: number,
  height: number,
  zIndex: number,
): StickyNote => {
  const now = new Date().toISOString();

  return {
    id: createId(),
    title: 'Untitled note',
    content: '',
    x: 48 + zIndex * 18,
    y: 96 + zIndex * 18,
    width,
    height,
    color,
    fontSize: 'md' satisfies StickyFontSize,
    isPinned: false,
    isVisible: true,
    zIndex,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };
};

export const useNotesStore = defineStore('notes', {
  state: () => ({
    notes: [] as StickyNote[],
    initialized: false,
    loadError: '' as string,
    saveError: '' as string,
    restoreMessage: '' as string,
    nextZIndex: 1,
    debouncedSave: null as ReturnType<typeof createDebouncedTask> | null,
  }),
  getters: {
    visibleNotes: (state) => state.notes.filter((note) => note.isVisible && !note.deletedAt),
    areAllVisible: (state) => state.notes.every((note) => note.isVisible),
  },
  actions: {
    configureAutosave(delay: number) {
      this.debouncedSave = createDebouncedTask(async () => {
        await this.persistNow();
      }, delay);
    },
    async persistNow() {
      const settingsStore = useSettingsStore();
      try {
        await persistNotesState(this.notes, settingsStore.settings);
        this.saveError = '';
        await emitNotesChanged();
      } catch (error) {
        this.saveError = humanizeError('NOTES_SAVE_FAILED', getErrorDetail(error));
      }
    },
    touchNote(note: StickyNote, patch: Partial<StickyNote>) {
      Object.assign(note, patch, { updatedAt: new Date().toISOString() });
    },
    scheduleSave() {
      const settingsStore = useSettingsStore();

      if (!this.debouncedSave) {
        this.configureAutosave(settingsStore.settings.autosaveDebounceMs);
      }

      this.debouncedSave?.trigger();
    },
    async initialize() {
      if (this.initialized) {
        return;
      }

      try {
        const settingsStore = useSettingsStore();
        const { state, restoredFromBackup } = await loadNotesState();

        this.notes = state.notes;
        this.nextZIndex = this.notes.reduce((max, note) => Math.max(max, note.zIndex), 0) + 1;
        this.configureAutosave(settingsStore.settings.autosaveDebounceMs);
        this.restoreMessage = restoredFromBackup ? 'Recovered notes from backup store.' : '';
        this.loadError = '';
      } catch (error) {
        this.loadError = humanizeError('NOTES_LOAD_FAILED', getErrorDetail(error));
      } finally {
        this.initialized = true;
      }
    },
    async reloadFromPersistence() {
      try {
        const { state, restoredFromBackup } = await loadNotesState();
        this.notes = state.notes;
        this.nextZIndex = this.notes.reduce((max, note) => Math.max(max, note.zIndex), 0) + 1;
        this.restoreMessage = restoredFromBackup ? 'Recovered notes from backup store.' : '';
      } catch (error) {
        this.loadError = humanizeError('NOTES_LOAD_FAILED', getErrorDetail(error));
      }
    },
    async restoreVisibleNoteWindows(focus: boolean) {
      for (const note of this.visibleNotes) {
        try {
          await ensureNoteWindowVisible(note, focus);
        } catch (error) {
          this.saveError = error instanceof Error ? error.message : humanizeError('UNKNOWN_ERROR');
        }
      }
    },
    async createNote() {
      const settingsStore = useSettingsStore();
      const note = createNoteModel(
        settingsStore.settings.defaultNoteColor,
        settingsStore.settings.defaultNoteWidth,
        settingsStore.settings.defaultNoteHeight,
        this.nextZIndex++,
      );

      this.notes.push(note);
      await this.persistNow();
      try {
        await ensureNoteWindowVisible(note, true);
      } catch (error) {
        this.saveError = error instanceof Error ? error.message : humanizeError('UNKNOWN_ERROR');
      }
    },
    updateNote(noteId: string, patch: Partial<Pick<StickyNote, 'title' | 'content' | 'color' | 'fontSize' | 'isVisible'>>) {
      const note = this.notes.find((entry) => entry.id === noteId);
      if (!note) {
        return;
      }

      this.touchNote(note, patch);
      this.scheduleSave();
    },
    updateNotePosition(noteId: string, x: number, y: number, persist: boolean) {
      const note = this.notes.find((entry) => entry.id === noteId);
      if (!note) {
        return;
      }

      this.touchNote(note, { x, y });
      if (persist) {
        this.scheduleSave();
      }
    },
    commitNotePosition(noteId: string) {
      const note = this.notes.find((entry) => entry.id === noteId);
      if (!note) {
        return;
      }

      note.updatedAt = new Date().toISOString();
      this.scheduleSave();
    },
    updateNoteSize(noteId: string, width: number, height: number) {
      const note = this.notes.find((entry) => entry.id === noteId);
      if (!note) {
        return;
      }

      const minWidth = 220;
      const minHeight = 180;
      this.touchNote(note, {
        width: Math.max(Math.round(width), minWidth),
        height: Math.max(Math.round(height), minHeight),
      });
      this.scheduleSave();
    },
    bringToFront(noteId: string) {
      const note = this.notes.find((entry) => entry.id === noteId);
      if (!note) {
        return;
      }

      if (note.zIndex === this.nextZIndex - 1) {
        return;
      }

      this.touchNote(note, { zIndex: this.nextZIndex++ });
      this.scheduleSave();
    },
    deleteNote(noteId: string) {
      const note = this.notes.find((entry) => entry.id === noteId);
      if (!note) {
        return;
      }

      this.touchNote(note, {
        deletedAt: new Date().toISOString(),
        isVisible: false,
      });
      this.scheduleSave();
      void closeNoteWindow(noteId);
    },
    toggleAllVisibility() {
      const nextVisible = !this.areAllVisible;
      this.notes = this.notes.map((note) => ({
        ...note,
        isVisible: nextVisible,
        updatedAt: new Date().toISOString(),
      }));
      this.scheduleSave();
      if (nextVisible) {
        void this.restoreVisibleNoteWindows(false);
        return;
      }

      for (const note of this.notes) {
        void hideNoteWindow(note.id);
      }
    },
    async hideNoteWindow(noteId: string) {
      const note = this.notes.find((entry) => entry.id === noteId);
      if (!note) {
        return;
      }

      this.touchNote(note, { isVisible: false });
      this.scheduleSave();
      await hideNoteWindow(noteId);
    },
    async showNoteWindow(noteId: string) {
      const note = this.notes.find((entry) => entry.id === noteId && !entry.deletedAt);
      if (!note) {
        return;
      }

      this.touchNote(note, { isVisible: true });
      this.scheduleSave();
      try {
        await ensureNoteWindowVisible(note, true);
      } catch (error) {
        this.saveError = error instanceof Error ? error.message : humanizeError('UNKNOWN_ERROR');
      }
    },
    async focusNoteWindow(noteId: string) {
      await focusNoteWindow(noteId);
    },
  },
});

export { createNoteModel };
