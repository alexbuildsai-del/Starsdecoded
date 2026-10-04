/**
 * A pair's story (ADR-175): ADR-102's type-only words drawn at 1080 × 1920 in
 * the browser once the fonts have loaded. No request carries it, so nothing is
 * uploaded or hosted. Chapter 01 and the dashboard draw it from the same words
 * through `StoryPreview`; its look waits for its own session. The story is
 * shared; the report itself is given by the block's "Share with {B}", which only
 * the pair's sender gets (ADR-133, ADR-181).
 */
import { useEffect, useMemo, useState } from "react";
import type { SendState } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { StatusDots } from "@/components/StatusDots";
import { sharedWaiting } from "@/lib/pair-row";
import {
  SHARE_CARD, SHARE_LABELS, STORY_CAPTION, STORY_LINES, shareActions, shareCardText, shareLine, shareWith, storyFilename, storyLayout,
  wrapLines, type ShareAction, type ShareCardText,
} from "@/lib/share-card";
import { cn } from "@/lib/utils";
import type { Lens } from "@/types/chart";

export interface ShareCardProps {
  names: { a: string; b: string };
  lens: Lens;
  headline: string;
  strengths: string[];
  /** The other person, by first name: who the story is shared with. */
  recipient: string;
  /** Share with {B} for this report; null where the server does not offer it (reading 11). */
  send?: SendState | null;
  onSend?: () => void;
  /** Given only to the viewer who sent it. */
  onStopSharing?: () => Promise<unknown>;
}

const { width: W, height: H } = SHARE_CARD;
const MARGIN = 90;
const INNER = W - 2 * MARGIN;
const BULLET_INDENT = 40;

const DISPLAY = "'Newsreader', Georgia, serif";
const BODY = "'Inter', system-ui, sans-serif";
const LABEL = "'Space Grotesk', 'Inter', sans-serif";
const BRASS = "#D4B06A";
const HEADLINE_FONT = `italic 400 44px ${DISPLAY}`;
const STRENGTH_FONT = `400 30px ${BODY}`;

/** The story falls back to Georgia if it draws before the faces arrive, so it waits for them. */
async function loadFonts(): Promise<void> {
  if (typeof document === "undefined" || !("fonts" in document)) return;
  try {
    await Promise.all([
      document.fonts.load(`400 76px ${DISPLAY}`),
      document.fonts.load(HEADLINE_FONT),
      document.fonts.load(STRENGTH_FONT),
      document.fonts.load(`500 22px ${LABEL}`),
    ]);
    await document.fonts.ready;
  } catch {
    // A face that never arrives is drawn in its fallback.
  }
}

