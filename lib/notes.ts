export const NOTE_MAX_LENGTH = 5000;

export type VerseNoteItem = { id: string; verse: number; text: string; updatedAt: string; shareId: string | null };

// Prisma `include` that brings in what toNoteItem needs
export const NOTE_INCLUDE = { share: { select: { id: true } } } as const;

// Confirmation shown before unfavoriting a verse that has notes (unfavoriting deletes them)
export function unfavoriteConfirmMessage(notes: VerseNoteItem[]): string {
  const count = notes.length;
  const what = count === 1 ? "הערה/ חידוש אחד" : `${count} הערות וחידושים`;
  const shared = notes.some((n) => n.shareId) ? " חלק מהם משותפים, והם יוסרו גם מדף השיתופים." : "";
  return `לפסוק יש ${what}. להסיר אותו מהאהובים ולמחוק אותם?${shared}`;
}

export function toNoteItem(n: {
  id: string;
  verse: number;
  text: string;
  updatedAt: Date;
  share?: { id: string } | null;
}): VerseNoteItem {
  return { id: n.id, verse: n.verse, text: n.text, updatedAt: n.updatedAt.toISOString(), shareId: n.share?.id ?? null };
}
