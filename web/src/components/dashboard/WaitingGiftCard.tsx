/**
 * A waiting gift, opened from its teal point on the orbit: when it went, the
 * date its held credit comes back, Send a reminder, Change address and Take it
 * back. Dates only, never a countdown (ADR-127). A new address revokes the old
 * link and sends a new one, and the gift keeps its held credit and its date
 * (ADR-237). Like the person's card it is content only: the panel on desktop
 * and the bottom sheet on a phone own its frame.
 */
import { useId, useRef, useState, type FormEvent } from "react";
import { Check, Copy } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetCreditHistoryQueryKey,
  getGetCreditsQueryKey,
  getListGiftsQueryKey,
  useChangeGiftAddress,
  useRemindGift,
  useTakeBackGift,
  type Gift,
  type GiftCreated,
} from "@workspace/api-client-react";
import { Button } from "@/ds/atoms/Button";
import { FIELD_LABEL, Input } from "@/ds/atoms/Input";
import { TextButton } from "@/ds/atoms/TextButton";
import { InlineError } from "@/ds/molecules/Alert";
import { StatusDots } from "@/ds/atoms/StatusDots";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useToast } from "@/hooks/use-toast";
import { refusalLine } from "@/lib/refusals";
import { cn } from "@/lib/utils";

export interface WaitingGiftCardProps {
  gift: Gift;
  /** After Take it back, so the page can close the card; the orbit drops the point once the gifts refetch. */
  onTakenBack?: () => void;
  className?: string;
}

const TEAL = "var(--color-teal)";
// POST /gifts/{id}/remind answers 429 sooner than this after the last reminder.
const DAY_MS = 24 * 60 * 60 * 1000;

const DETAIL = "text-small text-paper-dim";
const PENDING =
  "inline-flex h-9 items-center rounded-control border border-indigo/35 bg-indigo-tint px-3 font-label text-caption text-indigo-lt";
const QUESTION = "text-small text-paper";
const EMAIL = /.+@.+\..+/;

type Step = "actions" | "take_back" | "address";

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

