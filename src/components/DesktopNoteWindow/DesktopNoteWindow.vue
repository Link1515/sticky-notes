<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { getCurrentWindow } from '@tauri-apps/api/window';
import StickyNoteToolbar from '@/components/StickyNote/StickyNoteToolbar.vue';
import { listenForNotesChanged } from '@/features/notes/notesEvents';
import { closeNoteWindow, ensureNoteWindowVisible, focusNoteWindow, isTauriRuntime } from '@/features/notes/noteWindow';
import { useNotesStore } from '@/features/notes/notesStore';
import { noteColors, type StickyFontSize, type StickyNoteColor } from '@/features/notes/notesTypes';

const props = defineProps<{
  noteId: string;
}>();

const notesStore = useNotesStore();
const appWindow = getCurrentWindow();
const note = computed(() => notesStore.notes.find((entry) => entry.id === props.noteId && !entry.deletedAt) ?? null);
const noteClass = computed(() => (note.value ? `sticky-note--${note.value.color} sticky-note--${note.value.fontSize}` : 'sticky-note--yellow sticky-note--md'));

const unlistenFns: Array<() => void> = [];
const canRenderNote = computed(() => notesStore.initialized && note.value !== null);
let isApplyingWindowUpdate = false;
const isEditingTitle = ref(false);
const draftTitle = ref('');
const titleInputRef = ref<HTMLInputElement | null>(null);
const isSettingsOpen = ref(false);
const isEditingContent = ref(false);
const draftContent = ref('');
const contentInputRef = ref<HTMLTextAreaElement | null>(null);
const dragThreshold = 6;
let dragPointerId: number | null = null;
let dragStartX = 0;
let dragStartY = 0;
let dragCandidate = false;

const syncWindowBounds = async () => {
  if (!note.value || !isTauriRuntime() || isApplyingWindowUpdate) {
    return;
  }

  const [scaleFactor, position, size] = await Promise.all([
    appWindow.scaleFactor(),
    appWindow.outerPosition(),
    appWindow.innerSize(),
  ]);
  const logicalPosition = position.toLogical(scaleFactor);
  const logicalSize = size.toLogical(scaleFactor);

  notesStore.updateNotePosition(props.noteId, logicalPosition.x, logicalPosition.y, true);
  notesStore.updateNoteSize(props.noteId, logicalSize.width, logicalSize.height);
};

const updateColor = async (color: StickyNoteColor) => {
  notesStore.updateNote(props.noteId, { color });
  await focusNoteWindow(props.noteId);
};

const updateFontSize = (fontSize: StickyFontSize) => {
  notesStore.updateNote(props.noteId, { fontSize });
};

const beginTitleEdit = async () => {
  if (!note.value) {
    return;
  }

  isEditingContent.value = false;
  draftTitle.value = note.value.title;
  isEditingTitle.value = true;
  await nextTick();
  titleInputRef.value?.focus();
  titleInputRef.value?.select();
};

const cancelTitleEdit = () => {
  draftTitle.value = note.value?.title ?? '';
  isEditingTitle.value = false;
};

const commitTitleEdit = () => {
  if (!note.value) {
    return;
  }

  const nextTitle = draftTitle.value.trim() || 'Untitled note';
  notesStore.updateNote(props.noteId, { title: nextTitle });
  isEditingTitle.value = false;
};

const beginContentEdit = async () => {
  if (!note.value) {
    return;
  }

  isEditingTitle.value = false;
  draftContent.value = note.value.content;
  isEditingContent.value = true;
  await nextTick();
  contentInputRef.value?.focus();
  contentInputRef.value?.setSelectionRange(draftContent.value.length, draftContent.value.length);
};

const cancelContentEdit = () => {
  draftContent.value = note.value?.content ?? '';
  isEditingContent.value = false;
};

const commitContentEdit = () => {
  if (!note.value) {
    return;
  }

  notesStore.updateNote(props.noteId, { content: draftContent.value });
  isEditingContent.value = false;
};

const onTitleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    commitTitleEdit();
    return;
  }

  if (event.key === 'Escape') {
    event.preventDefault();
    cancelTitleEdit();
  }
};

const onContentKeydown = (event: KeyboardEvent) => {
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
    event.preventDefault();
    commitContentEdit();
    return;
  }

  if (event.key === 'Escape') {
    event.preventDefault();
    cancelContentEdit();
  }
};

const deleteNote = async () => {
  const confirmed = window.confirm('Delete this sticky note?');
  if (!confirmed) {
    return;
  }

  notesStore.deleteNote(props.noteId);
};

const hideCurrentNote = async () => {
  await notesStore.hideNoteWindow(props.noteId);
};

const toggleSettings = () => {
  isSettingsOpen.value = !isSettingsOpen.value;
};

const startDragging = async () => {
  if (!isTauriRuntime()) {
    return;
  }

  await appWindow.startDragging();
};

