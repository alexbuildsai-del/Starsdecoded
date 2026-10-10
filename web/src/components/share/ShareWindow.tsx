/**
 * The one Share window (sharing-and-circle §1, ADR-329): a centred dialog from 640 px and a bottom sheet below, for
 * the reader's own report (any address, ADR-235), a report they made (that person only, ADR-181) and a pair (its other
 * person, MB-82). Addresses become chips; Share sends each; "Who can read it" lists the owner, the invited and the
 * readers, all read from GET /home (ADR-341, 390) and read again after every action, never patched. Enter adds a
 * chip and never closes the window (R14-12).
 */
import { useEffect, useRef, useState, type ClipboardEvent, type KeyboardEvent } from "react";
import { Check, MoreHorizontal, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetHomeQueryKey,
  getGetReportQueryKey,
  getListInvitesQueryKey,
  getListProfilesQueryKey,
  getListReportsQueryKey,
  getListSharesQueryKey,
  useCancelInvite,
  useCopyInviteLink,
  useCreateInvite,
  useSendCompatibility,
  useShareMyReport,
  type HomeReader,
} from "@workspace/api-client-react";
import { StopSharingDialog, type StopTarget } from "@/components/dashboard/StopSharingDialog";
import { Button } from "@/ds/atoms/Button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/ds/organisms/Dialog";
import { Menu, MenuContent, MenuItem, MenuTrigger } from "@/ds/organisms/Menu";
import { useHome } from "@/hooks/useHome";
import {
  classifyChips,
  copyLink,
  footerLine,
  initialsOf,
  orderedReaders,
  readerLine,
  readerName,
  sentToast,
  shareFailureLine,
  splitEmails,
  type ChipState,
} from "@/lib/share-window";
import { COMPATIBILITY_REPORT } from "@/lib/product";
import { cn } from "@/lib/utils";

/** What is being shared: the reader's own report, a person's report the reader made, or a pair (by its report). */
export type ShareTarget =
  | { kind: "own" }
  | { kind: "person"; profileId: string; name: string }
  | { kind: "pair"; reportId: string; name: string };

export interface ShareWindowProps {
  open: boolean;
  onClose: () => void;
  target: ShareTarget;
}

interface Chip {
  value: string;
  /** The API's own line when it refused this address (B-52); the chip stays so the reader can fix or remove it. */
  refused?: string;
}

const LABEL = "font-label text-label uppercase text-muted";
const MUTED = "text-small text-paper-dim";
const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-focus";

function titleOf(target: ShareTarget): string {
  if (target.kind === "own") return "Share your report";
  if (target.kind === "person") return `Share ${target.name}'s report`;
  return `Share your ${COMPATIBILITY_REPORT} with ${target.name}`;
}

function placeholderOf(target: ShareTarget): string {
  return target.kind === "own" ? "Add people by email" : `Add ${target.name}'s email`;
}

const ONLY_ONE = (name: string) => `This report can only go to ${name}. Add one address.`;

function Avatar({ name, owner = false }: { name: string; owner?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid size-8 shrink-0 place-items-center rounded-full font-label text-caption font-medium",
        owner ? "bg-indigo text-on-indigo" : "bg-line text-paper-dim",
      )}
    >
      {initialsOf(name)}
    </span>
  );
}

