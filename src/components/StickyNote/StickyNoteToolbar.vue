<script setup lang="ts">
import { ref } from 'vue';
import { Check, EyeOff, Trash2 } from 'lucide-vue-next';
import type { StickyFontSize, StickyNote, StickyNoteColor } from '@/features/notes/notesTypes';

const props = defineProps<{
  note: StickyNote;
  colors: readonly StickyNoteColor[];
  isOpen: boolean;
  onColorChange: (color: StickyNoteColor) => void;
  onFontSizeChange: (size: StickyFontSize) => void;
  onHide: () => void;
  onDelete: () => void;
}>();

const isColorPickerOpen = ref(false);

const colorLabels: Record<StickyNoteColor, string> = {
  yellow: 'Yellow',
  mint: 'Mint',
  peach: 'Peach',
  sky: 'Sky',
  lavender: 'Lavender',
};

const fontSizeLabels: Record<StickyFontSize, string> = {
  sm: 'Small',
  md: 'Medium',
  lg: 'Large',
};

const fontSizeOptions: StickyFontSize[] = ['sm', 'md', 'lg'];

const toggleColorPicker = () => {
  isColorPickerOpen.value = !isColorPickerOpen.value;
};

const selectColor = (color: StickyNoteColor) => {
  props.onColorChange(color);
  isColorPickerOpen.value = false;
};
</script>

<template>
  <section v-if="isOpen" class="note-settings-header" @pointerdown.stop>
    <label class="note-settings-header__field">
      <div class="note-color-picker">
        <button
          :aria-expanded="isColorPickerOpen"
          :aria-label="`Current color: ${colorLabels[note.color]}. Choose note color.`"
          class="note-color-swatch note-color-swatch--current"
          type="button"
          @click="toggleColorPicker"
        >
          <span :class="['note-color-swatch__fill', `note-color-swatch__fill--${note.color}`]" aria-hidden="true" />
        </button>

        <div v-if="isColorPickerOpen" class="note-color-picker__menu" role="listbox" aria-label="Note color options">
          <button
            v-for="color in colors"
            :key="color"
            :aria-label="`Set note color to ${colorLabels[color]}`"
            :aria-selected="note.color === color"
            :class="['note-color-swatch', { 'note-color-swatch--selected': note.color === color }]"
            type="button"
            @click="selectColor(color)"
          >
            <span :class="['note-color-swatch__fill', `note-color-swatch__fill--${color}`]" aria-hidden="true" />
            <Check v-if="note.color === color" :size="14" aria-hidden="true" class="note-color-swatch__check" />
          </button>
        </div>
      </div>
    </label>

    <label class="note-settings-header__field">
      <div class="note-font-size-picker" role="group" aria-label="Note text size">
        <button
          v-for="size in fontSizeOptions"
          :key="size"
          :aria-label="`Set text size to ${fontSizeLabels[size]}`"
          :class="['note-font-size-button', `note-font-size-button--${size}`, { 'note-font-size-button--selected': note.fontSize === size }]"
          type="button"
          @click="onFontSizeChange(size)"
        >
          A
        </button>
      </div>
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
