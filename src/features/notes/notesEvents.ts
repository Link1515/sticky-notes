import { getCurrentWindow } from '@tauri-apps/api/window';

const notesChangedEvent = 'notes://changed';

const isTauriRuntime = () => typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

export type NotesChangedPayload = {
  sourceLabel: string;
};

export const emitNotesChanged = async () => {
  if (!isTauriRuntime()) {
    return;
  }

  const appWindow = getCurrentWindow();
  await appWindow.emit(notesChangedEvent, {
    sourceLabel: appWindow.label,
  } satisfies NotesChangedPayload);
};

export const listenForNotesChanged = async (handler: (payload: NotesChangedPayload) => void | Promise<void>) => {
  if (!isTauriRuntime()) {
    return () => {};
  }

  return getCurrentWindow().listen<NotesChangedPayload>(notesChangedEvent, (event) => handler(event.payload));
};