function ShareBody({ target, onClose, onBusy }: { target: ShareTarget; onClose: () => void; onBusy: (busy: boolean) => void }) {
  const client = useQueryClient();
  const home = useHome().data;
  const input = useRef<HTMLInputElement>(null);
  const shareButton = useRef<HTMLButtonElement>(null);
  const [chips, setChips] = useState<Chip[]>([]);
  const [typed, setTyped] = useState("");
  const [sending, setSending] = useState(false);
  const [notes, setNotes] = useState<string[]>([]);
  const [acting, setActing] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [manual, setManual] = useState<{ inviteId: string; url: string } | null>(null);
  const [stopping, setStopping] = useState<StopTarget | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(noticeTimer.current), []);

  // Said inside the window, not as a toast: a toast is a layer of its own, and its Escape would close it before the window.
  function say(line: string) {
    clearTimeout(noticeTimer.current);
    setNotice(line);
    noticeTimer.current = setTimeout(() => setNotice(null), 4000);
  }

  const shareOwn = useShareMyReport();
  const invite = useCreateInvite();
  const cancel = useCancelInvite();
  const linkFor = useCopyInviteLink();
  const pairSend = useSendCompatibility();

  const own = target.kind === "own";
  const forName = own ? null : target.name;
  const readers: readonly HomeReader[] =
    (target.kind === "own" ? home?.you?.readers
    : target.kind === "person" ? home?.people.find((p) => p.profileId === target.profileId)?.readers
    : home?.pairs.find((p) => p.reportId === target.reportId)?.readers) ?? [];
  const ownerName = home?.you?.name ?? "You";

  const states: ChipState[] = classifyChips(chips.map((c) => c.value), !own);
  const typedStates = classifyChips([...chips.map((c) => c.value), ...splitEmails(typed)], !own).slice(chips.length);
  const canShare = !sending && (states.includes("ok") || typedStates.includes("ok"));
  const bad = chips.filter((_, i) => states[i] === "bad").map((c) => c.value);
  const hasExtra = states.includes("extra");
  const refusals = chips.filter((c) => c.refused).map((c) => c.refused as string);

  const refreshHome = async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: getGetHomeQueryKey() }),
      client.invalidateQueries({ queryKey: getListSharesQueryKey() }),
      client.invalidateQueries({ queryKey: getListInvitesQueryKey() }),
      client.invalidateQueries({ queryKey: getListProfilesQueryKey() }),
      client.invalidateQueries({ queryKey: getListReportsQueryKey() }),
      ...(target.kind === "pair" ? [client.invalidateQueries({ queryKey: getGetReportQueryKey(target.reportId) })] : []),
    ]);
  };

  function commit(text: string) {
    const pieces = splitEmails(text);
    if (pieces.length === 0) return;
    setChips((prev) => {
      const have = new Set(prev.map((c) => c.value.toLowerCase()));
      return [...prev, ...pieces.filter((p) => !have.has(p.toLowerCase())).map((value) => ({ value }))];
    });
  }

  function takeTyped() {
    if (!typed.trim()) return;
    commit(typed);
    setTyped("");
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      // Never submits and never reaches the dialog: a stray Enter adds a chip and nothing else (R14-12).
      event.preventDefault();
      event.stopPropagation();
      takeTyped();
      return;
    }
    if (event.key === "Backspace" && !typed && chips.length > 0) {
      event.preventDefault();
      setTyped(chips[chips.length - 1].value);
      setChips(chips.slice(0, -1));
    }
  }

  function onChange(value: string) {
    if (/[,;\s]$/.test(value) && value.trim()) {
      commit(value);
      setTyped("");
    } else {
      setTyped(value);
    }
  }

  function onPaste(event: ClipboardEvent<HTMLInputElement>) {
    const pasted = event.clipboardData.getData("text");
    if (!pasted.trim()) return;
    event.preventDefault();
    commit(`${typed} ${pasted}`);
    setTyped("");
  }

  async function sendOne(email: string): Promise<{ delivered: boolean }> {
    if (target.kind === "own") {
      const sent = await shareOwn.mutateAsync({ data: { email } });
      return { delivered: sent.emailDelivered };
    }
    if (target.kind === "person") {
      const sent = await invite.mutateAsync({ data: { profileId: target.profileId, email } });
      return { delivered: sent.emailDelivered };
    }
    const sent = await pairSend.mutateAsync({ id: target.reportId, data: { email } });
    return { delivered: sent.invite ? sent.invite.emailDelivered : true };
  }

  async function share() {
    if (sending) return;
    const all = [...chips.map((c) => c.value)];
    for (const piece of splitEmails(typed)) if (!all.some((v) => v.toLowerCase() === piece.toLowerCase())) all.push(piece);
    const kinds = classifyChips(all, !own);
    const todo = all.filter((_, i) => kinds[i] === "ok");
    if (todo.length === 0) return;
    setTyped("");
    setSending(true);
    onBusy(true);
    setActionError(null);
    setNotes([]);
    const sent: string[] = [];
    const refused = new Map<string, string>();
    const undelivered: string[] = [];
    for (const email of todo) {
      try {
        const result = await sendOne(email);
        sent.push(email);
        if (!result.delivered) undelivered.push(email);
      } catch (error) {
        refused.set(email, `${email}: ${shareFailureLine(error)}`);
      }
    }
    await refreshHome();
    setChips(all.filter((email) => !sent.includes(email)).map((value) => ({ value, refused: refused.get(value) })));
    setNotes(undelivered.map((email) => `The email to ${email} did not go through. Use Copy their link in the list.`));
    if (sent.length > 0) say(sentToast(sent.length));
    setSending(false);
    onBusy(false);
    input.current?.focus();
  }

  async function cancelInvite(reader: HomeReader) {
    if (!reader.inviteId) return;
    setActing(reader.inviteId);
    setActionError(null);
    try {
      await cancel.mutateAsync({ id: reader.inviteId });
    } catch (error) {
      // A link already gone has ended all the same, so the list is read again and drops it.
      if ((error as { status?: number } | null)?.status !== 404) {
        setActionError(shareFailureLine(error));
        setActing(null);
        return;
      }
    }
    await refreshHome();
    setActing(null);
    say(`Invite to ${readerName(reader)} cancelled`);
  }

  async function copyTheirLink(reader: HomeReader) {
    if (!reader.inviteId) return;
    const inviteId = reader.inviteId;
    setActing(inviteId);
    setActionError(null);
    setManual(null);
    try {
      const result = await copyLink(async () => {
        const link = await linkFor.mutateAsync({ id: inviteId });
        return link.claimUrl;
      });
      if (result.copied) say(`Link for ${readerName(reader)} copied`);
      else setManual({ inviteId, url: result.url });
    } catch (error) {
      setActionError(shareFailureLine(error));
    }
    setActing(null);
  }

  // The row that opened Stop sharing may be gone with the access it ended; focus then goes to the field, not the page.
  function stopClosed() {
    setStopping(null);
    setTimeout(() => {
      if (document.activeElement === document.body) input.current?.focus();
    }, 350);
  }

  function removeAccess(reader: HomeReader) {
    const name = readerName(reader);
    if (target.kind === "pair") setStopping({ kind: "pair", id: target.reportId, name });
    else if (reader.shareId) setStopping({ kind: "share", id: reader.shareId, name });
  }

  function menuFor(reader: HomeReader): "invited" | "access" | null {
    if (reader.state === "invited") return reader.inviteId ? "invited" : null;
    return target.kind === "pair" || reader.shareId ? "access" : null;
  }

  const people = orderedReaders(readers);
  const messages = [
    ...(bad.length === 1 ? [`"${bad[0]}" isn't an email address.`] : bad.length > 1 ? [`${bad.length} of them aren't email addresses.`] : []),
    ...(hasExtra && forName ? [ONLY_ONE(forName)] : []),
    ...refusals,
  ];

  return (
    <>
      <DialogHeader>
        <DialogTitle>{titleOf(target)}</DialogTitle>
        <DialogDescription>Only the people below can read it.</DialogDescription>
      </DialogHeader>

      <div className="grid gap-2">
        <div className="flex items-start gap-2">
          <div
            className="flex min-h-10 min-w-0 flex-1 cursor-text flex-wrap items-center gap-1.5 rounded-control border border-control-edge bg-ground px-2 py-1.5 focus-within:border-indigo"
            onClick={() => input.current?.focus()}
          >
            {chips.map((chip, index) => {
              const flagged = states[index] !== "ok" || !!chip.refused;
              return (
                <span
                  key={chip.value}
                  className={cn(
                    "inline-flex max-w-full items-center gap-1 rounded-full border py-0.5 pl-2.5 pr-1 text-small",
                    flagged
                      ? "border-error/40 bg-error/10 text-error"
                      : "border-indigo/35 bg-indigo/15 text-paper",
                  )}
                >
                  <span className="min-w-0 truncate">{chip.value}</span>
                  <button
                    type="button"
                    aria-label={`Remove ${chip.value}`}
                    disabled={sending}
                    onClick={(e) => {
                      e.stopPropagation();
                      setChips(chips.filter((_, i) => i !== index));
                      input.current?.focus();
                    }}
                    className={cn("grid size-5 shrink-0 place-items-center rounded-full hover:bg-surface", FOCUS)}
                  >
                    <X className="h-3 w-3" aria-hidden="true" />
                  </button>
                </span>
              );
            })}
            <input
              ref={input}
              type="text"
              inputMode="email"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              value={typed}
              disabled={sending}
              placeholder={chips.length === 0 ? placeholderOf(target) : ""}
              aria-label="Their email"
              aria-invalid={bad.length > 0 || hasExtra || undefined}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={onKeyDown}
              onPaste={onPaste}
              onBlur={(e) => {
                if (e.relatedTarget !== shareButton.current) takeTyped();
              }}
              className="min-w-[8rem] flex-1 bg-transparent py-1 text-base text-paper outline-none placeholder:text-muted sm:text-ui"
              data-testid="input-share-email"
            />
          </div>
          <Button
            ref={shareButton}
            disabled={!canShare}
            busy={sending ? "Sharing" : undefined}
            onClick={() => void share()}
            className="shrink-0"
            data-testid="button-share-send"
          >
            Share
          </Button>
        </div>
        <div aria-live="polite" className="grid gap-1">
          {messages.map((line) => (
            <p key={line} className="text-small text-error">
              {line}
            </p>
          ))}
          {notes.map((line) => (
            <p key={line} className={MUTED}>
              {line}
            </p>
          ))}
          {notice && (
            <p className="flex items-center gap-1.5 text-small text-teal" data-testid="text-share-notice">
              <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {notice}
            </p>
          )}
        </div>
      </div>

      <div className="flex min-h-0 flex-col gap-2">
        <h3 className={LABEL}>Who can read it</h3>
        <ul className="-mx-1 min-h-0 overflow-y-auto px-1" data-testid="list-share-readers">
          <li className="flex items-center gap-3 py-2">
            <Avatar name={ownerName} owner />
            <div className="min-w-0 flex-1">
              <p className="text-ui leading-tight">You</p>
              <p className={MUTED}>Owner</p>
            </div>
          </li>
          {people.map((reader, index) => {
            const name = readerName(reader);
            const menu = menuFor(reader);
            const key = reader.shareId ?? reader.inviteId ?? reader.email ?? `${index}`;
            const busy = acting !== null && acting === reader.inviteId;
            return (
              <li key={key} className="py-2">
                <div className="flex items-center gap-3">
                  <Avatar name={name} />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 text-ui leading-tight">
                      <span className="min-w-0 truncate">{name}</span>
                      {reader.state === "invited" && (
                        <span className="inline-flex h-[18px] shrink-0 items-center rounded-full bg-brass/15 px-2 font-label text-data-sm text-brass">
                          Invited
                        </span>
                      )}
                    </p>
                    <p className={cn(MUTED, "truncate")}>{readerLine(reader)}</p>
                  </div>
                  {menu && (
                    <Menu>
                      <MenuTrigger
                        aria-label={`More for ${name}`}
                        className={cn("grid size-11 shrink-0 place-items-center rounded-control text-paper-dim hover:bg-surface hover:text-paper disabled:opacity-50", FOCUS)}
                      >
                        <MoreHorizontal className="size-4" aria-hidden="true" />
                      </MenuTrigger>
                      <MenuContent align="end" className="w-[190px]">
                        {menu === "invited" ? (
                          <>
                            <MenuItem onSelect={() => void copyTheirLink(reader)}>Copy their link</MenuItem>
                            <MenuItem danger onSelect={() => void cancelInvite(reader)}>
                              Cancel invite
                            </MenuItem>
                          </>
                        ) : (
                          <MenuItem danger onSelect={() => removeAccess(reader)}>
                            Remove access
                          </MenuItem>
                        )}
                      </MenuContent>
                    </Menu>
                  )}
                </div>
                {manual && manual.inviteId === reader.inviteId && (
                  <div className="mt-2 grid gap-1 pl-11">
                    <p className={MUTED}>Copy this link and send it to {name} yourself.</p>
                    <input
                      readOnly
                      value={manual.url}
                      aria-label={`The link for ${name}`}
                      onFocus={(e) => e.currentTarget.select()}
                      className="h-11 w-full rounded-control border border-control-edge bg-ground px-2 text-base text-paper sm:text-caption"
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        {actionError && (
          <p role="alert" className="text-small text-error">
            {actionError}
          </p>
        )}
      </div>

      <footer className="flex items-center justify-between gap-3 border-t border-line pt-3">
        <p aria-live="polite" className={MUTED} data-testid="text-share-count">
          {footerLine(readers)}
        </p>
        <Button variant="secondary" size="compact" disabled={sending} onClick={onClose} data-testid="button-share-done">
          Done
        </Button>
      </footer>

      <StopSharingDialog target={stopping} onClose={stopClosed} onStopped={say} />
    </>
  );
}

export function ShareWindow({ open, onClose, target }: ShareWindowProps) {
  // A share half sent must finish before the window closes, or its answer, and a refused address, would be lost.
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open={open} onOpenChange={(next) => !next && !busy && onClose()}>
      <DialogContent
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          (event.currentTarget as HTMLElement).querySelector<HTMLInputElement>('[data-testid="input-share-email"]')?.focus();
        }}
      >
        <ShareBody target={target} onClose={onClose} onBusy={setBusy} />
      </DialogContent>
    </Dialog>
  );
}

export default ShareWindow;
