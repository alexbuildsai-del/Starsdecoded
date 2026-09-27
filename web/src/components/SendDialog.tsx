/**
 * Send hands a finished report to the person it is about (ADR-120), or a
 * Compatibility report to the other of its two people when the reader is one
 * of them (ADR-133). One dialog for both: an email, unless the other person is
 * already on Stars Decoded and is granted it at once; then one line on what
 * happened, with the link to pass on by hand when the email did not go.
 * Sending is the sender's consent (ADR-139), so the dialog says what the other
 * person will see and how it stops.
 */
import { useRef, useState, type FormEvent } from "react";
import { Check, Copy } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetReportQueryKey,
  getListInvitesQueryKey,
  getListProfilesQueryKey,
  getListReportsQueryKey,
  useCreateInvite,
  useSendCompatibility,
  type InviteSummary,
  type SendState,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusDots } from "@/components/StatusDots";
import { COMPATIBILITY_REPORT, PERSONAL_REPORT } from "@/lib/product";

/**
 * Who a send goes to; `send` names them and holds the state. A person's
 * `reportId` is their natal report, refreshed once it is sent; a pair's is the
 * Compatibility report, which addresses the send route.
 */
export type SendTarget =
  | { kind: "person"; send: SendState; reportId?: string }
  | { kind: "pair"; send: SendState; reportId: string };

export interface SendDialogProps {
  open: boolean;
  onClose: () => void;
  target: SendTarget | null;
}

export interface SendLineProps {
  send: SendState | null | undefined;
  onSend: () => void;
}

type Outcome =
  | { kind: "emailed"; email: string }
  | { kind: "link"; email: string; link: string }
  | { kind: "granted" };

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
const EMAIL = /.+@.+\..+/;

// The link is built on the page's own origin: the API sits behind a rewrite
// and cannot tell which web host the reader is on.
function outcomeOf(invite: InviteSummary): Outcome {
  if (invite.emailDelivered) return { kind: "emailed", email: invite.email };
  const link = `${window.location.origin}${basePath}/claim?token=${encodeURIComponent(invite.token)}`;
  return { kind: "link", email: invite.email, link };
}

function introOf(target: SendTarget, askEmail: boolean): string {
  const name = target.send.firstName;
  if (target.kind === "person") {
    // ADR-139: a claimed report is its subject's, and the giver who wrote it reads it until they stop sharing.
    return `We email ${name} a link to their ${PERSONAL_REPORT}. When they sign in, it becomes theirs. You can still read it unless they stop sharing it.`;
  }
  const shows = `It shows your birth record and theirs, and passages from both ${PERSONAL_REPORT}s. You can stop sharing it at any time.`;
  return askEmail
    ? `We email ${name} a link to this ${COMPATIBILITY_REPORT}. ${shows}`
    : `${name} already has an account, so they can read this ${COMPATIBILITY_REPORT} as soon as you send it. ${shows}`;
}

function outcomeLine(outcome: Outcome, name: string): string {
  if (outcome.kind === "granted") return `${name} can read it now.`;
  if (outcome.kind === "emailed") return `We emailed ${name} at ${outcome.email}.`;
  return `The email did not go through. Copy this link and send it to ${name} yourself. They sign in with ${outcome.email} to open it.`;
}

function failureLine(code: string | undefined, name: string, askedEmail: boolean): string {
  if (code === "already_claimed") return `${name} already has it.`;
  if (code === "not_ready") return "You can send it once it is finished.";
  if (code === "validation_error" && askedEmail) return "That email address did not work. Check it and try again.";
  return "It did not send. Try again in a minute.";
}

