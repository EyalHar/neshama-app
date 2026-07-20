# התנ"ך שבקרבי — תיעוד מלא של הפרויקט

## סקירה כללית

"התנ"ך שבקרבי" הוא אפליקציית ווב בעברית המיועדת לחיבור אישי עם התנ"ך. האפליקציה מאפשרת קריאה מסודרת פרק אחר פרק עם מעקב התקדמות, חיפוש מתקדם בטקסט, התאמה רגשית באמצעות AI, חידון פסוקים, ועוד.

האפליקציה פועלת בממשק RTL מלא בעברית, עם אימות Google OAuth ועיצוב מודרני ומלוטש.

---

## טכנולוגיות

| שכבה | טכנולוגיה |
|---|---|
| Framework | Next.js 16 (App Router, React 19, TypeScript 5) |
| Styling | Tailwind CSS 4 |
| Auth | NextAuth 5 (beta) — Google OAuth בלבד |
| Database | SQLite דרך Prisma ORM |
| AI / LLM | Groq (`llama-3.3-70b-versatile`) — ראשי |
| נתוני פסוקים | Sefaria.org API (עם ניקוד וטעמים) |
| Font | Geist (Next.js font optimization) |

SDKs נוספים מותקנים אך לא בשימוש פעיל: Anthropic, OpenAI, Google Gemini.

---

## מבנה התיקיות

```
neshama-app/
├── app/
│   ├── api/                    ← כל ה-API routes
│   │   ├── auth/[...nextauth]/ ← NextAuth handler
│   │   ├── events/             ← חיפוש אירועי תנ"ך ע"י LLM
│   │   ├── neshama/            ← התאמה רגשית ע"י LLM
│   │   ├── quiz/               ← יצירת שאלות חידון ע"י LLM
│   │   ├── tanakh/             ← ניהול התקדמות קריאה
│   │   │   ├── bulk/           ← סימון/ניקוי פרק שלם
│   │   │   ├── reset/          ← מחיקת כל ההתקדמות
│   │   │   └── stats/          ← סטטיסטיקות משתמש
│   │   ├── verses/
│   │   │   ├── binyan/         ← חיפוש לפי בניין
│   │   │   ├── letters/        ← חיפוש לפי אות ראשונה/אחרונה
│   │   │   ├── root/           ← חיפוש לפי שורש עברי
│   │   │   └── substring/      ← חיפוש תת-מחרוזת
│   │   └── admin/
│   │       ├── seed-oshb/      ← זריעת נתוני מורפולוגיה
│   │       └── seed-strongs/   ← זריעת מילון Strong's
│   ├── components/
│   │   ├── Sidebar.tsx         ← ניווט ראשי (ימין, RTL)
│   │   ├── SessionWrapper.tsx  ← NextAuth provider
│   │   └── Confetti.tsx        ← אנימציית חגיגת אבן דרך
│   ├── events/page.tsx         ← חיפוש אירועי תנ"ך
│   ├── advanced/page.tsx       ← חיפוש מתקדם (ריבוי טאבים)
│   ├── letters/page.tsx        ← חיפוש לפי אות
│   ├── neshama/page.tsx        ← התאמה רגשית
│   ├── quiz/page.tsx           ← חידון פסוקים
│   ├── tanakh/page.tsx         ← קורא התנ"ך
│   ├── unknown-roots/page.tsx  ← שורשים לא ידועים
│   ├── login/page.tsx          ← כניסה עם Google
│   ├── admin/seed/page.tsx     ← ממשק זריעת DB
│   ├── page.tsx                ← דף הבית
│   └── layout.tsx              ← Layout שורש: RTL, Sidebar, SessionWrapper
├── lib/
│   ├── prisma.ts               ← PrismaClient singleton
│   └── tanakh.ts               ← מטא-דאטה של ספרים, המרה לגימטריה, fetch מ-Sefaria
├── prisma/
│   ├── schema.prisma
│   └── dev.db
├── docs/                       ← תיעוד הפרויקט
└── auth.ts                     ← הגדרות NextAuth
```

---

## דפים

