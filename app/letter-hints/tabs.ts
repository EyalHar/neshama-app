// Shared by the server page (reads ?tab=) and the client tabs; a "use client" module can't export values to the server
export const HINTS_TABS = ["initials", "acrostics", "squares", "atbash", "mirror", "first", "els"] as const;
export type HintsTab = (typeof HINTS_TABS)[number];

// Built but hidden for now, at the user's request (not in the tab bar, not reachable by ?tab=)
const HIDDEN = new Set<HintsTab>(["atbash", "mirror"]);
export const VISIBLE_TABS = HINTS_TABS.filter((t) => !HIDDEN.has(t));
