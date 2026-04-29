import { Store } from '@tauri-apps/plugin-store';
import type { StickyNote } from '@/features/notes/notesTypes';
import type { AppSettings } from '@/features/settings/settingsTypes';

const PRIMARY_STORE_PATH = 'sticky-notes.json';
const BACKUP_STORE_PATH = 'sticky-notes.bak.json';
const STATE_KEY = 'sticky-notes-state';

export type PersistedState = {
  version: number;
  notes: StickyNote[];
  settings: AppSettings;
  lastSavedAt: string;
};

type LoadResult = {
  data: PersistedState | null;
  restoredFromBackup: boolean;
};

const getOrLoadStore = async (path: string) => {
  const existingStore = await Store.get(path);
  if (existingStore) {
    return existingStore;
  }

  return Store.load(path);
};

const readState = async (storePath: string) => {
  const store = await getOrLoadStore(storePath);
  return store.get<PersistedState>(STATE_KEY);
};

export const loadPersistedState = async (): Promise<LoadResult> => {
  try {
    const primary = await readState(PRIMARY_STORE_PATH);
    return { data: primary ?? null, restoredFromBackup: false };
  } catch (primaryError) {
    try {
      const backup = await readState(BACKUP_STORE_PATH);
      return { data: backup ?? null, restoredFromBackup: backup !== null };
    } catch (backupError) {
      throw new Error(
        `primary store read failed and backup read failed: ${String(primaryError)} | ${String(backupError)}`,
      );
    }
  }
};

export const savePersistedState = async (state: PersistedState) => {
  const [primaryStore, backupStore] = await Promise.all([
    getOrLoadStore(PRIMARY_STORE_PATH),
    getOrLoadStore(BACKUP_STORE_PATH),
  ]);

  await backupStore.set(STATE_KEY, state);
  await backupStore.save();
  await primaryStore.set(STATE_KEY, state);
  await primaryStore.save();
};
