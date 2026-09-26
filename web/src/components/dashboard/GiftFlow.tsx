/**
 * Gift a report in four steps: who it is for, a note for the cover, how it
 * arrives (the cover, then Send), and the credit held with the date it comes
 * back (ADR-123, ADR-128). A gift is a credit, not a report (ADR-139), so no
 * step promises the giver a look at what the recipient writes with it.
 */
import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useLocation } from "wouter";
import { useAuth, useUser } from "@clerk/react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetCreditHistoryQueryKey,
  getGetCreditsQueryKey,
  getListGiftsQueryKey,
  useCreateGift,
  useGetCredits,
  useListProfiles,
  type Gift,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { StatusDots } from "@/components/StatusDots";
import { GiftCover } from "@/components/dashboard/GiftCover";
import { useIsMobile } from "@/hooks/use-mobile";
import { creditsEnforced } from "@/lib/credits-view";
import { PRODUCT } from "@/lib/product";
import { cn } from "@/lib/utils";

export interface GiftFlowProps {
  open: boolean;
  onClose: () => void;
  /** The gift once it exists, so the page can show its point on the orbit. */
  onSent?: (gift: Gift) => void;
  /** Where credits are enforced and none are left, the flow offers Get credits through this. */
  onGetCredits?: () => void;
  /** The name on the cover; the viewer's own first name when left out, as the email prints it. */
  giverName?: string | null;
  /** `creditsEnforced()` when left out. */
  enforced?: boolean;
}

type Step = 1 | 2 | 3 | 4;
const STEPS = 4;

// CreateGiftBody.note's limit in the contract.
const NOTE_MAX = 280;
// ADR-123: an unclaimed gift holds its credit this long, then the credit comes back.
const HOLD_DAYS = 30;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const LABEL = "font-label text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground";
const FIELD = "h-10 aria-[invalid=true]:border-destructive";
const PRIMARY = "min-h-10 font-label text-[13.5px]";

function creditLine(available: number | undefined): string | null {
  if (available === undefined || available < 1) return null;
  return available === 1 ? "your 1 credit" : `1 of your ${available} credits`;
}

function firstWord(name: string | null | undefined): string | null {
  return name?.normalize("NFC").trim().split(/\s+/)[0] || null;
}

/** A date, never a countdown (ADR-127). */
function dateText(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("en-GB", { day: "numeric", month: "long" });
}

function Progress({ step }: { step: Step }) {
  return (
    <div className="flex items-center gap-3 pt-1">
      <div aria-hidden="true" className="flex flex-1 gap-1.5">
        {Array.from({ length: STEPS }, (_, i) => (
          <span
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors duration-300 ease-[cubic-bezier(.16,1,.3,1)]",
              i < step ? "bg-primary" : "bg-border",
            )}
          />
        ))}
      </div>
      <span className="font-numeric text-[11px] text-muted-foreground">
        <span className="sr-only">Step </span>
        {step} of {STEPS}
      </span>
    </div>
  );
}

/** The helper line under a field, which becomes its error once the step is tried, so the field's description stays one element. */
function Hint({ id, error, children }: { id: string; error: string | null; children: ReactNode }) {
  return (
    <p id={id} className={cn("text-xs leading-[1.4]", error ? "text-destructive" : "text-muted-foreground")}>
      {error ?? children}
    </p>
  );
}

