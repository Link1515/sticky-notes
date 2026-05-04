<script setup lang="ts">
import { MoveDiagonal2 } from 'lucide-vue-next';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import StickyNoteToolbar from '@/components/StickyNote/StickyNoteToolbar.vue';
import { noteColors, type StickyFontSize, type StickyNote as StickyNoteModel, type StickyNoteColor } from '@/features/notes/notesTypes';
import { useNotesStore } from '@/features/notes/notesStore';

const props = defineProps<{
  note: StickyNoteModel;
}>();

const notesStore = useNotesStore();
const noteRef = ref<HTMLElement | null>(null);

const noteStyle = computed(() => ({
  left: `${props.note.x}px`,
  top: `${props.note.y}px`,
  width: `${props.note.width}px`,
  height: `${props.note.height}px`,
  zIndex: String(props.note.zIndex),
}));

const dragState = {
  active: false,
  startX: 0,
  startY: 0,
  originX: 0,
  originY: 0,
};

let resizeObserver: ResizeObserver | null = null;

const handlePointerMove = (event: PointerEvent) => {
  if (!dragState.active) {
    return;
  }

  const deltaX = event.clientX - dragState.startX;
  const deltaY = event.clientY - dragState.startY;

  notesStore.updateNotePosition(props.note.id, dragState.originX + deltaX, dragState.originY + deltaY, false);
};

const handlePointerUp = () => {
  if (!dragState.active) {
    return;
  }

  dragState.active = false;
  notesStore.commitNotePosition(props.note.id);
  window.removeEventListener('pointermove', handlePointerMove);
  window.removeEventListener('pointerup', handlePointerUp);
};

const startDrag = (event: PointerEvent) => {
  dragState.active = true;
  dragState.startX = event.clientX;
  dragState.startY = event.clientY;
  dragState.originX = props.note.x;
  dragState.originY = props.note.y;

  notesStore.bringToFront(props.note.id);
  window.addEventListener('pointermove', handlePointerMove);
  window.addEventListener('pointerup', handlePointerUp);
};

const updateColor = (color: StickyNoteColor) => {
  notesStore.updateNote(props.note.id, { color });
};

const updateFontSize = (fontSize: StickyFontSize) => {
  notesStore.updateNote(props.note.id, { fontSize });
};

const deleteNote = () => {
  const confirmed = window.confirm('Delete this sticky note?');
  if (confirmed) {
    notesStore.deleteNote(props.note.id);
  }
};

onMounted(() => {
  if (!noteRef.value) {
    return;
  }

  resizeObserver = new ResizeObserver((entries) => {
    const entry = entries[0];
    if (!entry) {
      return;
    }

    const { width, height } = entry.contentRect;
    notesStore.updateNoteSize(props.note.id, width, height);
  });

  resizeObserver.observe(noteRef.value);
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  window.removeEventListener('pointermove', handlePointerMove);
  window.removeEventListener('pointerup', handlePointerUp);
});
</script>

<template>
  <article
    ref="noteRef"
    :class="['sticky-note', `sticky-note--${note.color}`, `sticky-note--${note.fontSize}`]"
    :style="noteStyle"
    @pointerdown="notesStore.bringToFront(note.id)"
  >
    <header class="note-header" @pointerdown.prevent="startDrag">
      <span>Note</span>
      <span class="drag-hint">Drag</span>
    </header>

    <StickyNoteToolbar
      :colors="noteColors"
      :note="note"
      :on-color-change="updateColor"
      :on-delete="deleteNote"
      :on-font-size-change="updateFontSize"
    />

    <textarea
      :value="note.content"
      class="note-editor"
      placeholder="Write something important..."
      @input="notesStore.updateNote(note.id, { content: ($event.target as HTMLTextAreaElement).value })"
    />

    <span aria-hidden="true" class="resize-handle resize-handle--passive">
      <MoveDiagonal2 :size="16" />
    </span>
  </article>
</template>
