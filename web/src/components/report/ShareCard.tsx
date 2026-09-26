/**
 * The share card at the end of chapter 01 (ADR-102): a portrait 1080 × 1350
 * canvas, type only. The eyebrow, the two first names and the verdict in
 * Newsreader, the three strengths in Inter, the foot line and the mark with
 * the wordmark; no wheel, no placement, no number. Drawn in the browser once
 * the fonts have loaded, shown on the page, and offered through Web Share
 * with the PNG where the browser can share files, else Copy image where
 * ClipboardItem exists, and Save image always. No request carries it:
 * nothing is uploaded and nothing is hosted.
 */
import { useEffect, useMemo, useState } from "react";
import { Copy, Download, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SHARE_CARD, shareActions, shareCardText, type ShareAction } from "@/lib/share-card";
import type { Lens } from "@/types/chart";

export interface ShareCardProps {
  names: { a: string; b: string };
  lens: Lens;
  headline: string;
  strengths: string[];
  /** The other person, by first name: who the card is sent to. */
  recipient: string;
}

const { width: W, height: H } = SHARE_CARD;
const MARGIN = 90;

const DISPLAY = "'Newsreader', Georgia, serif";
const BODY = "'Inter', system-ui, sans-serif";
const LABEL = "'Space Grotesk', 'Inter', sans-serif";

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && line) { lines.push(line); line = word; } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

