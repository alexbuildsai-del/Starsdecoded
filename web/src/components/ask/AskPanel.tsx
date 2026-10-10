/**
 * Ask's chat (ADR-213, 263; readings 13 to 16): a full-height sheet on a
 * phone, and on a desktop a panel on the right that keeps the screen beside
 * it (the timeline artifact's Ask). The reader types a question or taps one of
 * the choices Ask asked back with; "Writing" shows until the answer comes with
 * its computed cards; what's left this month never leaves the box. It renders
 * inside the launcher's dialog root, so focus comes back to the launcher.
 */
import { useId, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type RefObject } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "@clerk/react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  getGetAskThreadQueryKey,
  getGetTimelineAccessQueryKey,
  useGetAskThread,
  useSendAskMessage,
  type AskChoice,
  type AskMessage,
  type AskThread,
  type AskUsage,
  type SendAskBody,
} from "@workspace/api-client-react";
import { AskCards } from "@/components/ask/AskCards";
import { AskMark } from "@/components/ask/AskMark";
import { Button, buttonStyles } from "@/ds/atoms/Button";
import { StatusDots } from "@/ds/atoms/StatusDots";
import { TextButton } from "@/ds/atoms/TextButton";
import { useEntryFormat } from "@/hooks/useEntryFormat";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import {
  ASK_TEXT_MAX,
  askText,
  choiceBody,
  mergeThread,
  offerView,
  openChoices,
  paragraphs,
  roomLine,
  sendRefusal,
  textBody,
  usageLine,
  usageOf,
  type CapNote,
  type OfferView,
} from "@/lib/ask-view";
import { sentZone } from "@/lib/reader-zone";
import { cn } from "@/lib/utils";

/** The report's easing, the one the app moves on. */
const EASE = [0.16, 1, 0.3, 1] as const;

const NOTE = "m-0 text-small text-paper-dim";
const OFFER_BUTTON = cn(buttonStyles({ variant: "secondary", size: "compact" }), "mt-0.5 justify-self-start");

export interface AskPanelProps {
  open: boolean;
  /** A phone gets the full-height sheet. */
  phone: boolean;
  /** The report page it opened on, which a question asked there may read (reading 16). */
  reportId?: string;
  /** The access answer's count, shown until the thread's own comes (ADR-263). */
  usage: AskUsage | null;
  /** Where focus goes back to on closing. */
  launcher: RefObject<HTMLButtonElement | null>;
}

/** The count runs by the UTC month (reading 13), so a cap stands until the UTC day it resets. */
function utcToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function ReaderBubble({ text, bubble }: { text: string; bubble?: RefObject<HTMLParagraphElement | null> }) {
  return (
    <p
      ref={bubble}
      className="m-0 max-w-[85%] justify-self-end whitespace-pre-wrap break-words rounded-card rounded-br-inner border border-line bg-raised px-3.5 py-2.5 text-prose leading-normal text-paper"
    >
      <span className="sr-only">You: </span>
      {text}
    </p>
  );
}

/**
 * The pair offer under an answer (Review 05/10 §8): not a bubble, in the pair's violet, once a person in the thread.
 * Its button closes Ask on the way out, so the picker it opens is the one window on the page.
 */
function PairOffer({ offer, onLeave }: { offer: OfferView; onLeave: () => void }) {
  const titleId = useId();
  return (
    <div
      role="group"
      aria-labelledby={titleId}
      className="grid justify-items-start gap-1.5 rounded-control border border-dashed border-violet px-3 py-2.5 text-small leading-snug"
    >
      <p id={titleId} className="m-0 font-medium text-paper">
        {offer.title}
      </p>
      <p className="m-0 text-paper-dim">{offer.reason}</p>
      <p className="m-0 text-small text-paper">{offer.credits}</p>
      {/* Close's own type="button" would land on the link, which a link never carries. */}
      <Dialog.Close asChild type={undefined}>
        <Link href={offer.href} onClick={onLeave} aria-describedby={titleId} className={OFFER_BUTTON}>
          {offer.action}
        </Link>
      </Dialog.Close>
    </div>
  );
}