| נתיב | תיאור |
|---|---|
| `/` | דף בית — כרטיסי פיצ'ר לכל הסעיפים |
| `/tanakh` | קורא תנ"ך — בחירת ספר/פרק, סימון פסוקים, מעקב התקדמות, חגיגות |
| `/events` | חיפוש אירועי תנ"ך — LLM מחזיר מקורות לפי שם אירוע |
| `/advanced` | חיפוש מתקדם — 4 טאבים: בסיסי, תת-מחרוזת, שורש, בניין |
| `/letters` | חיפוש לפי אות ראשונה ו/או אחרונה |
| `/quiz` | חידון השלם המילה החסרה — 4 אפשרויות בחירה |
| `/neshama` | AI — תאר מצב רגשי → קבל פסוקים מותאמים + צבע ערכת נושא |
| `/unknown-roots` | טבלה שיתופית — מילוי שורשים חסרים במילון Strong's |
| `/login` | כניסה עם Google OAuth |
| `/admin/seed` | זריעת DB (OSHB מורפולוגיה + מילון Strong's) |

---

## מסד נתונים (Prisma / SQLite)

### מודלי Auth (NextAuth)
| מודל | תיאור |
|---|---|
| `User` | משתמש (cuid, email, name, image) |
| `Account` | קישור OAuth |
| `Session` | sessions של NextAuth |
| `VerificationToken` | אימות אימייל |

### מודלי אפליקציה
| מודל | תיאור |
|---|---|
| `ReadVerse` | פסוקים שסומנו כנקראו (userId, book, chapter, verse) |
| `CompletedChapter` | פרקים שהושלמו במלואם (userId, book, chapter) |
| `VerseText` | כל פסוקי התנ"ך עם ניקוד (`text`), ללא ניקוד (`plainText`), אות ראשונה/אחרונה |
| `WordEntry` | ניתוח מורפולוגי לכל מילה (lemma, מספר Strong's, קוד morph) |
| `StrongsEntry` | מילון Strong's העברי (מספר, lemmaHe, lemmaPlain, xlit, definition, derivedFrom) |
| `UnknownRoot` | רשומות Strong's ללא שורש אב — לתרומה שיתופית |

---

## API Routes

### קריאת תנ"ך והתקדמות
| Method | Route | תיאור |
|---|---|---|
| GET | `/api/tanakh?book=&chapter=` | שליפת פרק מ-Sefaria + סטטוס קריאה של המשתמש |
| POST | `/api/tanakh` | טוגל סימון פסוק בודד כנקרא |
| POST | `/api/tanakh/bulk` | סימון/ניקוי פרק שלם |
| DELETE | `/api/tanakh/reset` | מחיקת כל ההתקדמות של המשתמש |
| GET | `/api/tanakh/stats` | מספר פרקים שהושלמו |

### חיפוש
| Method | Route | תיאור |
|---|---|---|
| GET | `/api/verses/substring?q=&scope=&whole=&page=` | חיפוש תת-מחרוזת (500 לעמוד) |
| GET | `/api/verses/root?root=&scope=&view=&page=` | חיפוש שורש + BFS עץ משפחה (200 לעמוד) |
| GET | `/api/verses/binyan?stem=&scope=&page=` | חיפוש לפי בניין |
| GET | `/api/verses/letters?first=&last=` | חיפוש לפי אות ראשונה/אחרונה |

### AI
| Method | Route | תיאור |
|---|---|---|
| POST | `/api/neshama` | Groq: זיהוי רגש → 2-3 פסוקים מותאמים + מסר אישי |
| POST | `/api/quiz` | Groq: בחירת פסוק → השלמת מילה חסרה + 4 אפשרויות |
| POST | `/api/events` | Groq: שם אירוע → עד 10 מקורות תנ"כיים |

---

## פיצ'רים בפירוט

### קורא התנ"ך (`/tanakh`)
- בחירת ספר ופרק מתוך ניווט חזותי
- סימון פסוקים בודדים ופרקים שלמים
- אבני דרך: פרק → ספר → חלק (תורה/נביאים/כתובים) → כל התנ"ך
- חגיגות: קונפטי + צלילי Web Audio API
- שמירת מיקום אחרון ב-localStorage
- כפתורי קפיצה אקראית לספר/פרק/פסוק

### חיפוש אירועים (`/events`)
- הזנת שם אירוע בעברית
- Groq מזהה את כל המקורות הרלוונטיים
- מביא טקסט כל פסוק מ-Sefaria (עם ניקוד)
- כפתור "סמן כנקרא" לכל פסוק (למשתמשים מחוברים)
- כפתור "עבור לפרק" — ניווט לקורא ספציפי

### חיפוש מתקדם (`/advanced`)
- **בסיסי / תת-מחרוזת** — חיפוש טקסט עברי עם עימוד (500 לעמוד)
- **שורש** — הזנת שורש עברי → מיפוי למספר Strong's → BFS ל"עץ משפחה" של נגזרות; מצב ישיר מול אטימולוגי; פילטר חלק
- **בניין** — פילטר לפי גזרה: קל, נפעל, פיעל, פועל, הפעיל, הופעל, התפעל
- **אות** — פסוקים שמתחילים/נגמרים באות שנבחרה

### נשמה (`/neshama`)
- משתמש מתאר מצב רגשי ומשאלה בעברית
- Groq מזהה קטגוריית רגש (9 קטגוריות) ומחזיר 2-3 פסוקים
- ערכת הצבעים של הדף משתנה דינמית לפי הרגש
- לכל פסוק הסבר והמלצה אישית

### חידון (`/quiz`)
- Groq בוחר פסוק אקראי, מסתיר מילה אחת, יוצר 4 אפשרויות
- פסוק מוצג עם ניקוד, אפשרויות ללא ניקוד
- אפשרות לסמן כנקרא ולעבור לפרק

### שורשים לא ידועים (`/unknown-roots`)
- טבלה של רשומות Strong's שאין להן שורש אב
- מציגה פסוק לדוגמה לכל רשומה
- משתמשים יכולים להציע שורש; מונה התקדמות

---

## ניהול מצב (State Management)

| מנגנון | שימוש |
|---|---|
| React hooks (useState, useEffect) | כל ה-state של הקומפוננטות |
| localStorage (key: `tanakh-position`) | שמירת מיקום קריאה: `{ bookId: string, chapter: number }` |
| DOM Event `tanakh-stats-update` | עדכון סטטיסטיקות sidebar ללא prop drilling |
| NextAuth + useSession | session auth גלובלי בקומפוננטות client |
| URL search params | העברת book/chapter בין דפים |

---

## Authentication

- Google OAuth בלבד — אין אפשרות email/password
- **Server components / API routes**: `auth()` מתוך `@/auth`
- **Client components**: `useSession()` מ-`next-auth/react`
- NextAuth עם Prisma Adapter — sessions נשמרות ב-SQLite

---

## ארכיטקטורה — החלטות לא-ברורות

### מקור טקסט פסוקים
- **הצגה**: תמיד מ-Sefaria בזמן אמת (`fetchChapter()` ב-`lib/tanakh.ts`) — עם ניקוד וטעמים מלאים
- **חיפוש**: מהטבלה `VerseText` ב-SQLite (plain text ללא ניקוד)
- שתי המקורות חייבים להישאר מסונכרנים

### קסקדת אבני דרך (Milestone Cascade)
כאשר פסוק מסומן כנקרא, `POST /api/tanakh` בודק ברצף:
פסוק → פרק → ספר → חלק → כל התנ"ך.
התגובה כוללת flags (`chapterJustCompleted`, `bookJustCompleted` וכו') שהלקוח משתמש בהם לאנימציות.

### עדכון Sidebar ללא prop drilling
Sidebar מרונדר ב-root layout מחוץ לעץ הדפים. עדכון סטטיסטיקות מתבצע דרך:
```typescript
window.dispatchEvent(new CustomEvent("tanakh-stats-update"));
```
ה-Sidebar מאזין ל-event זה וקורא מחדש ל-`/api/tanakh/stats`.

### BFS לחיפוש שורשים
`GET /api/verses/root` ממפה שורש עברי → מספר Strong's, ואז מבצע BFS דרך `StrongsEntry.derivedFrom` (מספרי Strong's מופרדים בפסיקים) לבניית עץ משפחה שלם.

### מזהי ספרים
מזהי ספרים הם תמיד באנגלית (`"Genesis"`, `"I Samuel"` וכו') — חייבים להתאים לפורמט Sefaria. הרשימה הקנונית: `TANAKH_BOOKS` ב-`lib/tanakh.ts`. לעולם לא להשתמש בשמות עבריים כמפתחות DB.

### Groq — עקרונות שימוש
- Groq **לעולם לא** מחזיר טקסט פסוקים — רק הפניות (sefaria_ref)
- טקסט הפסוקים תמיד נשלף מ-Sefaria לאחר מכן
- כל ה-calls משתמשים ב-`response_format: { type: "json_object" }`
- אין streaming — תגובה יחידה ומלאה

---

## זריעת DB

מסד הנתונים חייב להיות מזורע לפני שפיצ'רי החיפוש עובדים:
1. `/admin/seed` (ממשק UI)
2. `POST /api/admin/seed-oshb` — מורפולוגיה OSHB (מחולק לתורה/נביאים/כתובים לאמינות)
3. `POST /api/admin/seed-strongs` — מילון Strong's

---

## משתני סביבה

```
DATABASE_URL          # מסלול SQLite (file:./dev.db)
NEXTAUTH_SECRET       # מפתח חתימת NextAuth
NEXTAUTH_URL          # URL בסיסי לcallbacks של OAuth
GOOGLE_ID             # Google OAuth client ID
GOOGLE_SECRET         # Google OAuth client secret
GROQ_API_KEY          # Groq LLM API key
ANTHROPIC_API_KEY     # Anthropic (מותקן, שמור לשימוש עתידי)
```

---

## עיצוב

- RTL מלא — `dir="rtl"` ו-`lang="he"` על root layout
- Sidebar בצד **ימין** (מנהג עברי)
- פלטת צבעים: stone/amber (Tailwind)
- דף נשמה: פלטה דינמית לפי רגש (9 ערכות)
- Responsive — sidebar מתמוטט ל-hamburger במובייל
- גופן Geist דרך Next.js font optimization

---

## פקודות פיתוח

```bash
npm run dev       # שרת פיתוח (localhost:3000)
npm run build     # build לייצור
npm run lint      # בדיקת ESLint

npx prisma generate          # יצירת Prisma client לאחר שינוי schema
npx prisma migrate dev       # הפעלת migration חדש
npx prisma migrate deploy    # הפעלת migrations בייצור
npx prisma studio            # ממשק גרפי ל-DB
```
