<script setup lang="ts">
import StickyNote from '@/components/StickyNote/StickyNote.vue';
import { useNotesStore } from '@/features/notes/notesStore';

const notesStore = useNotesStore();
</script>

<template>
  <section class="canvas" aria-label="Sticky note canvas">
    <StickyNote
      v-for="note in notesStore.visibleNotes"
      :key="note.id"
      :note="note"
    />
  </section>
</template>