function SendBody({ target, onClose }: { target: SendTarget; onClose: () => void }) {
  const client = useQueryClient();
  const { send } = target;
  const name = send.firstName;
  const askEmail = target.kind === "person" || send.state !== "can_grant";
  const [email, setEmail] = useState("");
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [copied, setCopied] = useState(false);
  const linkField = useRef<HTMLInputElement>(null);

  // Settled, not only succeeded: a refused send refreshes the state that offered it.
  const refresh = () => {
    if (target.reportId) client.invalidateQueries({ queryKey: getGetReportQueryKey(target.reportId) });
    client.invalidateQueries({ queryKey: getListReportsQueryKey() });
    client.invalidateQueries({ queryKey: getListProfilesQueryKey() });
    client.invalidateQueries({ queryKey: getListInvitesQueryKey() });
  };
  const invite = useCreateInvite({ mutation: { onSettled: refresh } });
  const pairSend = useSendCompatibility({ mutation: { onSettled: refresh } });

  const pending = invite.isPending || pairSend.isPending;
  const failure = invite.error ?? pairSend.error;
  const address = email.trim();
  const ready = !askEmail || EMAIL.test(address);
  const error = failure ? failureLine(failure.data?.error, name, askEmail) : null;
  const addressRefused = askEmail && failure?.data?.error === "validation_error";

  function edit(value: string) {
    setEmail(value);
    if (failure) {
      invite.reset();
      pairSend.reset();
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!ready || pending) return;
    if (target.kind === "person") {
      invite.mutate({ data: { profileId: send.profileId, email: address } }, { onSuccess: (sent) => setOutcome(outcomeOf(sent)) });
      return;
    }
    // MB-103 provisional: a pair reaches its other person only when one of its two sends it.
    pairSend.mutate(
      { id: target.reportId, data: askEmail ? { email: address } : {} },
      { onSuccess: (res) => setOutcome(res.state === "invited" && res.invite ? outcomeOf(res.invite) : { kind: "granted" }) },
    );
  }

  async function copy(link: string) {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      // Without clipboard access the link is left selected, so the reader can copy it by hand.
      linkField.current?.select();
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle className="font-display text-xl">Send to {name}</DialogTitle>
        <DialogDescription aria-live="polite">{outcome ? outcomeLine(outcome, name) : introOf(target, askEmail)}</DialogDescription>
      </DialogHeader>

      {outcome ? (
        <>
          {outcome.kind === "link" && (
            <div className="flex gap-2">
              <Input
                ref={linkField}
                readOnly
                value={outcome.link}
                aria-label={`The link for ${name}`}
                onFocus={(e) => e.currentTarget.select()}
                data-testid="text-send-link"
              />
              <Button variant="outline" onClick={() => copy(outcome.link)} className="shrink-0 gap-1.5 font-label" data-testid="button-copy-send-link">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied" : "Copy link"}
              </Button>
            </div>
          )}
          <div className="flex justify-end">
            <Button onClick={onClose} autoFocus className="font-label">Done</Button>
          </div>
        </>
      ) : (
        <form onSubmit={submit} noValidate className="space-y-4">
          {askEmail && (
            <div>
              <Label htmlFor="send-email" className="font-label text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                Their email
              </Label>
              <Input
                id="send-email"
                type="email"
                autoComplete="off"
                value={email}
                onChange={(e) => edit(e.target.value)}
                aria-invalid={addressRefused || undefined}
                aria-describedby={error ? "send-error" : undefined}
                className="mt-2"
                data-testid="input-send-email"
              />
            </div>
          )}
          {error && <p id="send-error" role="alert" className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} className="font-label">Cancel</Button>
            <Button type="submit" disabled={!ready || pending} className="font-label" data-testid="button-send">
              {pending ? <StatusDots label="Sending" /> : "Send"}
            </Button>
          </div>
        </form>
      )}
    </>
  );
}

/** The one Send dialog, for a person and for a pair; its state resets each time it closes. */
export function SendDialog({ open, onClose, target }: SendDialogProps) {
  return (
    <Dialog open={open && target !== null} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        {target && <SendBody target={target} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function lineText(send: SendState): { title: string; note: string } {
  const name = send.firstName;
  if (send.state === "sent") return { title: `Sent · waiting for ${name}`, note: "When they sign in, the report is theirs." };
  if (send.state === "joined") return { title: `${name} joined`, note: "The report is theirs now. They can delete it or stop you seeing it." };
  return { title: `Give ${name} their report`, note: "An email and a link. When they sign in, it is theirs." };
}

/**
 * A person's send line, for their card, their row and their natal report.
 * The server decides where Send is offered (reading 11), so a null `send`
 * draws nothing. A pair's send lives in its row and the share block instead,
 * where its sender's Stop sharing can sit beside it (MB-103).
 */
export function SendLine({ send, onSend }: SendLineProps) {
  if (!send) return null;
  const { title, note } = lineText(send);
  return (
    <div
      className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-xl border border-[#242C3B] bg-[rgba(20,24,31,.6)] px-3 py-2.5"
      data-testid="send-line"
      data-state={send.state}
    >
      <div className="min-w-0 flex-1 basis-[200px]">
        <p className="text-[13.5px] leading-snug text-foreground">{title}</p>
        <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{note}</p>
      </div>
      {send.state === "joined" && (
        <span className="inline-flex h-[30px] shrink-0 items-center rounded-md border border-[rgba(127,176,139,.4)] px-[11px] font-label text-xs text-[#7FB08B]">
          Joined ✓
        </span>
      )}
      {(send.state === "can_send" || send.state === "can_grant") && (
        <Button
          variant="outline"
          size="sm"
          onClick={onSend}
          className="shrink-0 font-label text-xs text-[#9FA8DA] [border-color:rgba(92,107,192,.6)]"
          data-testid="button-send-to"
        >
          Send to {send.firstName}
        </Button>
      )}
    </div>
  );
}

export default SendDialog;