function GiftSteps({ onClose, onSent, onGetCredits, giverName, enforced }: Omit<GiftFlowProps, "open">) {
  const qc = useQueryClient();
  const [location, navigate] = useLocation();
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const profiles = useListProfiles();
  const credits = useGetCredits();
  const available = credits.data?.available;
  const ids = useId();

  const [step, setStep] = useState<Step>(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [tried, setTried] = useState(false);
  const [gift, setGift] = useState<Gift | null>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  // On the hook, not the call, so the lists refresh even when the sheet is closed before the answer comes.
  const create = useCreateGift({
    mutation: {
      onSuccess: (created) => {
        qc.invalidateQueries({ queryKey: getListGiftsQueryKey() });
        qc.invalidateQueries({ queryKey: getGetCreditsQueryKey() });
        qc.invalidateQueries({ queryKey: getGetCreditHistoryQueryKey() });
        setGift(created);
        setStep(4);
        onSent?.(created);
      },
    },
  });

  // The cover and the sent line replace the form, so focus follows the new heading rather than staying on a button that left.
  useEffect(() => {
    if (step >= 3) titleRef.current?.focus();
  }, [step]);

  const firstName = name.trim();
  const address = email.trim();
  const words = note.trim();
  const nameError = tried && !firstName ? "Enter their first name." : null;
  const emailError = tried && !EMAIL.test(address) ? "Enter their email, like name@example.com." : null;

  // The server prints the giver's self profile's first word, else their account's first name; the preview does the same.
  const self = Array.isArray(profiles.data) ? profiles.data.find((p) => p.isSelf) : undefined;
  const giver = giverName !== undefined ? giverName : (firstWord(self?.name) ?? firstWord(user?.firstName));

  const status = create.error?.status;
  const signedOut = !gift && ((isLoaded && !isSignedIn) || status === 401);
  const zero = !gift && (enforced ?? creditsEnforced()) && available === 0;

  const eyebrow = step < 4 && creditLine(available) ? `Gift a report · ${creditLine(available)}` : "Gift a report";
  const header = (title: string, progress: boolean) => (
    <SheetHeader className="space-y-1.5 pr-8 text-left">
      <SheetDescription className="font-label text-[10.5px] font-medium uppercase leading-[1.2] tracking-[0.24em] text-[#9FA8DA]">
        {eyebrow}
      </SheetDescription>
      <SheetTitle
        ref={titleRef}
        tabIndex={-1}
        className="font-display text-2xl font-normal leading-[1.1] tracking-[-0.02em] focus:outline-none [overflow-wrap:anywhere]"
      >
        {title}
      </SheetTitle>
      {progress && <Progress step={step} />}
    </SheetHeader>
  );

  if (signedOut) {
    // Reading 8: a gift needs an account, since its credit is held from a balance and comes back to it.
    return (
      <>
        {header("Sign in to send a gift", false)}
        <p className="text-sm leading-[1.5] text-muted-foreground">A gift holds one of your credits, so it needs an account.</p>
        <Button
          size="lg"
          className={cn(PRIMARY, "w-full")}
          onClick={() => navigate(`/sign-in?return_to=${encodeURIComponent(location)}`)}
        >
          Sign in
        </Button>
      </>
    );
  }

  if (zero) {
    // MB-6 provisional: where credits are enforced (ADR-138), a gift waits for a
    // credit, and Get credits is the test checkout until real checkout exists.
    return (
      <>
        {header("No credits left", false)}
        <p className="text-sm leading-[1.5] text-muted-foreground">A gift uses one credit.</p>
        {onGetCredits && (
          <Button
            size="lg"
            className={cn(PRIMARY, "w-full")}
            onClick={() => {
              onClose();
              onGetCredits();
            }}
          >
            Get credits
          </Button>
        )}
      </>
    );
  }

  if (step === 4 && gift) {
    const back = dateText(gift.returnsAt);
    return (
      <>
        {header(`Gift sent to ${gift.recipientName}`, true)}
        <p className="text-[15px] leading-[1.5]">
          {gift.creditHeld
            ? `One of your credits is held until ${back}. If ${gift.recipientName} hasn't claimed it by then, it comes back to you.`
            : `${gift.recipientName} can claim it until ${back}.`}
        </p>
        <p className="text-[13px] leading-[1.45] text-muted-foreground">
          Open the gift on your orbit to send a reminder or take it back.
        </p>
        <Button size="lg" className={cn(PRIMARY, "w-full")} onClick={onClose}>
          Done
        </Button>
      </>
    );
  }

  if (step === 3) {
    // With no credit to hold (production's soft pass, MB-6), the line says only how long the link lasts.
    const holds = available === undefined || available > 0;
    const sendError =
      !create.isError || status === 401
        ? null
        : status === 400
          ? "Check their first name and email, then send it again."
          : "We couldn't send the gift. Try again in a few minutes.";
    return (
      <>
        {header("How it arrives", true)}
        <GiftCover giverName={giver} recipientName={firstName} note={words || null} />
        <p className="text-[13px] leading-[1.45] text-muted-foreground">
          It goes to <span className="text-foreground [overflow-wrap:anywhere]">{address}</span>, from {PRODUCT} in your
          name.
        </p>
        {sendError && (
          <p role="alert" className="text-[13px] leading-[1.45] text-destructive">
            {sendError}
          </p>
        )}
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            className="font-label"
            disabled={create.isPending}
            onClick={() => {
              create.reset();
              setStep(2);
            }}
          >
            Back
          </Button>
          {create.isPending ? (
            <div className="flex min-h-10 flex-1 items-center justify-center rounded-md border border-[rgba(92,107,192,.35)] bg-[rgba(92,107,192,.14)] px-4 font-label text-[13.5px] font-medium text-[#9FA8DA]">
              <StatusDots label="Sending" />
            </div>
          ) : (
            <Button
              type="button"
              size="lg"
              className={cn(PRIMARY, "flex-1")}
              onClick={() =>
                create.mutate({ data: { recipientName: firstName, email: address, ...(words ? { note: words } : {}) } })
              }
            >
              Send the gift
            </Button>
          )}
        </div>
        <p className="text-xs leading-[1.45] text-muted-foreground">
          {holds
            ? `One credit is held for ${HOLD_DAYS} days. If ${firstName} doesn't claim it, it comes back to you.`
            : `${firstName} has ${HOLD_DAYS} days to claim it.`}
        </p>
      </>
    );
  }

  if (step === 2) {
    const noteId = `${ids}-note`;
    const next = (e: FormEvent) => {
      e.preventDefault();
      setStep(3);
    };
    return (
      <>
        {header("A note for the cover", true)}
        <form onSubmit={next} className="grid gap-5">
          <div className="grid gap-1.5">
            <Label htmlFor={noteId} className={LABEL}>
              Your note
            </Label>
            <Textarea
              id={noteId}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={NOTE_MAX}
              rows={4}
              autoFocus
              aria-describedby={`${noteId}-hint`}
              className="resize-none"
            />
            <div className="flex items-baseline justify-between gap-3">
              <Hint id={`${noteId}-hint`} error={null}>
                Optional. {firstName} sees it on the cover.
              </Hint>
              <span className="font-numeric text-[11px] text-muted-foreground">
                {note.length}/{NOTE_MAX}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button type="button" variant="ghost" className="font-label" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button type="submit" size="lg" className={cn(PRIMARY, "flex-1")}>
              See how it arrives
            </Button>
          </div>
        </form>
      </>
    );
  }

  const nameId = `${ids}-name`;
  const emailId = `${ids}-email`;
  const next = (e: FormEvent) => {
    e.preventDefault();
    setTried(true);
    if (!firstName) nameRef.current?.focus();
    else if (!EMAIL.test(address)) emailRef.current?.focus();
    else setStep(2);
  };
  return (
    <>
      {header("Who it's for", true)}
      <form noValidate onSubmit={next} className="grid gap-5">
        <div className="grid gap-1.5">
          <Label htmlFor={nameId} className={LABEL}>
            Their first name
          </Label>
          <Input
            ref={nameRef}
            id={nameId}
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            autoComplete="off"
            aria-invalid={nameError ? true : undefined}
            aria-describedby={`${nameId}-hint`}
            className={FIELD}
          />
          <Hint id={`${nameId}-hint`} error={nameError}>
            It goes on the cover.
          </Hint>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={emailId} className={LABEL}>
            Their email
          </Label>
          <Input
            ref={emailRef}
            id={emailId}
            type="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="off"
            aria-invalid={emailError ? true : undefined}
            aria-describedby={`${emailId}-hint`}
            className={FIELD}
          />
          <Hint id={`${emailId}-hint`} error={emailError}>
            They sign in with this address to claim it.
          </Hint>
        </div>
        <Button type="submit" size="lg" className={cn(PRIMARY, "w-full")}>
          Next
        </Button>
      </form>
    </>
  );
}

export function GiftFlow({ open, onClose, ...rest }: GiftFlowProps) {
  const phone = useIsMobile();
  // Each opening starts a fresh flow, while a closing sheet keeps the step it
  // closed on until it has slid away.
  const [session, setSession] = useState(0);
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setSession((n) => n + 1);
  }
  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent
        side={phone ? "bottom" : "right"}
        className={cn(
          "flex flex-col gap-5 overflow-y-auto",
          phone ? "max-h-[92dvh] rounded-t-2xl pb-[max(1.5rem,env(safe-area-inset-bottom))]" : "w-full sm:max-w-md",
        )}
      >
        <GiftSteps key={session} onClose={onClose} {...rest} />
      </SheetContent>
    </Sheet>
  );
}

export default GiftFlow;
