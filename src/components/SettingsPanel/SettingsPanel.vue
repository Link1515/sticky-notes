<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { noteColors } from '@/features/notes/notesTypes';
import { useSettingsStore } from '@/features/settings/settingsStore';

const settingsStore = useSettingsStore();
const { settings, autostartPending } = storeToRefs(settingsStore);
</script>

<template>
  <section class="settings-card">
    <div class="settings-header">
      <h2>Settings</h2>
      <p>Desktop behavior and note defaults.</p>
    </div>

    <label class="toggle-row">
      <span>Launch at startup</span>
      <input
        :checked="settings.launchAtStartup"
        :disabled="autostartPending"
        type="checkbox"
        @change="settingsStore.setLaunchAtStartup(($event.target as HTMLInputElement).checked)"
      />
    </label>

    <label class="toggle-row">
      <span>Show notes on startup</span>
      <input
        :checked="settings.showOnStartup"
        type="checkbox"
        @change="settingsStore.updateSettings({ showOnStartup: ($event.target as HTMLInputElement).checked })"
      />
    </label>

    <label class="field">
      <span>Default color</span>
      <select
        :value="settings.defaultNoteColor"
        @change="settingsStore.updateSettings({ defaultNoteColor: ($event.target as HTMLSelectElement).value })"
      >
        <option v-for="color in noteColors" :key="color" :value="color">
          {{ color }}
        </option>
      </select>
    </label>

    <label class="field">
      <span>Autosave debounce</span>
      <input
        :value="settings.autosaveDebounceMs"
        min="200"
        max="2000"
        step="100"
        type="number"
        @change="settingsStore.updateSettings({ autosaveDebounceMs: Number(($event.target as HTMLInputElement).value) })"
      />
    </label>
  </section>
</template>
