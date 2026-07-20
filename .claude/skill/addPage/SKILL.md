# Project-Specific Rules

## Adding a New Page
When adding a new page to the app, always add a link to it in **both** places:
1. The **Home screen** (main landing page)
2. The **Sidebar navigation menu**

Never add a page without updating both locations.

## Verse Text Source
Always fetch and display verse text from **Sefaria** — do not use any other source for verse content.

## Displaying a Verse
When **displaying** a verse to the user, always render it with **nikud (vowel marks) and ta'amim (cantillation marks)** fully intact.

## Searching Within a Verse
When **searching** inside verse text (substring matching, root lookup, or any programmatic comparison), strip the text down to **letters and spaces only** — remove all nikud, ta'amim, punctuation, and diacritics before comparing.
