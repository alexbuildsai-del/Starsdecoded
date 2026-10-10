// Mirror of tokens.css; `pnpm check:ds` fails when the two differ. Written for SVG, emails and the share image, which cannot read CSS.
export const tokens = {
  color: {
    void: "#06080c",
    ground: "#0d1117",
    surface: "#11161f",
    "surface-glass": "rgba(17,22,31,.6)",
    raised: "#171d29",
    line: "#242c3b",
    "line-soft": "#1a202c",
    "line-strong": "#3a4560",
    "control-edge": "#5a6684",
    paper: "#e8ebf2",
    "paper-dim": "#aeb6c6",
    muted: "#7e889a",
    "label-dim": "#767f92",
    indigo: "#5c6bc0",
    "indigo-hover": "#6b79cb",
    "on-indigo": "#ffffff",
    "indigo-lt": "#9fa8da",
    "indigo-tint": "rgba(92,107,192,.14)",
    focus: "#aeb8f0",
    violet: "#9575cd",
    brass: "#d4b06a",
    "brass-dim": "#8a7343",
    teal: "#3fa796",
    rose: "#d9668a",
    back: "#e24d4d",
    "line-easy": "#3bb3db",
    "line-tense": "#e24d4d",
    "back-edge": "#6b3a42",
    error: "#e79ab2",
    "chapter-1": "#5c6bc0",
    "chapter-2": "#3f8fd2",
    "chapter-3": "#9575cd",
    "chapter-4": "#3fa796",
    "chapter-5": "#d9668a",
    "chapter-6": "#b565a7",
    "element-fire": "#e0845c",
    "element-earth": "#7fb08b",
    "element-air": "#8fc5e0",
    "element-water": "#6b7fd7"
  },
  fontFamily: {
    display: "'Newsreader', Georgia, 'Times New Roman', serif",
    body: "'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif",
    label: "'Space Grotesk', ui-sans-serif, system-ui, sans-serif",
    mono: "'IBM Plex Mono', ui-monospace, Menlo, monospace"
  },
  type: {
    hero: {
      family: "display",
      fontSize: "40px",
      lineHeight: "1.02",
      fontWeight: "400",
      letterSpacing: "-0.028em"
    },
    section: {
      family: "display",
      fontSize: "34px",
      lineHeight: "1.06",
      fontWeight: "400",
      letterSpacing: "-0.025em"
    },
    "page-title": {
      family: "display",
      fontSize: "30px",
      lineHeight: "1.15",
      fontWeight: "400",
      letterSpacing: "-0.01em"
    },
    "sheet-title": {
      family: "display",
      fontSize: "24px",
      lineHeight: "1.15",
      fontWeight: "400",
      letterSpacing: "-0.01em"
    },
    "card-title": {
      family: "display",
      fontSize: "20px",
      lineHeight: "1.25",
      fontWeight: "400",
      letterSpacing: "-0.01em"
    },
    "card-title-sm": {
      family: "display",
      fontSize: "17px",
      lineHeight: "1.3",
      fontWeight: "400",
      letterSpacing: "-0.005em"
    },
    lede: {
      family: "display",
      fontSize: "18px",
      lineHeight: "1.5",
      fontWeight: "400",
      letterSpacing: "0"
    },
    prose: {
      family: "body",
      fontSize: "15px",
      lineHeight: "1.74",
      fontWeight: "400",
      letterSpacing: "0"
    },
    ui: {
      family: "body",
      fontSize: "14px",
      lineHeight: "1.5",
      fontWeight: "400",
      letterSpacing: "0"
    },
    small: {
      family: "body",
      fontSize: "13.5px",
      lineHeight: "1.5",
      fontWeight: "400",
      letterSpacing: "0"
    },
    caption: {
      family: "body",
      fontSize: "12px",
      lineHeight: "1.5",
      fontWeight: "400",
      letterSpacing: "0"
    },
    button: {
      family: "body",
      fontSize: "15px",
      lineHeight: "1",
      fontWeight: "500",
      letterSpacing: "0"
    },
    "button-compact": {
      family: "body",
      fontSize: "13.5px",
      lineHeight: "1",
      fontWeight: "500",
      letterSpacing: "0"
    },
    kicker: {
      family: "label",
      fontSize: "11px",
      lineHeight: "1.2",
      fontWeight: "500",
      letterSpacing: "0.24em"
    },
    label: {
      family: "label",
      fontSize: "11px",
      lineHeight: "1.4",
      fontWeight: "500",
      letterSpacing: "0.16em"
    },
    data: {
      family: "mono",
      fontSize: "12px",
      lineHeight: "1.4",
      fontWeight: "400",
      letterSpacing: "0"
    },
    "data-sm": {
      family: "mono",
      fontSize: "11px",
      lineHeight: "1.4",
      fontWeight: "400",
      letterSpacing: "0.14em"
    },
    stat: {
      family: "mono",
      fontSize: "28px",
      lineHeight: "1",
      fontWeight: "400",
      letterSpacing: "0"
    }
  },
  radius: {
    inner: "6px",
    control: "8px",
    card: "14px",
    sheet: "20px",
    pill: "999px"
  },
  spacing: {
    "1": "4px",
    "2": "8px",
    "3": "12px",
    "4": "16px",
    "5": "20px",
    "6": "24px",
    "8": "32px",
    "12": "48px",
    "20": "80px"
  },
  motion: {
    ease: "cubic-bezier(.16, 1, .3, 1)",
    durFast: "150ms",
    durBase: "300ms",
    durSlow: "600ms"
  },
  scrim: "rgba(6, 8, 12, .72)",
  shadow: {
    card: "none",
    raised: "0 12px 30px rgba(0,0,0,.55), 0 4px 8px -1px rgba(0,0,0,.35)"
  }
} as const;

