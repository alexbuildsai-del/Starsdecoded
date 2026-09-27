/**
 * A waiting gift, opened from its teal point on the orbit: when it went, the
 * date its held credit comes back, Send a reminder and Take it back. Dates
 * only, never a countdown (ADR-127). Like the person's card it is content
 * only: the panel on desktop and the bottom sheet on a phone own its frame.
 */
import { useId, useState } from "react";
import { Check } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetCreditHistoryQueryKey,
  getGetCreditsQueryKey,
  getListGiftsQueryKey,
  useRemindGift,
  useTakeBackGift,
  type Gift,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { StatusDots } from "@/components/StatusDots";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export interface WaitingGiftCardProps {
  gift: Gift;
  /** After Take it back, so the page can close the card; the orbit drops the point once the gifts refetch. */
  onTakenBack?: () => void;
  className?: string;
}

const TEAL = "#3FA796";
// POST /gifts/{id}/remind answers 429 sooner than this after the last reminder.
const DAY_MS = 24 * 60 * 60 * 1000;

const DETAIL = "text-[13px] leading-[1.45] text-[var(--paper-dim)]";
const SMALL = "min-h-[30px] px-[11px] font-label text-xs";
const PENDING =
  "inline-flex min-h-[30px] items-center rounded-md border border-[rgba(92,107,192,.35)] bg-[rgba(92,107,192,.14)] px-[11px] font-label text-xs text-[var(--indigo-lt)]";

function dateText(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("en-GB", { day: "numeric", month: "long" });
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** "today", "yesterday" or "on 24 September": a day, never a count of hours left. */
function dayText(iso: string, now: Date): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return `on ${iso}`;
  if (sameDay(d, now)) return "today";
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  return sameDay(d, yesterday) ? "yesterday" : `on ${dateText(iso)}`;
}

/** The orbit's waiting-gift mark, its dashes turning while the gift waits; reduced motion holds it still (credit-loop acceptance 8). */
function GiftRing({ still }: { still: boolean }) {
  return (
    <svg viewBox="0 0 48 48" className="h-12 w-12 shrink-0" aria-hidden="true">
      <circle cx="24" cy="24" r="21" fill="none" stroke={TEAL} strokeWidth="1.6" strokeDasharray="2 3">
        {!still && <animate attributeName="stroke-dashoffset" from="0" to="-60" dur="10s" repeatCount="indefinite" />}
      </circle>
      <g transform="translate(17 19)" fill="none" stroke={TEAL} strokeWidth="1.4" strokeLinejoin="round">
        <rect width="14" height="10" rx="1.5" />
        <path d="M0 1 L7 6 L14 1" />
      </g>
    </svg>
  );
}

function CardHead({ eyebrow, name, waiting, still }: { eyebrow: string; name: string; waiting: boolean; still: boolean }) {
  return (
    <header className="flex min-w-0 items-center gap-3.5">
      {waiting && <GiftRing still={still} />}
      <div className="min-w-0">
        <p className="mb-1.5 font-label text-[10.5px] font-medium uppercase leading-[1.2] tracking-[0.24em] text-[#3FA796]">
          {eyebrow}
        </p>
        <h2 className="font-display text-2xl leading-[1.1] tracking-[-0.02em] [overflow-wrap:anywhere]">{name}</h2>
      </div>
    </header>
  );
}

