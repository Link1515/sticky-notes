<script setup lang="ts">
import { EyeOff, Trash2 } from 'lucide-vue-next';
import type { StickyFontSize, StickyNote, StickyNoteColor } from '@/features/notes/notesTypes';

defineProps<{
  note: StickyNote;
  colors: readonly StickyNoteColor[];
  isOpen: boolean;
  onColorChange: (color: StickyNoteColor) => void;
  onFontSizeChange: (size: StickyFontSize) => void;
  onHide: () => void;
  onDelete: () => void;
}>();
</script>

<template>
  <section v-if="isOpen" class="note-settings-header" @pointerdown.stop>
    <label class="note-settings-header__field">
      <span>Color</span>
      <select :value="note.color" aria-label="Note color" @change="onColorChange(($event.target as HTMLSelectElement).value as StickyNoteColor)">
        <option v-for="color in colors" :key="color" :value="color">
          {{ color }}
        </option>
      </select>
    </label>

    <label class="note-settings-header__field">
      <span>Text size</span>
      <select :value="note.fontSize" aria-label="Font size" @change="onFontSizeChange(($event.target as HTMLSelectElement).value as StickyFontSize)">
        <option value="sm">Small</option>
        <option value="md">Medium</option>
        <option value="lg">Large</option>
      </select>
    </label>

    <button
      aria-label="Hide note"
      class="note-icon-button note-icon-button--ghost note-settings-header__action"
      title="Hide note"
      type="button"
      @click="onHide"
    >
      <EyeOff :size="16" aria-hidden="true" />
    </button>

    <button
      aria-label="Delete note"
      class="note-icon-button note-icon-button--danger note-settings-header__action"
      title="Delete note"
      type="button"
      @click="onDelete"
    >
      <Trash2 :size="16" aria-hidden="true" />
    </button>
  </section>
</template>
