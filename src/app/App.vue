<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import DesktopNoteWindow from '@/components/DesktopNoteWindow/DesktopNoteWindow.vue';
import SettingsPanel from '@/components/SettingsPanel/SettingsPanel.vue';
import { listenForNotesChanged } from '@/features/notes/notesEvents';
import { useNotesStore } from '@/features/notes/notesStore';
import { getNoteIdFromWindowLabel, mainWindowLabel } from '@/features/notes/noteWindow';
import { useSettingsStore } from '@/features/settings/settingsStore';

const notesStore = useNotesStore();
const settingsStore = useSettingsStore();

const currentWindowLabel = ref(mainWindowLabel);
const currentNoteId = computed(() => getNoteIdFromWindowLabel(currentWindowLabel.value));
const isNoteWindow = computed(() => currentNoteId.value !== null);
const existingNotes = computed(() => notesStore.notes.filter((entry) => !entry.deletedAt));
const hasNotes = computed(() => existingNotes.value.length > 0);
let unlistenNotesChanged: (() => void) | null = null;

const applyAppMode = () => {
  document.body.dataset.appMode = isNoteWindow.value ? 'note' : 'main';
};

onMounted(async () => {
  try {
    currentWindowLabel.value = getCurrentWebviewWindow().label;
  } catch {
    currentWindowLabel.value = mainWindowLabel;
  }

  applyAppMode();
  await Promise.all([settingsStore.initialize(), notesStore.initialize()]);

  if (!isNoteWindow.value) {
    unlistenNotesChanged = await listenForNotesChanged(async (payload) => {
      if (payload.sourceLabel === currentWindowLabel.value) {
        return;
      }

      await notesStore.reloadFromPersistence();
    });
  }

  if (!isNoteWindow.value && settingsStore.settings.showOnStartup) {
    await notesStore.restoreVisibleNoteWindows(false);
  }
});

onBeforeUnmount(() => {
  unlistenNotesChanged?.();
});
</script>

<template>
  <DesktopNoteWindow v-if="currentNoteId" :note-id="currentNoteId" />

  <main v-else class="shell">
    <header class="topbar">
      <div>
        <p class="eyebrow">Desktop sticky notes</p>
        <h1>Sticky Notes</h1>
      </div>
      <div class="topbar-actions">
        <button class="primary-button" type="button" @click="notesStore.createNote()">
          New note
        </button>
        <button class="ghost-button" type="button" @click="notesStore.toggleAllVisibility()">
          {{ notesStore.areAllVisible ? 'Hide all' : 'Show all' }}
        </button>
      </div>
    </header>

    <section v-if="notesStore.loadError || notesStore.saveError || settingsStore.error" class="banner error">
      <span>{{ notesStore.loadError || notesStore.saveError || settingsStore.error }}</span>
    </section>

    <section v-if="notesStore.restoreMessage" class="banner warning">
      <span>{{ notesStore.restoreMessage }}</span>
    </section>

    <div class="workspace">
      <section class="desk-card">
        <div class="desk-card__header">
          <div>
            <h2>Desktop Notes</h2>
            <p>Notes open as native desktop windows instead of inside this control panel.</p>
          </div>
          <span class="desk-count">{{ notesStore.visibleNotes.length }} open</span>
        </div>

        <div v-if="hasNotes" class="note-list">
          <article v-for="note in existingNotes" :key="note.id" class="note-list-item">
            <div>
              <strong>{{ note.title }}</strong>
              <p>{{ note.isVisible ? 'Visible on desktop' : 'Hidden' }}</p>
            </div>
            <div class="note-list-actions">
              <button
                class="ghost-button"
                type="button"
                @click="note.isVisible ? notesStore.hideNoteWindow(note.id) : notesStore.showNoteWindow(note.id)"
              >
                {{ note.isVisible ? 'Hide' : 'Show' }}
              </button>
              <button class="danger-button" type="button" @click="notesStore.deleteNote(note.id)">
                Delete
              </button>
            </div>
          </article>
        </div>

        <section v-else class="empty-state empty-state--inline">
          <h2>No notes yet</h2>
          <p>Create your first sticky note. It will open directly on the desktop.</p>
          <button class="primary-button" type="button" @click="notesStore.createNote()">
            Add first note
          </button>
        </section>
      </section>

      <aside class="sidebar">
        <SettingsPanel />
      </aside>
    </div>
  </main>
</template>
