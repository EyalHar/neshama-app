// Shared by the server page (reads ?tab=) and the client tabs
export const PATTERN_TABS = ["chiasm", "repeats"] as const;
export type PatternTab = (typeof PATTERN_TABS)[number];
