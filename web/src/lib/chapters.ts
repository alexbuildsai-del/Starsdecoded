/**
 * Ten chapters, in the locked order (ADR-46). The section each one waits for
 * is its own. The report page and the waitlist page both read them here, so a
 * chapter is named once.
 */
export const CHAPTERS = [
  { eyebrow: "Overview", title: "Chart Overview", section: "overview" },
  { eyebrow: "Chart", title: "Natal Chart Deepdive", section: "houses" },
  { eyebrow: "Mind", title: "Mind & Communication", section: "mind" },
  { eyebrow: "Work", title: "Career & Calling", section: "career" },
  { eyebrow: "Resources", title: "Money & Resources", section: "money" },
  { eyebrow: "Relationships", title: "Relationships & Intimacy", section: "relationships" },
  { eyebrow: "Roots", title: "Family & Roots", section: "family" },
  { eyebrow: "Self-Knowledge", title: "Superpowers, Chronic Patterns & Growing Edges", section: "superpowers" },
  { eyebrow: "Paradoxes", title: "Key Paradoxes & Discoveries", section: "discoveries" },
  { eyebrow: "Closing", title: "Closing", section: "focus" },
] as const;

export type ChapterSection = (typeof CHAPTERS)[number]["section"];