export type Tokens = typeof tokens;
export type ColorName = keyof Tokens["color"];

export interface RolePair {
  fg: ColorName;
  bg: ColorName;
  kind: "text" | "edge";
}

// Every pairing the Colours card allows; text needs 4.5:1, an edge 3:1.
export const ROLE_PAIRS: RolePair[] = [
  { fg: "paper", bg: "ground", kind: "text" },
  { fg: "paper", bg: "surface", kind: "text" },
  { fg: "paper-dim", bg: "ground", kind: "text" },
  { fg: "paper-dim", bg: "surface", kind: "text" },
  { fg: "paper-dim", bg: "raised", kind: "text" },
  { fg: "muted", bg: "ground", kind: "text" },
  { fg: "muted", bg: "surface", kind: "text" },
  { fg: "muted", bg: "raised", kind: "text" },
  { fg: "label-dim", bg: "ground", kind: "text" },
  { fg: "label-dim", bg: "surface", kind: "text" },
  { fg: "on-indigo", bg: "indigo", kind: "text" },
  { fg: "indigo-lt", bg: "ground", kind: "text" },
  { fg: "indigo-lt", bg: "surface", kind: "text" },
  { fg: "indigo-lt", bg: "raised", kind: "text" },
  { fg: "brass", bg: "ground", kind: "text" },
  { fg: "brass", bg: "surface", kind: "text" },
  { fg: "teal", bg: "ground", kind: "text" },
  { fg: "teal", bg: "surface", kind: "text" },
  { fg: "rose", bg: "ground", kind: "text" },
  { fg: "rose", bg: "surface", kind: "text" },
  { fg: "back", bg: "ground", kind: "text" },
  { fg: "back", bg: "surface", kind: "text" },
  { fg: "error", bg: "ground", kind: "text" },
  { fg: "error", bg: "surface", kind: "text" },
  { fg: "error", bg: "raised", kind: "text" },
  { fg: "violet", bg: "ground", kind: "text" },
  { fg: "violet", bg: "surface", kind: "text" },
  { fg: "line-easy", bg: "ground", kind: "text" },
  { fg: "line-easy", bg: "surface", kind: "text" },
  { fg: "control-edge", bg: "ground", kind: "edge" },
  { fg: "control-edge", bg: "surface", kind: "edge" },
  { fg: "indigo", bg: "ground", kind: "edge" },
  { fg: "indigo", bg: "surface", kind: "edge" },
  { fg: "focus", bg: "ground", kind: "edge" },
  { fg: "focus", bg: "surface", kind: "edge" },
];