/** The card falls back to Georgia if it draws before the faces arrive, so it waits for them. */
async function loadFonts(): Promise<void> {
  if (typeof document === "undefined" || !("fonts" in document)) return;
  try {
    await Promise.all([
      document.fonts.load(`400 76px ${DISPLAY}`),
      document.fonts.load(`italic 400 44px ${DISPLAY}`),
      document.fonts.load(`400 30px ${BODY}`),
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
  ctx.fillStyle = "#D4B06A";
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

export async function drawShareCard(props: ShareCardProps): Promise<Blob | null> {
  await loadFonts();
  const text = shareCardText(props);
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

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

  const inner = W - 2 * MARGIN;
  ctx.fillStyle = "#D4B06A";
  ctx.font = `500 22px ${LABEL}`;
  spaced(ctx, text.eyebrow.toUpperCase(), MARGIN, 150, 6);

  ctx.fillStyle = "#F2F4F9";
  ctx.font = `400 76px ${DISPLAY}`;
  let y = 250;
  for (const line of wrap(ctx, text.title, inner).slice(0, 2)) { ctx.fillText(line, MARGIN, y); y += 84; }

  y += 14;
  ctx.fillStyle = "#E8EBF2";
  ctx.font = `italic 400 44px ${DISPLAY}`;
  for (const line of wrap(ctx, text.headline, inner).slice(0, 5)) { ctx.fillText(line, MARGIN, y); y += 58; }

  y += 26;
  ctx.strokeStyle = "rgba(212,176,106,.45)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(MARGIN, y);
  ctx.lineTo(W - MARGIN, y);
  ctx.stroke();

  y += 58;
  ctx.fillStyle = "#D4B06A";
  ctx.font = `500 20px ${LABEL}`;
  spaced(ctx, text.strengthsLabel.toUpperCase(), MARGIN, y, 5);

  y += 56;
  ctx.font = `400 30px ${BODY}`;
  for (const line of text.strengths) {
    ctx.strokeStyle = "#D4B06A";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(MARGIN + 9, y - 11, 7, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#E8EBF2";
    for (const part of wrap(ctx, line, inner - 44).slice(0, 3)) { ctx.fillText(part, MARGIN + 40, y); y += 42; }
    y += 20;
  }

  ctx.fillStyle = "#8A93A6";
  ctx.font = `400 22px ${BODY}`;
  ctx.fillText(text.foot[0], MARGIN, H - 118);
  ctx.fillText(text.foot[1], MARGIN, H - 86);

  ctx.fillStyle = "#F2F4F9";
  ctx.font = `400 30px ${DISPLAY}`;
  const wordmarkWidth = ctx.measureText(text.wordmark).width;
  const markSize = 40;
  const wordmarkX = W - MARGIN - wordmarkWidth;
  ctx.fillText(text.wordmark, wordmarkX, H - 92);
  drawMark(ctx, wordmarkX - markSize - 14, H - 92 - markSize * 0.72, markSize);

  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/png"));
}

function probeShareFiles(): boolean {
  if (typeof navigator === "undefined" || typeof navigator.share !== "function" || typeof navigator.canShare !== "function") return false;
  try {
    return navigator.canShare({ files: [new File([new Uint8Array(1)], "card.png", { type: "image/png" })] });
  } catch {
    return false;
  }
}

function probeCopyImage(): boolean {
  return typeof ClipboardItem !== "undefined" && typeof navigator !== "undefined" && typeof navigator.clipboard?.write === "function";
}

const LABELS: Record<ShareAction, string> = { share: "Share the card", copy: "Copy image", save: "Save image" };
const ICONS: Record<ShareAction, typeof Share2> = { share: Share2, copy: Copy, save: Download };

export function ShareCard(props: ShareCardProps) {
  const [blob, setBlob] = useState<Blob | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const actions = useMemo(() => shareActions({ canShareFiles: probeShareFiles(), canCopyImage: probeCopyImage() }), []);
  const filename = `${props.names.a} and ${props.names.b} - Stars Decoded.png`.replace(/[^\w .-]+/g, "");
  const { names, lens, headline, strengths } = props;

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;
    drawShareCard({ names, lens, headline, strengths, recipient: props.recipient }).then((b) => {
      if (cancelled) return;
      if (!b) { setFailed(true); return; }
      objectUrl = URL.createObjectURL(b);
      setBlob(b);
      setUrl(objectUrl);
    }).catch(() => { if (!cancelled) setFailed(true); });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
    // The card is redrawn only when its words change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [names.a, names.b, lens, headline, strengths.join("\n")]);

  async function act(action: ShareAction) {
    if (!blob) return;
    setBusy(true);
    setNote(null);
    try {
      if (action === "save") {
        const a = document.createElement("a");
        a.href = url ?? URL.createObjectURL(blob);
        a.download = filename;
        a.click();
      } else if (action === "copy") {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        setNote("Copied.");
      } else {
        const file = new File([blob], filename, { type: "image/png" });
        await navigator.share({ files: [file], title: `${props.names.a} and ${props.names.b}` });
      }
    } catch (err) {
      // The reader closed the share sheet; anything else is said plainly.
      if (!(err instanceof DOMException && err.name === "AbortError")) setNote("That did not work here. Save the image instead.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="no-print mt-10 grid gap-6 rounded-[14px] border border-[var(--line)] bg-[rgba(17,22,31,.72)] p-5 min-[760px]:grid-cols-[minmax(170px,230px)_1fr] min-[760px]:items-center" data-share-card>
      <div className="mx-auto w-full max-w-[230px]">
        {url
          ? <img src={url} alt={`The share card: ${props.names.a} and ${props.names.b}, the verdict and your three strengths`} width={SHARE_CARD.width} height={SHARE_CARD.height} className="block h-auto w-full rounded-md border border-[var(--line-soft)]" />
          : <div className="aspect-[4/5] w-full rounded-md border border-[var(--line-soft)] bg-[rgba(232,235,242,.04)]" aria-hidden />}
      </div>
      <div className="min-w-0">
        <span className="rp-lab">At the end of chapter 01</span>
        <p className="mt-2 font-display text-[22px] leading-[1.25] text-[var(--paper)]">Send it to {props.recipient}.</p>
        <p className="mt-2 text-[14px] leading-[1.6] text-[var(--paper-dim)]">It shows the verdict and your three strengths. Nothing from either birth chart is on it, and nothing is uploaded.</p>
        <div className="mt-4 flex flex-wrap items-center gap-2" aria-label="Share card">
          {actions.map((action, i) => {
            const Icon = ICONS[action];
            return (
              <Button key={action} variant={i === 0 ? "default" : "outline"} size="sm" disabled={busy || !blob} onClick={() => act(action)} className="font-label text-xs gap-1.5">
                <Icon className="h-3.5 w-3.5" />
                {LABELS[action]}
              </Button>
            );
          })}
          {failed && <span className="text-xs text-[var(--paper-dim)]">The card could not be drawn in this browser.</span>}
          {note && <span className="text-xs text-[var(--paper-dim)]">{note}</span>}
        </div>
      </div>
    </div>
  );
}

export default ShareCard;
