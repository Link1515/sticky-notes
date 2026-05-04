import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { availableMonitors, LogicalPosition, LogicalSize, primaryMonitor } from '@tauri-apps/api/window';
import type { StickyNote } from '@/features/notes/notesTypes';

export const mainWindowLabel = 'main';
const noteWindowPrefix = 'note-';
const minimumNoteWidth = 220;
const minimumNoteHeight = 180;

export const isTauriRuntime = () => typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
export const getNoteWindowLabel = (noteId: string) => `${noteWindowPrefix}${noteId}`;

export const getNoteIdFromWindowLabel = (label: string) =>
  label.startsWith(noteWindowPrefix) ? label.slice(noteWindowPrefix.length) : null;

const waitForWindowCreation = (windowHandle: WebviewWindow) =>
  new Promise<void>((resolve, reject) => {
    let settled = false;

    void windowHandle.once('tauri://created', () => {
      if (!settled) {
        settled = true;
        resolve();
      }
    });

    void windowHandle.once('tauri://error', (event) => {
      if (!settled) {
        settled = true;
        reject(event.payload);
      }
    });
  });

const toErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return 'unknown window creation error';
  }
};

const clampToDesktopWorkArea = async (note: StickyNote) => {
  if (!isTauriRuntime()) {
    return note;
  }

  const monitors = await availableMonitors();

  const isWithinAnyWorkArea = monitors.some((monitor) => {
    const startX = monitor.workArea.position.x;
    const endX = startX + monitor.workArea.size.width;
    const startY = monitor.workArea.position.y;
    const endY = startY + monitor.workArea.size.height;

    return note.x >= startX && note.x <= endX && note.y >= startY && note.y <= endY;
  });

  if (isWithinAnyWorkArea) {
    return note;
  }

  const fallbackMonitor = (await primaryMonitor()) ?? monitors[0];
  if (!fallbackMonitor) {
    return note;
  }

  return {
    ...note,
    x: fallbackMonitor.workArea.position.x + 32,
    y: fallbackMonitor.workArea.position.y + 32,
  };
};

const updateWindowBounds = async (windowHandle: WebviewWindow, note: StickyNote, focus: boolean) => {
  const normalized = await clampToDesktopWorkArea(note);

  await windowHandle.setPosition(new LogicalPosition(normalized.x, normalized.y));
  await windowHandle.setSize(
    new LogicalSize(
      Math.max(normalized.width, minimumNoteWidth),
      Math.max(normalized.height, minimumNoteHeight),
    ),
  );
  await windowHandle.setAlwaysOnTop(normalized.isPinned);
  await windowHandle.show();

  if (focus) {
    await windowHandle.setFocus();
  }
};

export const ensureNoteWindowVisible = async (note: StickyNote, focus: boolean) => {
  if (!isTauriRuntime()) {
    return;
  }

  try {
    const label = getNoteWindowLabel(note.id);
    let windowHandle = await WebviewWindow.getByLabel(label);

    if (!windowHandle) {
      windowHandle = new WebviewWindow(label, {
        x: note.x,
        y: note.y,
        width: Math.max(note.width, minimumNoteWidth),
        height: Math.max(note.height, minimumNoteHeight),
        minWidth: minimumNoteWidth,
        minHeight: minimumNoteHeight,
        title: 'Sticky Note',
        decorations: false,
        transparent: true,
        shadow: false,
        skipTaskbar: true,
        resizable: true,
        alwaysOnTop: note.isPinned,
        focus,
      });
      await waitForWindowCreation(windowHandle);
    }

    await updateWindowBounds(windowHandle, note, focus);
  } catch (error) {
    throw new Error(`Failed to show note window "${note.id}": ${toErrorMessage(error)}`);
  }
};

export const focusNoteWindow = async (noteId: string) => {
  if (!isTauriRuntime()) {
    return;
  }

  const windowHandle = await WebviewWindow.getByLabel(getNoteWindowLabel(noteId));
  if (!windowHandle) {
    return;
  }

  await windowHandle.show();
  await windowHandle.setFocus();
};

export const hideNoteWindow = async (noteId: string) => {
  if (!isTauriRuntime()) {
    return;
  }

  const windowHandle = await WebviewWindow.getByLabel(getNoteWindowLabel(noteId));
  if (!windowHandle) {
    return;
  }

  await windowHandle.hide();
};

export const setNoteWindowPinned = async (noteId: string, isPinned: boolean) => {
  if (!isTauriRuntime()) {
    return;
  }

  const windowHandle = await WebviewWindow.getByLabel(getNoteWindowLabel(noteId));
  if (!windowHandle) {
    return;
  }

  await windowHandle.setAlwaysOnTop(isPinned);
};

export const closeNoteWindow = async (noteId: string) => {
  if (!isTauriRuntime()) {
    return;
  }

  const windowHandle = await WebviewWindow.getByLabel(getNoteWindowLabel(noteId));
  if (!windowHandle) {
    return;
  }

  await windowHandle.close();
};
