import type { StickyNote } from '@/features/notes/notesTypes';

const MIN_MARGIN = 24;

export const clampNoteToViewport = (note: StickyNote, viewportWidth: number, viewportHeight: number): StickyNote => {
  const maxX = Math.max(MIN_MARGIN, viewportWidth - note.width);
  const maxY = Math.max(MIN_MARGIN, viewportHeight - note.height);

  return {
    ...note,
    x: Math.min(Math.max(note.x, 0), maxX),
    y: Math.min(Math.max(note.y, 0), maxY),
  };
};
