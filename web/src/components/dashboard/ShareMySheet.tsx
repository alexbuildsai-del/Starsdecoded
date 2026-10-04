/**
 * Share my report (ADR-235, MB-104): the reader's own finished Personal
 * report goes to one address on the send-and-claim path, and its claim lets
 * that person read it and puts the reader on their circle. Sharing is the
 * reader's consent (ADR-139), so the sheet names what goes before anything is
 * sent, and answers with where the link went, or the link itself when the
 * email did not go. Who has it, and Stop sharing, sit on the quick look that
 * opens it (reading 5). It frames itself like the other dashboard sheets, from
 * the bottom on a phone and from the right on a desktop, and its email field
 * is the gift's own (ADR-172).
 */
import { useEffect, useId, useRef, useState, type FormEvent, type RefObject } from "react";
import { Check, Copy } from "lucide-react";
import { useIsMutating, useQueryClient } from "@tanstack/react-query";
import {
  getListSharesQueryKey,
  getShareMyReportMutationKey,
  useShareMyReport,
  type ShareCreated,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { StatusDots } from "@/components/StatusDots";
import { useOpenerFocus } from "@/components/dashboard/RowMenu";
import { useIsMobile } from "@/hooks/use-mobile";
import { SHARE_EMAIL_MISSING, SHARE_MINE, shareErrorLine, shareLine, shareSentLine } from "@/lib/home-view";
import { refusalLine } from "@/lib/refusals";
import { cn } from "@/lib/utils";

export interface ShareMySheetProps {
  open: boolean;
  onClose: () => void;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// The gift flow's field and buttons, so the one email field a dashboard sheet asks for looks the same in both.
const LABEL = "font-label text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground";
const FIELD = "h-10 aria-[invalid=true]:border-destructive";
const PRIMARY = "min-h-10 w-full font-label text-[13.5px]";
// A status stands where its button was, in the button's own place and size (ADR-130).
const STATUS =
  "flex min-h-10 w-full items-center justify-center rounded-md border border-[rgba(92,107,192,.35)] bg-[rgba(92,107,192,.14)] px-4 font-label text-[13.5px] font-medium text-[#9FA8DA]";

function Outcome({ sent, onClose }: { sent: ShareCreated; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const linkRef = useRef<HTMLInputElement>(null);

  async function copy() {
    try {
      await navigator.clipboard.writeText(sent.claimUrl);
      setCopied(true);
    } catch {
      // Without clipboard access the link is left selected, so the reader can copy it by hand.
      linkRef.current?.select();
    }
  }

  return (
    <>
      <p aria-live="polite" className="text-[15px] leading-[1.5] [overflow-wrap:anywhere]">
        {shareSentLine(sent.email, sent.emailDelivered)}
      </p>
      {!sent.emailDelivered && (
        <div className="flex gap-2">
          <Input
            ref={linkRef}
            readOnly
            value={sent.claimUrl}
            aria-label={`The link for ${sent.email}`}
            onFocus={(e) => e.currentTarget.select()}
            className={FIELD}
            data-testid="text-share-link"
          />
          <Button type="button" variant="outline" onClick={copy} className="h-10 shrink-0 gap-1.5 font-label" data-testid="button-copy-share-link">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? SHARE_MINE.copied : SHARE_MINE.copy}
          </Button>
        </div>
      )}
      <Button size="lg" autoFocus onClick={onClose} className={PRIMARY}>
        {SHARE_MINE.done}
      </Button>
    </>
  );
}

function ShareForm({ onClose, emailRef }: { onClose: () => void; emailRef: RefObject<HTMLInputElement | null> }) {
  const client = useQueryClient();
  const ids = useId();
  const [email, setEmail] = useState("");
  const [tried, setTried] = useState(false);
  // On the hook, not the call, so the quick look's list follows even when the sheet is closed before the answer comes.
  const share = useShareMyReport({
    mutation: { onSettled: () => void client.invalidateQueries({ queryKey: getListSharesQueryKey() }) },
  });

  const address = email.trim();
  const code = share.error?.data?.error;
  const refusal = share.isError ? refusalLine(share.error) : null;
  const fieldError = tried && !EMAIL.test(address) ? SHARE_EMAIL_MISSING : !refusal && code === "validation_error" ? shareErrorLine(code) : null;
  const sendError = share.isError && !fieldError ? (refusal ?? shareErrorLine(code)) : null;

  // A refused address is answered at the field, so focus goes back there to fix it.
  useEffect(() => {
    if (fieldError && !share.isPending) emailRef.current?.focus();
  }, [fieldError, share.isPending, emailRef]);

  if (share.isSuccess) return <Outcome sent={share.data} onClose={onClose} />;

  const emailId = `${ids}-email`;
  const errorId = `${ids}-error`;
  const lineId = `${ids}-line`;

  function edit(value: string) {
    setEmail(value);
    if (share.isError) share.reset();
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (share.isPending) return;
    setTried(true);
    if (!EMAIL.test(address)) {
      emailRef.current?.focus();
      return;
    }
    share.mutate({ data: { email: address } });
  }

  return (
    <form noValidate onSubmit={submit} className="grid gap-5">
      <div className="grid gap-1.5">
        <Label htmlFor={emailId} className={LABEL}>
          {SHARE_MINE.email}
        </Label>
        <Input
          ref={emailRef}
          id={emailId}
          type="email"
          inputMode="email"
          autoComplete="off"
          value={email}
          onChange={(e) => edit(e.target.value)}
          aria-invalid={fieldError ? true : undefined}
          aria-describedby={fieldError ? `${errorId} ${lineId}` : lineId}
          className={FIELD}
          data-testid="input-share-email"
        />
        {fieldError && (
          <p id={errorId} className="text-xs leading-[1.4] text-destructive">
            {fieldError}
          </p>
        )}
      </div>
      <p id={lineId} className="text-[13px] leading-[1.5] text-muted-foreground">
        {shareLine()}
      </p>
      {sendError && (
        <p role="alert" className="text-[13px] leading-[1.45] text-destructive">
          {sendError}
        </p>
      )}
      <div className="grid gap-2.5">
        {share.isPending ? (
          <div className={STATUS}>
            <StatusDots label={SHARE_MINE.sending} />
          </div>
        ) : (
          <Button type="submit" size="lg" className={PRIMARY} data-testid="button-share-send">
            {SHARE_MINE.send}
          </Button>
        )}
        <Button type="button" variant="outline" size="lg" disabled={share.isPending} onClick={onClose} className={PRIMARY}>
          {SHARE_MINE.notNow}
        </Button>
      </div>
    </form>
  );
}

export function ShareMySheet({ open, onClose }: ShareMySheetProps) {
  const phone = useIsMobile();
  const focus = useOpenerFocus();
  const emailRef = useRef<HTMLInputElement | null>(null);
  // A link half sent must finish before the sheet can close, or its answer, and the link to copy, would be lost.
  const sending = useIsMutating({ mutationKey: getShareMyReportMutationKey() }) > 0;
  // Each opening starts afresh, while a closing sheet keeps what it showed until it has slid away.
  const [session, setSession] = useState(0);
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setSession((n) => n + 1);
  }

  return (
    <Sheet open={open} onOpenChange={(next) => !next && !sending && onClose()}>
      <SheetContent
        side={phone ? "bottom" : "right"}
        className={cn(
          "flex flex-col gap-5 overflow-y-auto",
          phone ? "max-h-[92dvh] rounded-t-2xl pb-[max(1.5rem,env(safe-area-inset-bottom))]" : "w-full sm:max-w-md",
        )}
        // The line naming what goes describes the field focus lands on, so the sheet itself carries no second copy of it.
        aria-describedby={undefined}
        // The address is what the sheet is for, so it takes focus, and focus goes back to Share my report after.
        onOpenAutoFocus={(event) => {
          focus.onOpenAutoFocus();
          event.preventDefault();
          emailRef.current?.focus();
        }}
        onCloseAutoFocus={focus.onCloseAutoFocus}
      >
        <SheetHeader className="space-y-1.5 pr-8 text-left">
          <SheetTitle className="font-display text-2xl font-normal leading-[1.1] tracking-[-0.02em]">{SHARE_MINE.title}</SheetTitle>
        </SheetHeader>
        <ShareForm key={session} onClose={onClose} emailRef={emailRef} />
      </SheetContent>
    </Sheet>
  );
}

export default ShareMySheet;