function Answer({
  message,
  choices,
  onChoose,
  onLeave,
  busy,
}: {
  message: AskMessage;
  choices: readonly AskChoice[];
  onChoose: (choice: AskChoice) => void;
  onLeave: () => void;
  busy: boolean;
}) {
  const offer = offerView(message.offer);
  return (
    <div className="grid min-w-0 gap-3">
      {paragraphs(message.text).map((text, i) => (
        <p key={i} className="m-0 whitespace-pre-line break-words text-prose leading-[1.65] text-paper">
          {i === 0 ? <span className="sr-only">Ask: </span> : null}
          {text}
        </p>
      ))}
      {message.cards.length ? (
        <div className="pt-1">
          <AskCards cards={message.cards} />
        </div>
      ) : null}
      {offer ? <PairOffer offer={offer} onLeave={onLeave} /> : null}
      {choices.length ? (
        <div className="flex flex-wrap gap-1.5">
          {choices.map((choice) => (
            <Button
              key={choice.id}
              variant="secondary"
              size="compact"
              disabled={busy}
              onClick={() => onChoose(choice)}
              className="h-auto whitespace-normal rounded-full bg-surface py-1.5 text-left leading-snug hover:bg-indigo-tint disabled:cursor-not-allowed disabled:opacity-45"
            >
              {choice.label}
            </Button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function AskPanel({ open, phone, reportId, usage: accessUsage, launcher }: AskPanelProps) {
  const reduced = useReducedMotion();
  const { order } = useEntryFormat();
  const client = useQueryClient();
  const { userId } = useAuth();
  const boxId = useId();
  const usageId = useId();

  // Kept while the panel is closed, so a question half typed is still there when it opens again.
  const [draft, setDraft] = useState("");
  // The reader's words while Ask writes, shown before the server has stored them.
  const [pending, setPending] = useState<string | null>(null);
  const [refusal, setRefusal] = useState<string | null>(null);
  const [cap, setCap] = useState<CapNote | null>(null);

  const panel = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLTextAreaElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const lastAsked = useRef<HTMLParagraphElement>(null);
  const jump = useRef<"end" | "question" | null>(null);
  // Leaving by the pair offer hands focus to the picker it opens, never back to the launcher behind it.
  const leaving = useRef(false);

  // Ask's days are the reader's, as Timeline's are (reading 4); with no zone the server reads the birth place's.
  const zone = sentZone();
  // Keyed by user, as the access answer is, so one account's conversation never shows to the next one in the same tab.
  const threadKey = useMemo(() => [...getGetAskThreadQueryKey(), userId ?? ""] as const, [userId]);
  const thread = useGetAskThread({ tz: zone }, { query: { queryKey: threadKey, enabled: open && Boolean(userId) } });
  const send = useSendAskMessage({
    mutation: {
      onSuccess: (answer) => {
        client.setQueryData<AskThread>(threadKey, (current) => mergeThread(current, answer));
      },
      // Ask's count lives in the access answer too, which every Timeline door reads once per user (R16 re-pin 16).
      onSettled: () => {
        void client.invalidateQueries({ queryKey: getGetTimelineAccessQueryKey() });
      },
    },
  });

  const messages = thread.data?.messages ?? [];
  const busy = send.isPending;
  const choices = busy ? [] : openChoices(messages);
  const capNote = cap && utcToday() < cap.resetsOn ? cap : null;
  const under = usageLine(usageOf(thread.data, accessUsage), capNote, order);
  const capped = under?.capped ?? false;
  const ready = !capped && !busy && askText(draft) !== null;
  const room = roomLine(draft);
  const lastReader = messages.reduce((last, m, i) => (m.role === "reader" ? i : last), -1);

  function submit(body: SendAskBody, shown: string, typed: boolean) {
    setRefusal(null);
    setPending(shown);
    if (typed) setDraft("");
    jump.current = "end";
    send.mutate(
      { data: body, params: { tz: zone } },
      {
        onSuccess: () => {
          jump.current = "question";
        },
        onError: (error) => {
          const refused = sendRefusal(error);
          if (refused.kind === "cap") {
            setCap(refused.cap);
            client.setQueryData<AskThread>(threadKey, (current) =>
              current ? { ...current, usage: { ...current.usage, used: current.usage.cap, left: 0, resetsOn: refused.cap.resetsOn } } : current,
            );
          } else {
            setRefusal(refused.line);
          }
          // The question goes back in the box to send again, unless another one was started meanwhile.
          if (typed) setDraft((now) => now || shown);
          void client.invalidateQueries({ queryKey: threadKey });
        },
        onSettled: () => setPending(null),
      },
    );
  }

  function sendDraft() {
    const text = askText(draft);
    if (!text || !ready) return;
    submit(textBody(text, reportId), text, true);
  }

  function choose(choice: AskChoice) {
    if (busy || capped) return;
    submit(choiceBody(choice.id, reportId), choice.label, false);
  }

  function onKey(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    sendDraft();
  }

  useLayoutEffect(() => {
    if (open) jump.current = "end";
  }, [open]);

  // Opening shows the newest message; an answer that arrives shows the question it answers at the top, the answer under it.
  useLayoutEffect(() => {
    const view = scroller.current;
    const how = jump.current;
    if (!view || !how || (!thread.data && pending === null)) return;
    view.scrollTop = how === "question" && lastAsked.current ? lastAsked.current.offsetTop - 16 : view.scrollHeight;
    jump.current = null;
  });

  // The box grows with the question up to its cap, then scrolls.
  useLayoutEffect(() => {
    const field = box.current;
    if (!field) return;
    field.style.height = "auto";
    field.style.height = `${Math.min(field.scrollHeight, 160)}px`;
  }, [draft, open]);

  const move = (duration: number) => (reduced ? { duration: 0 } : { duration, ease: EASE });
  const away = phone ? { y: "100%" } : { x: "100%" };

  return (
    <AnimatePresence>
      {open && (
        <Dialog.Portal forceMount key="ask">
          <Dialog.Overlay asChild forceMount>
            <motion.div
              className="fixed inset-0 z-50 bg-scrim"
              initial={reduced ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: move(0.25) }}
              transition={move(0.3)}
            />
          </Dialog.Overlay>
          <Dialog.Content
            asChild
            forceMount
            onOpenAutoFocus={(event) => {
              // On a phone the sheet takes focus, not the box, so the keyboard doesn't rise over it as it slides in.
              event.preventDefault();
              (phone || capped ? panel.current : box.current)?.focus();
            }}
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              if (leaving.current) leaving.current = false;
              else launcher.current?.focus();
            }}
            onInteractOutside={(event) => {
              // A desktop's panel stays open while the reader scrolls or taps the page beside it.
              if (!phone) event.preventDefault();
            }}
          >
            <motion.div
              ref={panel}
              tabIndex={-1}
              initial={reduced ? false : away}
              animate={{ x: 0, y: 0 }}
              exit={{ ...away, transition: move(0.3) }}
              transition={move(0.45)}
              className={cn(
                "fixed z-50 flex flex-col bg-ground text-paper outline-none",
                phone
                  ? "inset-x-0 top-0 h-[100dvh]"
                  : "inset-y-0 right-0 w-[min(440px,100vw)] border-l border-line shadow-raised",
              )}
            >
              <div className="flex h-14 shrink-0 items-center justify-between border-b border-line-soft pl-4 pr-2">
                <Dialog.Title className="m-0 text-paper">
                  <AskMark size={20} />
                </Dialog.Title>
                <Dialog.Close className="rounded px-2 py-2 font-label text-data-sm font-medium uppercase text-paper-dim transition-colors hover:text-paper focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-lt">
                  Close
                </Dialog.Close>
              </div>

              <div ref={scroller} className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-6 pt-5">
                {thread.isError && !thread.data ? (
                  <div className="grid gap-2">
                    <p className={NOTE}>Your messages didn't load.</p>
                    <TextButton onClick={() => void thread.refetch()} className="justify-self-start">
                      Try again
                    </TextButton>
                  </div>
                ) : thread.data || pending !== null ? (
                  // Drawn once the thread is in, so its history isn't read out; what's added after is.
                  <div role="log" aria-label="Your conversation with Ask" className="grid min-w-0 gap-5">
                    {messages.length === 0 && pending === null ? (
                      <div className="grid gap-2 pt-1">
                        <p className="m-0 font-display text-card-title text-paper">
                          A chat about your chart, your reports and your timeline
                        </p>
                        <p className={NOTE}>When Ask needs a date or a person, it asks you back.</p>
                      </div>
                    ) : null}
                    {messages.map((message, i) =>
                      message.role === "reader" ? (
                        <ReaderBubble key={message.id} text={message.text} bubble={i === lastReader ? lastAsked : undefined} />
                      ) : (
                        <Answer
                          key={message.id}
                          message={message}
                          choices={i === messages.length - 1 ? choices : []}
                          onChoose={choose}
                          onLeave={() => {
                            leaving.current = true;
                          }}
                          busy={busy || capped}
                        />
                      ),
                    )}
                    {pending !== null ? (
                      <>
                        <ReaderBubble text={pending} />
                        <p className="m-0 text-ui text-paper-dim">
                          <StatusDots label="Writing" />
                        </p>
                      </>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  sendDraft();
                }}
                className="shrink-0 border-t border-line-soft px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3"
              >
                {refusal ? (
                  <p role="alert" className="m-0 mb-2.5 text-small leading-snug text-paper">
                    {refusal}
                  </p>
                ) : null}
                <div
                  className={cn(
                    "flex items-end gap-2 rounded-card border bg-void py-1.5 pl-3.5 pr-1.5 transition-colors duration-[var(--dur-base)] ease-[var(--ease)]",
                    capped ? "border-line-soft" : "border-control-edge focus-within:border-indigo-lt",
                  )}
                >
                  <label htmlFor={boxId} className="sr-only">
                    Your question
                  </label>
                  <textarea
                    id={boxId}
                    ref={box}
                    rows={1}
                    value={draft}
                    maxLength={ASK_TEXT_MAX}
                    enterKeyHint="send"
                    disabled={capped}
                    placeholder="Ask about your chart"
                    aria-describedby={under ? usageId : undefined}
                    onChange={(event) => {
                      setDraft(event.target.value);
                      if (refusal) setRefusal(null);
                    }}
                    onKeyDown={onKey}
                    className="max-h-40 min-w-0 flex-1 resize-none self-center bg-transparent py-1.5 text-base leading-normal text-paper placeholder:text-muted focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
                  />
                  <Button type="submit" size="compact" disabled={!ready} className="shrink-0 disabled:cursor-not-allowed disabled:opacity-45">
                    Send
                  </Button>
                </div>
                {room ? (
                  <p aria-live="polite" className="m-0 mt-1 text-right text-xs text-muted">
                    {room}
                  </p>
                ) : null}
                <div className="mt-2 grid gap-0.5 text-center text-caption leading-snug">
                  {under ? (
                    <p id={usageId} aria-live="polite" className="m-0 text-paper-dim">
                      {under.line}
                    </p>
                  ) : null}
                  <Dialog.Description className="m-0 text-muted">
                    Ask is an AI. It answers from your chart and your reports.
                  </Dialog.Description>
                </div>
              </form>
            </motion.div>
          </Dialog.Content>
        </Dialog.Portal>
      )}
    </AnimatePresence>
  );
}