/** The API's own line says why an address was refused, or that the gift was claimed or came back, which the card cannot tell apart. */
function changeLine(error: { status: number; data: { message?: string } | null } | null): string {
  const refusal = refusalLine(error);
  if (refusal) return refusal;
  const told = error?.data?.message;
  if (error?.status === 400) return told || "That email address did not work. Check it and try again.";
  if (error?.status === 404 || error?.status === 409) return told || "This gift isn't waiting any more.";
  return "We couldn't change the address. Try again in a few minutes.";
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
        <p className="mb-1.5 font-label text-kicker uppercase text-teal">
          {eyebrow}
        </p>
        <h2 className="font-display text-sheet-title text-paper [overflow-wrap:anywhere]">{name}</h2>
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
  const emailId = useId();
  const [step, setStep] = useState<Step>("actions");
  const [remindedNow, setRemindedNow] = useState(false);
  const [address, setAddress] = useState("");
  // The new link, when its email didn't go, so the giver can pass it on by hand.
  const [unsent, setUnsent] = useState<GiftCreated | null>(null);
  const [copied, setCopied] = useState(false);
  const linkRef = useRef<HTMLInputElement>(null);
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
  const changeAddress = useChangeGiftAddress({
    mutation: {
      onSuccess: (moved) => {
        qc.invalidateQueries({ queryKey: getListGiftsQueryKey() });
        setAddress("");
        setStep("actions");
        if (moved.emailDelivered) toast({ title: `We emailed ${name} at ${moved.email}` });
        else setUnsent(moved);
      },
      onError: (err) => {
        // 404 or 409: claimed or come back meanwhile, so the refetch redraws the card in its new state.
        if (err.status === 404 || err.status === 409) qc.invalidateQueries({ queryKey: getListGiftsQueryKey() });
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
  const changeError = changeAddress.isError ? changeLine(changeAddress.error) : null;
  const addressReady = EMAIL.test(address.trim());

  const sendTo = (event: FormEvent) => {
    event.preventDefault();
    if (!addressReady || changeAddress.isPending) return;
    changeAddress.mutate({ id: gift.id, data: { email: address.trim() } });
  };

  async function copyLink(link: string) {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      // Without clipboard access the link is left selected, so the giver can copy it by hand.
      linkRef.current?.select();
    }
  }

  return (
    <article aria-label={`Gift for ${name}, waiting`} className={frame}>
      <CardHead eyebrow="Gift · waiting" name={name} waiting still={still} />
      <div className="grid gap-1.5">
        <p className={DETAIL}>
          Sent to <span className="text-paper [overflow-wrap:anywhere]">{gift.email}</span>{" "}
          {dayText(gift.sentAt, now)}.
        </p>
        <p className={DETAIL}>
          {gift.creditHeld
            ? `One credit is held until ${dateText(gift.returnsAt)}. If ${name} doesn't claim it by then, it comes back to you.`
            : `${name} can claim it until ${dateText(gift.returnsAt)}.`}
        </p>
        {last && !recent && <p className={DETAIL}>Last reminder {dayText(last, now)}.</p>}
      </div>

      {unsent && (
        <div className="grid gap-2.5 border-t border-line pt-3.5">
          <p className={DETAIL}>
            {`The email didn't go through. Copy this link and send it to ${name} yourself. They sign in with ${unsent.email} to claim it.`}
          </p>
          <div className="flex gap-2">
            <Input
              ref={linkRef}
              readOnly
              value={unsent.claimUrl}
              aria-label={`The link for ${name}`}
              onFocus={(e) => e.currentTarget.select()}
            />
            <Button variant="secondary" onClick={() => copyLink(unsent.claimUrl)} className="h-12 shrink-0">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied" : "Copy link"}
            </Button>
          </div>
        </div>
      )}

      {step === "address" ? (
        <form noValidate onSubmit={sendTo} aria-labelledby={questionId} className="grid gap-3 border-t border-line pt-3.5">
          <p id={questionId} className={QUESTION}>
            {"Enter the right address and we'll send a new link. The old one stops working. "}
            {gift.creditHeld
              ? `Your credit stays held until ${dateText(gift.returnsAt)}.`
              : `${name} can still claim it until ${dateText(gift.returnsAt)}.`}
          </p>
          <div className="grid gap-1.5">
            <label htmlFor={emailId} className={FIELD_LABEL}>
              Their email
            </label>
            <Input
              id={emailId}
              type="email"
              autoComplete="off"
              autoFocus
              value={address}
              onChange={(e) => {
                setAddress(e.target.value);
                if (changeAddress.isError) changeAddress.reset();
              }}
              aria-invalid={changeAddress.error?.status === 400 || undefined}
              aria-describedby={changeError ? `${emailId}-error` : undefined}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {changeAddress.isPending ? (
              <span className={PENDING}>
                <StatusDots label="Sending" />
              </span>
            ) : (
              <Button type="submit" size="compact" variant="secondary" disabled={!addressReady}>
                Send new link
              </Button>
            )}
            <TextButton disabled={changeAddress.isPending} onClick={() => setStep("actions")}>
              Cancel
            </TextButton>
          </div>
          {changeError && <InlineError id={`${emailId}-error`}>{changeError}</InlineError>}
        </form>
      ) : step === "take_back" ? (
        <div role="group" aria-labelledby={questionId} className="grid gap-3 border-t border-line pt-3.5">
          <p id={questionId} className={QUESTION}>
            Take back your gift to {name}? The link in the email stops working
            {gift.creditHeld ? ", and the credit comes back to you." : "."}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {takeBack.isPending ? (
              <span className={PENDING}>
                <StatusDots label="Taking it back" />
              </span>
            ) : (
              <Button size="compact" variant="danger" onClick={() => takeBack.mutate({ id: gift.id })}>
                Take it back
              </Button>
            )}
            <Button size="compact" variant="secondary" autoFocus disabled={takeBack.isPending} onClick={() => setStep("actions")}>
              Keep it
            </Button>
          </div>
          {takeBackError && <InlineError>{takeBackError}</InlineError>}
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
                className="inline-flex h-9 items-center gap-1.5 rounded-control border border-teal/40 px-3 font-label text-caption text-teal"
              >
                <Check aria-hidden="true" className="h-3.5 w-3.5" />
                Reminder sent {remindedNow || !last ? "today" : dayText(last, now)}
              </span>
            ) : (
              <Button size="compact" variant="secondary" onClick={() => remind.mutate({ id: gift.id })}>
                Send a reminder
              </Button>
            )}
            <Button
              size="compact"
              variant="secondary"
              onClick={() => {
                changeAddress.reset();
                setUnsent(null);
                setCopied(false);
                setStep("address");
              }}
            >
              Change address
            </Button>
            <Button
              size="compact"
              variant="secondary"
              onClick={() => {
                takeBack.reset();
                setStep("take_back");
              }}
            >
              Take it back
            </Button>
          </div>
          {recent && !remind.isPending && <p className="text-caption text-muted">You can send one a day.</p>}
          {remindError && <InlineError>{remindError}</InlineError>}
        </div>
      )}
    </article>
  );
}

export default WaitingGiftCard;
