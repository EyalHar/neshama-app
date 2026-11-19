import type { ReactNode } from "react";
import TempleIcon from "../components/TempleIcon";

// The study tools, grouped by topic. Shown on /discover and on the home page; the sidebar has a
// single "גלה" link, active on any of these pages.

export type Tool = {
  href: string;
  title: string;
  description: string;
  icon: ReactNode;
};

export type ToolGroup = { title: string; intro: string; tools: Tool[] };

export const TOOL_GROUPS: ToolGroup[] = [
  {
    title: "מילים ואותיות",
    intro: "מאיפה באו המילים, מה קרה להן, אילו מהן נדירות ואילו אותיות נכתבות אחרת",
    tools: [
      {
        href: "/frequencies",
        title: "המילים השכיחות",
        description: "המילים והשורשים שחוזרים הכי הרבה בתורה ובתנ״ך, כמה פעמים, ואיפה הם נזכרים לראשונה",
        icon: "📊",
      },
      {
        href: "/unique-words",
        title: "מילים יחידאיות",
        description: "מילים שמופיעות פעם אחת בלבד בכל התנ״ך, מחולקות לפי תורה, נביאים וכתובים",
        icon: "1",
      },
      {
        href: "/word-shifts",
        title: "גלגולי מילים",
        description: "מילים מקראיות שמשמעותן היום אחרת: החשמל של יחזקאל, האקדח שהיה אבן חן, המדינה שהייתה פלך",
        icon: "↻",
      },
      {
        href: "/loanwords",
        title: "מילים שאולות",
        description: "מילים שנכנסו לעברית המקראית מפרסית, ממצרית, מיוונית ומשפות אחרות, עם הפסוקים",
        icon: "🌍",
      },
      {
        href: "/letter-pairs",
        title: "צירופי אותיות",
        description: "גלגל 231 השערים של ספר יצירה: שורשי המקרא שחולקים צמד אותיות, פנים ואחור",
        icon: "◎",
      },
      {
        href: "/letter-hints",
        title: "רמזים באותיות",
        description: "ראשי תיבות וסופי תיבות, האקרוסטיכונים של תהלים, משלי ואיכה, ודילוגי אותיות, עם מה שצפוי במקרה",
        icon: "⁂",
      },
      {
        href: "/divine-names",
        title: "שמות ה׳",
        description: "השמות והכינויים של ה׳ בתנ״ך, משבעת השמות שאינם נמחקים ועד שמות שניתנו למזבח ולעיר, עם הפסוקים",
        icon: "שׁ",
      },
      {
        href: "/special-letters",
        title: "אותיות מיוחדות",
        description: "אותיות רבתי, זעירות ותלויות ונוני״ן הפוכות בתנ״ך, עם קישור לכל פרק",
        icon: "ב",
      },
      {
        href: "/unknown-roots",
        title: "שורשים לא ידועים",
        description: "ערכים במילון Strong's שלא נקבע להם שורש. אפשר להציע שורש ולעזור להשלים את הטבלה",
        icon: "?",
      },
    ],
  },
  {
    title: "אנשים, מקומות ואירועים",
    intro: "מי פגש את מי, איפה זה קרה ומה מסופר על כך",
    tools: [
      {
        href: "/events",
        title: "אירועי התנ״ך",
        description: "הזן אירוע מהתנ״ך וקבל את כל המקורות בהם הוא מוזכר — מעמד מתן תורה, קריעת ים סוף ועוד",
        icon: "📜",
      },
      {
        href: "/characters",
        title: "רשת הדמויות",
        description: "מי מופיע עם מי: גרף של הדמויות בכל ספר והפרקים שבהם הן נפגשות",
        icon: "👥",
      },
      {
        href: "/jerusalem-names",
        title: "שמות ירושלים",
        description: "מבחר שמותיה של ירושלים בתנ״ך — מ׳שלם׳ ו׳ציון׳ ועד ׳עיר הקודש׳ — עם כל המקורות, מקושרים לקורא",
        icon: <TempleIcon className="text-yellow-700" />,
      },
      {
        href: "/biblical-places",
        title: "ערים ויישובים במקרא",
        description: "יישובים של היום ששמם מופיע בתנ״ך, ולצידם ערים מקראיות שחרבו — כל שם מקושר לפסוק",
        icon: "📍",
      },
    ],
  },
  {
    title: "נוסח ומבנה",
    intro: "איך הטקסט בנוי, נמסר ונדרש: השירות שבתוכו, קטעים שהוא מספר פעמיים, תבניות בסדר המילים, והמידות שבהן חז״ל דרשו אותו",
    tools: [
      {
        href: "/middot",
        title: "י״ג מידות",
        description: "שלוש עשרה המידות שהתורה נדרשת בהן, לפי ברייתא דרבי ישמעאל: הסבר, הדוגמה שבברייתא, ודוגמאות נוספות מהמקורות",
        icon: "13",
      },
      {
        href: "/verse-patterns",
        title: "תבניות בפסוק",
        description: "מילים שחוזרות בסדר הפוך (״שֹׁפֵךְ דַּם הָאָדָם בָּאָדָם דָּמוֹ יִשָּׁפֵךְ״) ומילים שנאמרות פעמיים ברצף (״אַבְרָהָם אַבְרָהָם״)",
        icon: "⟲",
      },
      {
        href: "/prayers-songs",
        title: "תפילות ושירות",
        description: "שירת הים, תפילת חנה, קינת דוד, תפילת יונה ועוד, וכל מזמורי תהלים לפי הכותרות שלהם, כל אחת במלואה",
        icon: "♪",
      },
      {
        href: "/parallels",
        title: "נוסחים מקבילים",
        description: "קטעים שהתנ״ך מספר פעמיים, זה לצד זה עם ההבדלים מסומנים: שמואל ודברי הימים, שירת דוד, עשרת הדיברות",
        icon: "⇄",
      },
      {
        href: "/version-notes",
        title: "חילופי נוסח",
        description: "דַּכָּא או דַּכָּה? המקומות שבהם ספרי ספרד, אשכנז ותימן וכתר ארם צובא כתובים אחרת",
        icon: "≠",
      },
    ],
  },
];
