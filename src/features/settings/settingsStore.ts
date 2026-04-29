import { defineStore } from 'pinia';
import { getErrorDetail, humanizeError } from '@/lib/errors';
import { loadNotesState, persistNotesState } from '@/features/notes/notesPersistence';
import { defaultSettings, type AppSettings } from '@/features/settings/settingsTypes';
import { readLaunchAtStartup, writeLaunchAtStartup } from '@/features/settings/settingsRepository';
import { useNotesStore } from '@/features/notes/notesStore';

export const useSettingsStore = defineStore('settings', {
  state: () => ({
    settings: { ...defaultSettings } as AppSettings,
    initialized: false,
    error: '' as string,
    autostartPending: false,
  }),
  actions: {
    async initialize() {
      if (this.initialized) {
        return;
      }

      try {
        const [{ state }, autostartEnabled] = await Promise.all([loadNotesState(), readLaunchAtStartup()]);
        this.settings = {
          ...state.settings,
          launchAtStartup: autostartEnabled,
        };
      } catch (error) {
        this.error = humanizeError('SETTINGS_LOAD_FAILED', getErrorDetail(error));
      } finally {
        this.initialized = true;
      }
    },
    async updateSettings(patch: Partial<AppSettings>) {
      this.settings = { ...this.settings, ...patch };
      const notesStore = useNotesStore();

      if (notesStore.initialized) {
        await persistNotesState(notesStore.notes, this.settings).catch((error) => {
          this.error = humanizeError('SETTINGS_SAVE_FAILED', getErrorDetail(error));
        });
      }
    },
    async setLaunchAtStartup(enabled: boolean) {
      this.autostartPending = true;
      this.error = '';

      try {
        await writeLaunchAtStartup(enabled);
        await this.updateSettings({ launchAtStartup: enabled });
      } catch (error) {
        this.error = humanizeError(
          enabled ? 'AUTOSTART_ENABLE_FAILED' : 'AUTOSTART_DISABLE_FAILED',
          getErrorDetail(error),
        );
      } finally {
        this.autostartPending = false;
      }
    },
  },
});