/** The A · Horizon mark (logo.md) at a size, drawn as the SVG source draws it. */
function drawMark(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  const u = size / 64;
  ctx.save();
  ctx.lineCap = "round";
  ctx.strokeStyle = "#5C6BC0";
  ctx.lineWidth = 2.6 * u;
  ctx.beginPath();
  ctx.arc(x + 32 * u, y + 32 * u, 24 * u, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 2.2 * u;
  ctx.beginPath();
  ctx.moveTo(x + 8 * u, y + 32 * u);
  ctx.lineTo(x + 56 * u, y + 32 * u);
  ctx.stroke();
  ctx.fillStyle = BRASS;
  ctx.beginPath();
  ctx.arc(x + 8 * u, y + 32 * u, 4.2 * u, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function spaced(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, spacing: number) {
  // ctx.letterSpacing is not everywhere yet; the label is short enough to place by glyph.
  let cursor = x;
  for (const ch of text) {
    ctx.fillText(ch, cursor, y);
    cursor += ctx.measureText(ch).width + spacing;
  }
}

/** A long first name steps the names down a size before either line breaks, so "and" never stands alone. */
function fitTitle(ctx: CanvasRenderingContext2D, names: readonly string[]): { font: string; lines: string[] } {
  const measure = (s: string) => ctx.measureText(s).width;
  let font = "";
  for (const size of [76, 68, 60, 52]) {
    font = `400 ${size}px ${DISPLAY}`;
    ctx.font = font;
    if (names.every((line) => measure(line) <= INNER)) return { font, lines: [...names] };
  }
  return { font, lines: wrapLines(names.join(" "), INNER, STORY_LINES.title, measure) };
}

async function drawStory(text: ShareCardText): Promise<Blob> {
  await loadFonts();
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No 2D canvas in this browser.");

  ctx.fillStyle = "#06080C";
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W * 0.5, H * 0.38, 60, W * 0.5, H * 0.38, 720);
  glow.addColorStop(0, "rgba(92,107,192,.26)");
  glow.addColorStop(1, "rgba(6,8,12,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "rgba(212,176,106,.28)";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(36, 36, W - 72, H - 72);

  const measure = (s: string) => ctx.measureText(s).width;
  const title = fitTitle(ctx, text.titleLines);
  ctx.font = HEADLINE_FONT;
  const headline = wrapLines(text.headline, INNER, STORY_LINES.headline, measure);
  ctx.font = STRENGTH_FONT;
  const strengths = text.strengths.map((s) => wrapLines(s, INNER - BULLET_INDENT, STORY_LINES.strength, measure));
  const at = storyLayout({ title: title.lines.length, headline: headline.length, strengths: strengths.map((s) => s.length) });

  ctx.fillStyle = BRASS;
  ctx.font = `500 22px ${LABEL}`;
  spaced(ctx, text.eyebrow.toUpperCase(), MARGIN, at.eyebrow, 6);

  ctx.fillStyle = "#F2F4F9";
  ctx.font = title.font;
  title.lines.forEach((line, i) => ctx.fillText(line, MARGIN, at.title[i]));

  ctx.fillStyle = "#E8EBF2";
  ctx.font = HEADLINE_FONT;
  headline.forEach((line, i) => ctx.fillText(line, MARGIN, at.headline[i]));

  if (at.rule !== null && at.label !== null) {
    ctx.strokeStyle = "rgba(212,176,106,.45)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(MARGIN, at.rule);
    ctx.lineTo(W - MARGIN, at.rule);
    ctx.stroke();

    ctx.fillStyle = BRASS;
    ctx.font = `500 20px ${LABEL}`;
    spaced(ctx, text.strengthsLabel.toUpperCase(), MARGIN, at.label, 5);

    ctx.font = STRENGTH_FONT;
    strengths.forEach((lines, i) => {
      const ys = at.strengths[i];
      ctx.strokeStyle = BRASS;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(MARGIN + 9, ys[0] - 11, 7, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "#E8EBF2";
      lines.forEach((line, j) => ctx.fillText(line, MARGIN + BULLET_INDENT, ys[j]));
    });
  }

  ctx.fillStyle = "#8A93A6";
  ctx.font = `400 22px ${BODY}`;
  ctx.fillText(text.foot[0], MARGIN, at.foot[0]);
  ctx.fillText(text.foot[1], MARGIN, at.foot[1]);

  ctx.fillStyle = "#F2F4F9";
  ctx.font = `400 30px ${DISPLAY}`;
  const markSize = 40;
  const wordmarkX = W - MARGIN - ctx.measureText(text.wordmark).width;
  const wordmarkY = at.foot[1] - 6;
  ctx.fillText(text.wordmark, wordmarkX, wordmarkY);
  drawMark(ctx, wordmarkX - markSize - 14, wordmarkY - markSize * 0.72, markSize);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("The story did not encode.");
  return blob;
}

/** What the reader shares or saves: drawn on their device and named for the pair, so the app itself sends it nowhere. */
export async function storyFile(text: ShareCardText): Promise<File> {
  const blob = await drawStory(text);
  return new File([blob], storyFilename(text), { type: "image/png" });
}

function probeShareFiles(): boolean {
  if (typeof navigator === "undefined" || typeof navigator.share !== "function" || typeof navigator.canShare !== "function") return false;
  try {
    return navigator.canShare({ files: [new File([new Uint8Array(1)], "story.png", { type: "image/png" })] });
  } catch {
    return false;
  }
}

function probeCopyImage(): boolean {
  return typeof ClipboardItem !== "undefined" && typeof navigator !== "undefined" && typeof navigator.clipboard?.write === "function";
}

/** Chapter 01 and the dashboard show a story through this one preview, so it looks and acts the same in both. */
export function StoryPreview({ text }: { text: ShareCardText }) {
  // Callers may build the words afresh on every render; the story is redrawn only when they change.
  const words = JSON.stringify(text);
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const actions = useMemo(() => shareActions({ canShareFiles: probeShareFiles(), canCopyImage: probeCopyImage() }), []);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;
    setFile(null);
    setUrl(null);
    setFailed(false);
    storyFile(JSON.parse(words) as ShareCardText)
      .then((made) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(made);
        setFile(made);
        setUrl(objectUrl);
      })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [words]);

  async function act(action: ShareAction) {
    if (!file || !url) return;
    setBusy(true);
    setNote(null);
    try {
      if (action === "save") {
        const a = document.createElement("a");
        a.href = url;
        a.download = file.name;
        a.click();
      } else if (action === "copy") {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": file })]);
        setNote("Copied.");
      } else {
        await navigator.share({ files: [file], title: text.title });
      }
    } catch (err) {
      // The reader closed the share sheet; anything else is said plainly.
      if (!(err instanceof DOMException && err.name === "AbortError")) setNote("That did not work here. Save the story instead.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div role="group" aria-label={`Story for ${text.title}`} className="rp-root grid w-fit justify-items-start bg-transparent" data-story>
      {url
        ? <img src={url} alt={[text.title, text.headline].filter(Boolean).join(". ")} width={W} height={H} className="block h-auto w-[132px] rounded-[10px] border border-[var(--line)]" />
        : <div aria-hidden className="aspect-[9/16] w-[132px] rounded-[10px] border border-[var(--line)] bg-[rgba(232,235,242,.04)]" />}
      <span className="mt-2 font-label text-[10px] uppercase tracking-[.12em] text-[var(--paper-dim)]">{STORY_CAPTION}</span>
      <div className="mt-2 flex gap-1.5">
        {actions.map((action, i) => (
          <Button key={action} variant={i === 0 ? "default" : "outline"} size="sm" disabled={busy || !file} onClick={() => act(action)} className="font-label text-xs">
            {SHARE_LABELS[action]}
          </Button>
        ))}
      </div>
      {/* Kept in the tree while empty so a screen reader hears what lands in it; it takes no room until then. */}
      <p role="status" className="mt-2 w-0 min-w-full text-xs leading-[1.5] text-[var(--paper-dim)] empty:mt-0">
        {failed ? "The story could not be drawn in this browser." : note}
      </p>
    </div>
  );
}

function PairSend({ send, onSend, onStopSharing }: { send: SendState; onSend: () => void; onStopSharing?: () => Promise<unknown> }) {
  const [stopping, setStopping] = useState(false);
  const [stopFailed, setStopFailed] = useState(false);
  const name = send.firstName;

  async function stop() {
    if (!onStopSharing) return;
    setStopping(true);
    setStopFailed(false);
    try {
      await onStopSharing();
    } catch {
      setStopFailed(true);
    } finally {
      setStopping(false);
    }
  }

  if (send.state === "sent") return <span className="font-label text-xs text-[var(--paper-dim)]">{sharedWaiting(name)}</span>;
  if (send.state === "joined") {
    return (
      <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="font-label text-xs text-[var(--paper-dim)]">{name} can read it</span>
        {/* MB-103 provisional: its sender ends the other person's reading at once, and nothing is deleted (ADR-139). */}
        {onStopSharing && (
          <Button
            variant="ghost"
            size="sm"
            disabled={stopping}
            onClick={stop}
            aria-label={`Stop sharing with ${name}`}
            className="font-label text-xs text-[var(--paper-dim)] hover:text-[var(--paper)]"
          >
            {stopping ? <StatusDots label="Stopping" /> : "Stop sharing"}
          </Button>
        )}
        {stopFailed && <span className="text-xs text-[var(--paper-dim)]">Sharing did not stop. Try again in a minute.</span>}
      </span>
    );
  }
  return (
    <Button variant="outline" size="sm" onClick={onSend} className="font-label text-xs">
      {shareWith(name)}
    </Button>
  );
}

/**
 * Chapter 01's block. On a phone the line comes before the story it asks the
 * reader to share, and the report's own button after both; on a wide screen the
 * story stands beside the words.
 */
export function ShareCard(props: ShareCardProps) {
  const { names, lens, headline, strengths, recipient, send, onSend, onStopSharing } = props;
  const text = shareCardText({ names, lens, headline, strengths });
  const offer = send && onSend ? <PairSend send={send} onSend={onSend} onStopSharing={onStopSharing} /> : null;

  return (
    <div
      className="no-print mt-10 grid gap-5 rounded-[14px] border border-[var(--line)] bg-[rgba(17,22,31,.72)] p-5 min-[760px]:grid-cols-[auto_minmax(0,1fr)] min-[760px]:gap-x-8 min-[760px]:gap-y-4"
      data-share-card
    >
      <div className={cn("min-w-0 min-[760px]:col-start-2 min-[760px]:row-start-1", offer ? "min-[760px]:self-end" : "min-[760px]:row-span-2 min-[760px]:self-center")}>
        <span className="rp-lab">At the end of chapter 01</span>
        <p className="mt-2 font-display text-[22px] leading-[1.25] text-[var(--paper)]">{shareLine(recipient)}</p>
        <p className="mt-2 text-[14px] leading-[1.6] text-[var(--paper-dim)]">The story shows a short summary and your three strengths. It shows nothing from either birth chart. Nothing is uploaded.</p>
      </div>
      <div className="min-[760px]:col-start-1 min-[760px]:row-span-2 min-[760px]:row-start-1">
        <StoryPreview text={text} />
      </div>
      {offer && <div className="min-w-0 min-[760px]:col-start-2 min-[760px]:row-start-2 min-[760px]:self-start">{offer}</div>}
    </div>
  );
}

export default ShareCard;
