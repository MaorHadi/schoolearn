// Subject 1: Genesis (Hebrew, RTL). This is the ONLY place Bible-specific content lives.
// Placeholder lesson content exercises every block type; real content and questions come later.
import type { LessonContent } from "../../app/schemas/content-blocks";
import type { SeedLesson, SeedSubject } from "./types";

function chapterLesson(title: string, sortOrder: number): SeedLesson {
  return {
    title,
    sortOrder,
    content: (assetId: number): LessonContent => [
      { id: `${sortOrder}-heading`, type: "heading", level: 1, text: title },
      {
        id: `${sortOrder}-intro`,
        type: "paragraph",
        content: [
          { text: "זהו תוכן ", marks: [] },
          { text: "זמני", marks: ["bold"] },
          { text: " לשיעור. הפסקה כוללת ", marks: [] },
          { text: "הדגשה", marks: ["highlight"] },
          { text: " וגם ", marks: [] },
          { text: "טקסט נטוי", marks: ["italic"] },
          { text: ".", marks: [] },
        ],
      },
      {
        id: `${sortOrder}-quote`,
        type: "quote",
        sourceLabel: "פסוק",
        reference: `${title}, א`,
        text: "טקסט ציטוט זמני להדגמה של בלוק ציטוט עם הדגשה.",
        highlights: [{ start: 0, end: 10 }],
      },
      {
        id: `${sortOrder}-image`,
        type: "image",
        assetId,
        alt: "תמונת מקום לשיעור",
        caption: "כיתוב לדוגמה",
      },
      {
        id: `${sortOrder}-list`,
        type: "list",
        ordered: true,
        items: [[{ text: "נקודה ראשונה", marks: [] }], [{ text: "נקודה שנייה", marks: ["bold"] }]],
      },
    ],
  };
}

/** sortOrder is 1-based within each section. */
function chapters(...titles: string[]): SeedLesson[] {
  return titles.map((title, index) => chapterLesson(title, index + 1));
}

export const genesis: SeedSubject = {
  slug: "genesis",
  name: 'תנ"ך – בראשית',
  description: "פרקי ספר בראשית לבחינה.",
  locale: "he",
  direction: "rtl",
  sortOrder: 1,
  sections: [
    {
      title: "אברהם: הבטחה ומסע",
      sortOrder: 1,
      lessons: chapters("פרק יב", "פרק יג", "פרק טו", "פרק טז"),
    },
    {
      title: "אברהם: ברית ונסיון",
      sortOrder: 2,
      lessons: chapters("פרק יח", "פרק כא", "פרק כב", "פרק כג"),
    },
    { title: "יצחק ויעקב", sortOrder: 3, lessons: chapters("פרק כד", "פרק כה", "פרק כז") },
    { title: "יעקב בחרן", sortOrder: 4, lessons: chapters("פרק כח", "פרק כט") },
  ],
};
