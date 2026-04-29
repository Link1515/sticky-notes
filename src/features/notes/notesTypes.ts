export const noteColors = ['yellow', 'mint', 'peach', 'sky', 'lavender'] as const;
export type StickyNoteColor = (typeof noteColors)[number];

export const fontSizes = ['sm', 'md', 'lg'] as const;
export type StickyFontSize = (typeof fontSizes)[number];

export type StickyNote = {
  id: string;
  title: string;
  content: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: StickyNoteColor;
  fontSize: StickyFontSize;
  isPinned: boolean;
  isVisible: boolean;
  zIndex: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
};
