/**
 * The share card on chapter 01 (ADR-71): the verdict headline and the
 * strengths card as one image, both names, the wheel behind, no placement
 * named. Drawn on a canvas in the browser from what the page already holds,
 * offered as a download and through Web Share where it exists; nothing is
 * uploaded and nothing is hosted.
 */
import { useState } from "react";
import { Download, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";

// MB-63 provisional: a client-side canvas, Download plus Web Share, nothing stored, until the Owner decides where a share lands.
export interface ShareCardProps {
  names: { a: string; b: string };
  headline: string;
  strengths: string[];
  /** The bi-wheel's svg, drawn faintly behind the words. */
  wheel: () => SVGSVGElement | null;
}

const W = 1200;
const H = 630;

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

async function svgImage(svg: SVGSVGElement): Promise<HTMLImageElement | null> {
  try {
    const clone = svg.cloneNode(true) as SVGSVGElement;
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    // The wheel reads its colours from CSS variables; the image has no stylesheet, so the tokens go with it.
    clone.style.setProperty("--sky", "#D4B06A");
    clone.style.setProperty("--sky-dim", "#8A7343");
    clone.style.setProperty("--paper", "#E8EBF2");
    clone.style.setProperty("--paper-dim", "#AEB6C6");
    const blob = new Blob([new XMLSerializer().serializeToString(clone)], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    await new Promise<void>((resolve, reject) => { img.onload = () => resolve(); img.onerror = () => reject(new Error("svg")); img.src = url; });
    URL.revokeObjectURL(url);
    return img;
  } catch {
    return null;
  }
}

export async function drawShareCard(props: ShareCardProps): Promise<Blob | null> {
  const canvas = document.createElement("canvas");
  const scale = 2;
  canvas.width = W * scale;
  canvas.height = H * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.scale(scale, scale);
  ctx.fillStyle = "#06080C";
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W * 0.72, H * 0.5, 40, W * 0.72, H * 0.5, 420);
  glow.addColorStop(0, "rgba(92,107,192,.28)");
  glow.addColorStop(1, "rgba(6,8,12,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  const svg = props.wheel();
  const img = svg ? await svgImage(svg) : null;
  if (img) {
    ctx.save();
    ctx.globalAlpha = 0.5;
    const size = 560;
    ctx.drawImage(img, W - size - 40, (H - size) / 2, size, size);
    ctx.restore();
  }

  ctx.fillStyle = "#D4B06A";
  ctx.font = "500 13px 'Space Grotesk', ui-monospace, monospace";
  ctx.fillText("STARS DECODED  ·  COMPATIBILITY REPORT", 64, 76);

  ctx.fillStyle = "#F2F4F9";
  ctx.font = "400 40px 'Newsreader', Georgia, serif";
  ctx.fillText(`${props.names.a} and ${props.names.b}`, 64, 134);

  ctx.fillStyle = "#E8EBF2";
  ctx.font = "400 30px 'Newsreader', Georgia, serif";
  let y = 196;
  for (const line of wrap(ctx, props.headline, 620).slice(0, 4)) { ctx.fillText(line, 64, y); y += 40; }

  y += 18;
  ctx.fillStyle = "#D4B06A";
  ctx.font = "500 12px 'Space Grotesk', ui-monospace, monospace";
  ctx.fillText("YOUR THREE STRENGTHS AS A PAIR", 64, y);
  y += 30;
  ctx.fillStyle = "#E8EBF2";
  ctx.font = "400 22px 'Newsreader', Georgia, serif";
  for (const line of props.strengths.slice(0, 3)) {
    for (const part of wrap(ctx, line, 600).slice(0, 2)) { ctx.fillText(`·  ${part}`, 64, y); y += 30; }
  }

  ctx.fillStyle = "#6E7789";
  ctx.font = "400 13px Inter, system-ui, sans-serif";
  ctx.fillText("Computed from two birth charts. No score, no prediction.", 64, H - 44);

  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/png"));
}

export function ShareCard(props: ShareCardProps) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function" && typeof navigator.canShare === "function";
  const filename = `${props.names.a} and ${props.names.b} - Stars Decoded.png`.replace(/[^\w .-]+/g, "");

  async function download() {
    setBusy(true);
    setNote(null);
    const blob = await drawShareCard(props);
    setBusy(false);
    if (!blob) { setNote("The card could not be drawn in this browser."); return; }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function share() {
    setBusy(true);
    setNote(null);
    const blob = await drawShareCard(props);
    setBusy(false);
    if (!blob) { setNote("The card could not be drawn in this browser."); return; }
    const file = new File([blob], filename, { type: "image/png" });
    if (!navigator.canShare?.({ files: [file] })) { setNote("Sharing an image is not available here; download it instead."); return; }
    try {
      await navigator.share({ files: [file], title: `${props.names.a} and ${props.names.b}` });
    } catch {
      // The reader closed the sheet; nothing to say.
    }
  }

  return (
    <div className="no-print mt-4 flex flex-wrap items-center gap-2" aria-label="Share card">
      <Button variant="outline" size="sm" disabled={busy} onClick={download} className="font-label text-xs gap-1.5">
        <Download className="h-3.5 w-3.5" />
        {busy ? "Drawing…" : "Download the card"}
      </Button>
      {canShare && (
        <Button variant="outline" size="sm" disabled={busy} onClick={share} className="font-label text-xs gap-1.5">
          <Share2 className="h-3.5 w-3.5" />
          Share
        </Button>
      )}
      <span className="text-xs text-[var(--paper-dim)]">One image: the verdict and your three strengths. Nothing is uploaded.</span>
      {note && <span className="text-xs text-[var(--paper-dim)]">{note}</span>}
    </div>
  );
}

export default ShareCard;
