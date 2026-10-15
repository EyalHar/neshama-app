export const NOTE_MAX_LENGTH = 5000;

export type VerseNoteItem = { id: string; verse: number; text: string; updatedAt: string };

export function toNoteItem(n: { id: string; verse: number; text: string; updatedAt: Date }): VerseNoteItem {
  return { id: n.id, verse: n.verse, text: n.text, updatedAt: n.updatedAt.toISOString() };
}