// Key it by the gift it opens for, so each open rises afresh and no confirmation carries over.
export function WaitingGiftCard({ gift, onTakenBack, className }: WaitingGiftCardProps) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const still = useReducedMotion();
  const questionId = useId();
  const [confirming, setConfirming] = useState(false);
  const [remindedNow, setRemindedNow] = useState(false);
  const name = gift.recipientName;

  const remind = useRemindGift({
    mutation: {
      onSuccess: () => {
        setRemindedNow(true);
        qc.invalidateQueries({ queryKey: getListGiftsQueryKey() });
      },
      onError: (err) => {
        // 404: claimed or come back meanwhile, so the refetch redraws the card in its new state.
        if (err.status === 404) qc.invalidateQueries({ queryKey: getListGiftsQueryKey() });
      },
    },
  });
  const takeBack = useTakeBackGift({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListGiftsQueryKey() });
        qc.invalidateQueries({ queryKey: getGetCreditsQueryKey() });
        qc.invalidateQueries({ queryKey: getGetCreditHistoryQueryKey() });
        toast({ title: "Gift taken back", description: gift.creditHeld ? "Your credit is back in your balance." : undefined });
        onTakenBack?.();
      },
      onError: (err) => {
        // 409: claimed meanwhile, so the refetch turns this card to claimed.
        if (err.status === 409) qc.invalidateQueries({ queryKey: getListGiftsQueryKey() });
      },
    },
  });

  const frame = cn(
    "rp-root grid w-full min-w-0 gap-4 bg-transparent duration-500 ease-[var(--ease)] motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-[10px]",
    className,
  );

  if (gift.state !== "waiting") {
    // ADR-139: once claimed the giver sees that it was claimed, and nothing the recipient does with it.
    return (
      <article aria-label={`Gift for ${name}`} className={frame}>
        <CardHead eyebrow={gift.state === "claimed" ? "Gift · claimed" : "Gift · returned"} name={name} waiting={false} still />
        <p className={DETAIL}>
          {gift.state === "claimed" ? `${name} claimed it.` : "It wasn't claimed, and its link no longer works."}
        </p>
      </article>
    );
  }

  const now = new Date();
  const last = gift.remindedAt;
  const recent = remindedNow || (last !== null && now.getTime() - Date.parse(last) < DAY_MS);
  const remindStatus = remind.error?.status;
  // 502 is the reminder email failing; the server keeps the link the recipient already has, so a retry is safe.
  const remindError = !remind.isError
    ? null
    : remindStatus === 429
      ? "You sent a reminder in the last day. You can send one a day."
      : remindStatus === 404
        ? "This gift isn't waiting any more."
        : remindStatus === 502
          ? "We couldn't send the reminder email. Try again in a few minutes."
          : "We couldn't send the reminder. Try again in a few minutes.";
  const takeBackError = !takeBack.isError
    ? null
    : takeBack.error?.status === 409
      ? `${name} has already claimed it, so it can't be taken back.`
      : "We couldn't take the gift back. Try again in a few minutes.";

  return (
    <article aria-label={`Gift for ${name}, waiting`} className={frame}>
      <CardHead eyebrow="Gift · waiting" name={name} waiting still={still} />
      <div className="grid gap-1.5">
        <p className={DETAIL}>
          Sent to <span className="text-[var(--paper)] [overflow-wrap:anywhere]">{gift.email}</span>{" "}
          {dayText(gift.sentAt, now)}.
        </p>
        <p className={DETAIL}>
          {gift.creditHeld
            ? `One credit is held until ${dateText(gift.returnsAt)}. If ${name} doesn't claim it by then, it comes back to you.`
            : `${name} can claim it until ${dateText(gift.returnsAt)}.`}
        </p>
        {last && !recent && <p className={DETAIL}>Last reminder {dayText(last, now)}.</p>}
      </div>

      {confirming ? (
        <div role="group" aria-labelledby={questionId} className="grid gap-3 border-t border-[var(--line)] pt-3.5">
          <p id={questionId} className="text-[13.5px] leading-[1.45] text-[var(--paper)]">
            Take back your gift to {name}? The link in the email stops working
            {gift.creditHeld ? ", and the credit comes back to you." : "."}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {takeBack.isPending ? (
              <span className={PENDING}>
                <StatusDots label="Taking it back" />
              </span>
            ) : (
              <Button size="sm" variant="outline" className={SMALL} onClick={() => takeBack.mutate({ id: gift.id })}>
                Take it back
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              autoFocus
              className={SMALL}
              disabled={takeBack.isPending}
              onClick={() => setConfirming(false)}
            >
              Keep it
            </Button>
          </div>
          {takeBackError && (
            <p role="alert" className="text-xs leading-[1.4] text-destructive">
              {takeBackError}
            </p>
          )}
        </div>
      ) : (
        <div className="grid gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {remind.isPending ? (
              <span className={PENDING}>
                <StatusDots label="Sending" />
              </span>
            ) : recent ? (
              <span
                role="status"
                className="inline-flex min-h-[30px] items-center gap-1.5 rounded-md border border-[rgba(127,176,139,.4)] px-[11px] font-label text-xs text-[#7FB08B]"
              >
                <Check aria-hidden="true" className="h-3.5 w-3.5" />
                Reminder sent {remindedNow || !last ? "today" : dayText(last, now)}
              </span>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className={cn(SMALL, "border-[rgba(92,107,192,.6)] text-[var(--indigo-lt)]")}
                onClick={() => remind.mutate({ id: gift.id })}
              >
                Send a reminder
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              className={SMALL}
              onClick={() => {
                takeBack.reset();
                setConfirming(true);
              }}
            >
              Take it back
            </Button>
          </div>
          {recent && !remind.isPending && <p className="text-xs leading-[1.4] text-muted-foreground">You can send one a day.</p>}
          {remindError && (
            <p role="alert" className="text-xs leading-[1.4] text-destructive">
              {remindError}
            </p>
          )}
        </div>
      )}
    </article>
  );
}

export default WaitingGiftCard;
