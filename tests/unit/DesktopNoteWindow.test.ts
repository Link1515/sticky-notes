import { createPinia, setActivePinia } from 'pinia';
import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DesktopNoteWindow from '@/components/DesktopNoteWindow/DesktopNoteWindow.vue';
import { createNoteModel, useNotesStore } from '@/features/notes/notesStore';

const appWindowMock = {
  label: 'note-test-note',
  scaleFactor: vi.fn(async () => 1),
  outerPosition: vi.fn(async () => ({ toLogical: () => ({ x: 24, y: 48 }) })),
  innerSize: vi.fn(async () => ({ toLogical: () => ({ width: 260, height: 220 }) })),
  startDragging: vi.fn(async () => undefined),
  startResizeDragging: vi.fn(async () => undefined),
  onMoved: vi.fn(async () => () => undefined),
  onResized: vi.fn(async () => () => undefined),
  onCloseRequested: vi.fn(async () => () => undefined),
};

vi.mock('@tauri-apps/api/window', () => ({
  getCurrentWindow: () => appWindowMock,
}));

vi.mock('@/features/notes/notesEvents', () => ({
  listenForNotesChanged: vi.fn(async () => () => undefined),
}));

vi.mock('@/features/notes/noteWindow', () => ({
  closeNoteWindow: vi.fn(async () => undefined),
  ensureNoteWindowVisible: vi.fn(async () => undefined),
  focusNoteWindow: vi.fn(async () => undefined),
  isTauriRuntime: vi.fn(() => true),
  setNoteWindowPinned: vi.fn(async () => undefined),
}));

describe('DesktopNoteWindow', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('closes the settings toolbar when clicking outside of it', async () => {
    const notesStore = useNotesStore();
    const note = createNoteModel('yellow', 260, 220, 1);

    note.id = 'test-note';
    notesStore.initialized = true;
    notesStore.notes = [note];

    const wrapper = mount(DesktopNoteWindow, {
      props: {
        noteId: note.id,
      },
    });

    expect(wrapper.find('.note-settings-header').exists()).toBe(false);

    await wrapper.get('.note-settings-toggle').trigger('click');
    expect(wrapper.find('.note-settings-header').exists()).toBe(true);

    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    await wrapper.vm.$nextTick();

    expect(wrapper.find('.note-settings-header').exists()).toBe(false);
  });
});