const clearDragState = () => {
  dragPointerId = null;
  dragCandidate = false;
};

const beginDragCandidate = (event: PointerEvent) => {
  if (isEditingTitle.value || isEditingContent.value) {
    return;
  }

  dragPointerId = event.pointerId;
  dragStartX = event.clientX;
  dragStartY = event.clientY;
  dragCandidate = true;
};

const onDragPointerMove = async (event: PointerEvent) => {
  if (!dragCandidate || dragPointerId !== event.pointerId) {
    return;
  }

  const movedX = Math.abs(event.clientX - dragStartX);
  const movedY = Math.abs(event.clientY - dragStartY);
  if (movedX < dragThreshold && movedY < dragThreshold) {
    return;
  }

  clearDragState();
  await startDragging();
};

const onDragPointerEnd = (event: PointerEvent) => {
  if (dragPointerId === event.pointerId) {
    clearDragState();
  }
};

const startResizeDragging = async () => {
  if (!isTauriRuntime()) {
    return;
  }

  await appWindow.startResizeDragging('SouthEast');
};

onMounted(async () => {
  if (!notesStore.initialized) {
    await notesStore.initialize();
  }

  if (!note.value) {
    await closeNoteWindow(props.noteId);
    return;
  }

  if (!isTauriRuntime()) {
    return;
  }

  window.addEventListener('pointermove', onDragPointerMove);
  window.addEventListener('pointerup', onDragPointerEnd);
  window.addEventListener('pointercancel', onDragPointerEnd);

  isApplyingWindowUpdate = true;
  try {
    await ensureNoteWindowVisible(note.value, false);
  } finally {
    window.setTimeout(() => {
      isApplyingWindowUpdate = false;
    }, 0);
  }

  unlistenFns.push(
    await appWindow.onMoved(() => {
      void syncWindowBounds();
    }),
  );

  unlistenFns.push(
    await appWindow.onResized(() => {
      void syncWindowBounds();
    }),
  );

  unlistenFns.push(
    await appWindow.onCloseRequested(async (event) => {
      event.preventDefault();
      await notesStore.hideNoteWindow(props.noteId);
    }),
  );

  unlistenFns.push(
    await listenForNotesChanged(async (payload) => {
      if (payload.sourceLabel === appWindow.label) {
        return;
      }

      await notesStore.reloadFromPersistence();
      const refreshed = notesStore.notes.find((entry) => entry.id === props.noteId && !entry.deletedAt);

      if (!refreshed || !refreshed.isVisible) {
        await closeNoteWindow(props.noteId);
        return;
      }
    }),
  );
});

onBeforeUnmount(() => {
  window.removeEventListener('pointermove', onDragPointerMove);
  window.removeEventListener('pointerup', onDragPointerEnd);
  window.removeEventListener('pointercancel', onDragPointerEnd);

  for (const unlisten of unlistenFns) {
    unlisten();
  }
});
</script>

<template>
  <section v-if="canRenderNote" :class="['desktop-note-window', noteClass]" @pointerdown="beginDragCandidate">
    <header class="desktop-note-window__header">
      <input
        v-if="isEditingTitle"
        ref="titleInputRef"
        v-model="draftTitle"
        class="desktop-note-window__title-input"
        maxlength="80"
        type="text"
        @pointerdown.stop
        @blur="commitTitleEdit"
        @keydown="onTitleKeydown"
      />
      <button
        v-else
        class="desktop-note-window__title-button"
        type="button"
        @pointerdown.stop
        @dblclick.stop="beginTitleEdit"
      >
        {{ note.title }}
      </button>
      <button
        :aria-expanded="isSettingsOpen"
        aria-label="Toggle note settings"
        class="note-settings-toggle"
        type="button"
        @pointerdown.stop
        @click.stop="toggleSettings"
      >
        ...
      </button>
    </header>

    <StickyNoteToolbar
      :colors="noteColors"
      :is-open="isSettingsOpen"
      :note="note"
      :on-color-change="updateColor"
      :on-delete="deleteNote"
      :on-font-size-change="updateFontSize"
      :on-hide="hideCurrentNote"
    />

    <textarea
      v-if="isEditingContent"
      ref="contentInputRef"
      v-model="draftContent"
      class="note-editor"
      placeholder="Write something important..."
      @pointerdown.stop
      @blur="commitContentEdit"
      @focus="focusNoteWindow(note.id)"
      @keydown="onContentKeydown"
    />
    <button
      v-else
      class="note-content-display"
      type="button"
      @pointerdown.stop
      @dblclick.stop="beginContentEdit"
    >
      {{ note.content || 'Write something important...' }}
    </button>

    <button class="resize-handle" type="button" @pointerdown.prevent="startResizeDragging" />
  </section>

  <main v-else-if="notesStore.initialized" class="note-missing">
    <p>This note is no longer available.</p>
  </main>
</template>
