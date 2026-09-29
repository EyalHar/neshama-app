// Curated list of 29 traditional Jerusalem names (a subset of the ~70 named in Midrash
// Bamidbar Rabba 14:12), each verified against this app's own VerseText/WordEntry/
// StrongsEntry tables. Do not add names to this list without the same verification —
// see the feature request that produced it for the full audit trail.
//
// Two resolution strategies:
// - "lemma": the name has its own dedicated Strong's number, so ALL real occurrences are
//   resolved live from WordEntry at request time (see resolveLemma() in the API route).
// - "phrase": the name is a specific multi-word phrase with no dedicated lexeme, resolved
//   live via a VerseText.plainText substring match (letters only, matches the app's
//   established substring-search convention).
// - "fixed": a curated citation (or citations) — either a phrase that happens to be a
//   common homograph elsewhere in the Tanakh (e.g. בשן = the region of Bashan in ~60
//   other verses) or a multi-word phrase already confirmed to occur only at the cited
//   verse(s). These must NOT be re-resolved by searching all occurrences.

export type JerusalemNameSource = "lemma" | "phrase" | "fixed";

export type VerseCitation = { book: string; chapter: number; verse: number };

export type JerusalemName = {
  id: string;
  name: string; // display form, with nikud
  source: JerusalemNameSource;
  strongsNumber?: string; // for "lemma"
  exclude?: VerseCitation[]; // verses to exclude even though the lexeme matches
  phrase?: string; // letters-only phrase, for "phrase"
  citations?: VerseCitation[]; // for "fixed"
};

export const JERUSALEM_NAMES: JerusalemName[] = [
  // Category A — resolved live via a dedicated Strong's number
  { id: "shalem", name: "שָׁלֵם", source: "lemma", strongsNumber: "8004" },
  { id: "tzion", name: "צִיּוֹן", source: "lemma", strongsNumber: "6726" },
  { id: "yevus", name: "יְבוּס", source: "lemma", strongsNumber: "2982" },
  { id: "moriah", name: "מוֹרִיָּה", source: "lemma", strongsNumber: "4179" },
  {
    id: "ariel",
    name: "אֲרִיאֵל",
    source: "lemma",
    strongsNumber: "740",
    // Ezra 8:16 uses the same Strong's number for an unrelated person's name, not Jerusalem.
    exclude: [{ book: "Ezra", chapter: 8, verse: 16 }],
  },
  // Category A — resolved live via phrase search (no dedicated lexeme)
  { id: "ir-david", name: "עִיר דָּוִד", source: "phrase", phrase: "עיר דוד" },

  // Category B — fixed, curated citations (verified to occur only at these verses,
  // or to be common homographs elsewhere, so "all occurrences" would be wrong)
  { id: "hashem-yireh", name: "הֽ' יִרְאֶה", source: "fixed", citations: [{ book: "Genesis", chapter: 22, verse: 14 }] },
  { id: "har-tzion", name: "הַר צִיּוֹן", source: "fixed", citations: [{ book: "Psalms", chapter: 48, verse: 3 }] },
  { id: "yefe-nof", name: "יְפֵה נוֹף", source: "fixed", citations: [{ book: "Psalms", chapter: 48, verse: 3 }] },
  { id: "mesos-kol-haaretz", name: "מְשׂוֹשׂ כָּל הָאָרֶץ", source: "fixed", citations: [{ book: "Psalms", chapter: 48, verse: 3 }] },
  { id: "kiryat-melech-rav", name: "קִרְיַת מֶלֶךְ רָב", source: "fixed", citations: [{ book: "Psalms", chapter: 48, verse: 3 }] },
  { id: "yarketei-tzafon", name: "יַרְכְּתֵי צָפוֹן", source: "fixed", citations: [{ book: "Psalms", chapter: 48, verse: 3 }] },
  { id: "beulah", name: "בְּעוּלָה", source: "fixed", citations: [{ book: "Isaiah", chapter: 62, verse: 4 }] },
  { id: "chefzi-vah", name: "חֶפְצִי בָהּ", source: "fixed", citations: [{ book: "Isaiah", chapter: 62, verse: 4 }] },
  { id: "har-moed", name: "הַר מוֹעֵד", source: "fixed", citations: [{ book: "Isaiah", chapter: 14, verse: 13 }] },
  { id: "rabati-am", name: "רַבָּתִי עָם", source: "fixed", citations: [{ book: "Lamentations", chapter: 1, verse: 1 }] },
  { id: "rabati-vagoyim", name: "רַבָּתִי בַגּוֹיִם", source: "fixed", citations: [{ book: "Lamentations", chapter: 1, verse: 1 }] },
  { id: "sarati-bamedinot", name: "שָׂרָתִי בַּמְּדִינוֹת", source: "fixed", citations: [{ book: "Lamentations", chapter: 1, verse: 1 }] },
  { id: "ir-lo-neezavah", name: "עִיר לֹא נֶעֱזָבָה", source: "fixed", citations: [{ book: "Isaiah", chapter: 62, verse: 12 }] },
  { id: "gilah", name: "גִּילָה", source: "fixed", citations: [{ book: "Isaiah", chapter: 65, verse: 18 }] },
  { id: "bashan", name: "בָּשָׁן", source: "fixed", citations: [{ book: "Psalms", chapter: 68, verse: 16 }] },
  { id: "chadrach", name: "חַדְרָךְ", source: "fixed", citations: [{ book: "Zechariah", chapter: 9, verse: 1 }] },
  { id: "kelilat-yofi", name: "כְּלִילַת יֹפִי", source: "fixed", citations: [{ book: "Lamentations", chapter: 2, verse: 15 }] },
  { id: "gey-chizayon", name: "גֵּיא חִזָּיוֹן", source: "fixed", citations: [{ book: "Isaiah", chapter: 22, verse: 1 }] },
  { id: "kiryah-neemanah", name: "קִרְיָה נֶאֱמָנָה", source: "fixed", citations: [{ book: "Isaiah", chapter: 1, verse: 26 }] },
  { id: "ir-hatzedek", name: "עִיר הַצֶּדֶק", source: "fixed", citations: [{ book: "Isaiah", chapter: 1, verse: 26 }] },
  { id: "har-hakodesh", name: "הַר הַקֹּדֶש", source: "fixed", citations: [{ book: "Isaiah", chapter: 27, verse: 13 }] },
  { id: "ir-hakodesh", name: "עִיר הַקֹּדֶש", source: "fixed", citations: [{ book: "Isaiah", chapter: 48, verse: 2 }] },
  { id: "ir-haemet", name: "עִיר הָאֱמֶת", source: "fixed", citations: [{ book: "Zechariah", chapter: 8, verse: 3 }] },
];
