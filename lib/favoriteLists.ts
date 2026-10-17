export const LIST_NAME_MAX_LENGTH = 40;

export type FavoriteListItem = { id: string; name: string };

export function cleanListName(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const name = raw.replace(/\s+/g, " ").trim();
  return name.length >= 1 && name.length <= LIST_NAME_MAX_LENGTH ? name : null;
}
