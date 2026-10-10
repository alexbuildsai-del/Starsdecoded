/**
 * The recipient's side of the three verbs (ADR-38, ADR-120, ADR-235). A send
 * hands over a report someone had written about the reader, so it opens as
 * theirs: the time question comes first because a corrected time is the one
 * free change (the horizon pass), then "Is this you?" only when they already
 * have a chart marked as theirs, since only one can be; Not me hands it back to
 * whoever sent it (ADR-236). A gift is a credit, not a report (ADR-139): its
 * claim moves the held credit into the reader's balance and the dashboard
 * opens, with no birth form forced. Its claim carries the reader's one answer
 * about their own report (ADR-331), so the gift asks before it is taken. A
 * share is the sharer's own Personal report to read and never a hand-over, so
 * its claim opens the dashboard with the sharer in the circle and offers Share
 * yours back there (ADR-235).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useAuth, useClerk, useUser } from "@clerk/react";
import { AlertTriangle } from "lucide-react";
import { useMutationState, useQueryClient } from "@tanstack/react-query";
import {
  useGetInvite,
  useClaimInvite,
  useListProfiles,
  useShareBack,
  useUpdateProfile,
  getGetHomeQueryKey,
  getGetInviteQueryKey,
  getHandBackProfileMutationKey,
  getListProfilesQueryKey,
  getListReportsQueryKey,
  getListRelationshipsQueryKey,
  getListSharesQueryKey,
  getGetCreditsQueryKey,
  getGetCreditHistoryQueryKey,
  type ClaimInviteBody,
  type HandBackProfileMutationVariables,
  type InviteClaimResponse,
  type InvitePreview,
  type ProfileSummary,
} from "@workspace/api-client-react";
import { Button } from "@/ds/atoms/Button";
import { Eyebrow as KickerEyebrow } from "@/ds/atoms/Eyebrow";
import { Card } from "@/ds/molecules/Card";
import { ToastAction } from "@/components/ui/toast";
import { BirthTimeDialog } from "@/components/BirthTimeDialog";
import { ClerkStalled } from "@/components/ClerkStalled";
import { StatusDots } from "@/ds/atoms/StatusDots";
import { GiftCover } from "@/components/dashboard/GiftCover";
import { HandBackDialog } from "@/components/dashboard/HandBackDialog";
import { toast } from "@/hooks/use-toast";
import { usePageTitle } from "@/lib/page-title";
import { COMPATIBILITY_REPORT, PERSONAL_REPORT } from "@/lib/product";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function getParam(name: string): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get(name);
}

function bornLine(p: Pick<ProfileSummary, "name" | "birthDate" | "birthPlace">): string {
  return `${p.name}, born ${p.birthDate} in ${p.birthPlace}.`;
}

// The claim compares addresses trimmed and in any case, so the page does too and both call the same account wrong.
function sameAddress(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

// A title, two sentences and a choice take longer to read than a plain toast's 5 s; the sharer's quick look keeps the
// offer once it goes.
const OFFER_MS = 12_000;

// The circle's teal for a shared seat, so the toast reads as being about the seat it names (the approved artifact).
const SHARED_TOAST = "border-teal";

/**
 * Said on the dashboard the claim opens, so the reader sees whose report it is beside its sharer's seat. Share yours
 * back is one tap with no email, since both people are known, so what it gives is named before the tap (ADR-139).
 */
function welcomeShare(sharer: string | null, profileId: string | null, offerBack: boolean) {
  const title = `${sharer ?? "Someone"} shared their ${PERSONAL_REPORT} with you`;
  if (!offerBack || !profileId) {
    toast({ title, className: SHARED_TOAST });
    return;
  }
  toast({
    title,
    description: `Share yours back and ${sharer ?? "they"} can read your ${PERSONAL_REPORT}, with your birth date, time and place. You can stop sharing any time.`,
    duration: OFFER_MS,
    className: `${SHARED_TOAST} flex-col items-stretch gap-3 space-x-0`,
    action: <ShareBackAction profileId={profileId} sharer={sharer} />,
  });
}

/** It sits in the toast, which outlives the claim page, so it holds its own call. */
function ShareBackAction({ profileId, sharer }: { profileId: string; sharer: string | null }) {
  const qc = useQueryClient();
  const back = useShareBack({
    mutation: {
      onSuccess: () => {
        void qc.invalidateQueries({ queryKey: getGetHomeQueryKey() });
        void qc.invalidateQueries({ queryKey: getListSharesQueryKey() });
        toast({ title: `${sharer ?? "They"} can read your ${PERSONAL_REPORT} now` });
      },
      onError: (err) => {
        // The circle is read again, so the quick look offers it only while it still stands.
        void qc.invalidateQueries({ queryKey: getGetHomeQueryKey() });
        if (err.data?.error === "already_shared") toast({ title: `${sharer ?? "They"} can already read your ${PERSONAL_REPORT}` });
      },
    },
  });
  // A 404 or 409 is a refusal another tap would meet again, so it is said in the server's words and the button goes.
  const refused = back.error?.status === 404 || back.error?.status === 409;
  return (
    <div className="grid gap-2">
      {back.isError && (
        <p role="alert" className="text-ui text-error">
          {(refused && back.error?.data?.message) || "We couldn't share yours. Try again in a minute."}
        </p>
      )}
      {!refused && (
        <ToastAction
          altText={`To share yours back, open ${sharer ?? "their seat"} in your circle.`}
          disabled={back.isPending}
          onClick={(event) => {
            // An action closes its toast; this one stays while the share goes, so the tap is seen working.
            event.preventDefault();
            back.mutate({ data: { profileId } });
          }}
          className="h-10 w-full"
        >
          {back.isPending ? <StatusDots label="Sharing" /> : "Share yours back"}
        </ToastAction>
      )}
    </div>
  );
}

/** Handing back ends the claim, and a 404 or 409 says it had already ended, as when another tab handed it back first. */
function claimEnded(error: unknown): boolean {
  const status = (error as { status?: unknown } | null)?.status;
  return status === 404 || status === 409;
}

export default function ClaimPage() {
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const { signOut } = useClerk();
  const token = useMemo(() => getParam("token"), []);
  // The reader pressed Claim my report on a gift's cover before signing in; a second press on return would be one too many.
  const claimOnReturn = useMemo(() => getParam("claim") === "1", []);

  const [claimed, setClaimed] = useState<InviteClaimResponse | null>(null);
  const [step, setStep] = useState<"time" | "self">("time");
  // A gift's share question shows once Claim my report is pressed, here or before signing in, and its answer claims.
  const [asking, setAsking] = useState(claimOnReturn);

  const inviteQ = useGetInvite(token ?? "", {
    query: {
      queryKey: getGetInviteQueryKey(token ?? ""),
      // A claimed token previews as used, so a refetch would swap the rest of the flow for "Already claimed".
      enabled: !!token && !claimed,
      retry: false,
    },
  });
  const kind = claimed?.kind ?? inviteQ.data?.kind ?? "send";
  const isGift = kind === "gift";
  const isShare = kind === "share";
  usePageTitle(isGift ? "Your gift" : isShare ? "Shared with you" : "Your report");

  const claim = useClaimInvite({
    mutation: {
      onSuccess: (data: InviteClaimResponse) => {
        qc.invalidateQueries({ queryKey: getListProfilesQueryKey() });
        qc.invalidateQueries({ queryKey: getListReportsQueryKey() });
        qc.invalidateQueries({ queryKey: getListRelationshipsQueryKey() });
        // The circle is GET /home's, and a claim changes who sits in it.
        qc.invalidateQueries({ queryKey: getGetHomeQueryKey() });
        const claimedKind = data.kind ?? kind;
        if (claimedKind === "gift") {
          qc.invalidateQueries({ queryKey: getGetCreditsQueryKey() });
          qc.invalidateQueries({ queryKey: getGetCreditHistoryQueryKey() });
        }
        setClaimed(data);
        if (claimedKind === "share") {
          welcomeShare(inviteQ.data?.inviterName?.trim() || null, data.profileId, !!data.shareBack);
          navigate("/dashboard", { replace: true });
        }
      },
    },
  });

  const sendProfileId = claimed && kind === "send" ? claimed.profileId : null;
  const profilesQ = useListProfiles({ query: { queryKey: getListProfilesQueryKey(), enabled: !!sendProfileId } });
  const claimedProfile = useMemo(
    () => (sendProfileId && Array.isArray(profilesQ.data) ? profilesQ.data.find((p) => p.id === sendProfileId) ?? null : null),
    [sendProfileId, profilesQ.data],
  );
  // A list cached before the claim lacks the chart just claimed; only a fetch after it can say the chart is missing.
  const profilesSettled = profilesQ.isFetchedAfterMount && !profilesQ.isFetching;
  // MB-59 provisional: the claim lands on the report as it stands and never writes one.
  const destination = claimed?.redirectTo ?? "/dashboard";
  const askSelf = !!claimed?.askSelf && !!sendProfileId;
  // Back from the report should not reopen a link that is now spent.
  const leave = () => navigate(destination, { replace: true });
  // A chart handed back is no longer the reader's to open, so the dashboard rather than its report.
  const leaveHandedBack = useCallback(() => navigate("/dashboard", { replace: true }), [navigate]);

  const afterTime = () => {
    if (askSelf) setStep("self");
    else leave();
  };

  // No chart to ask the time about: the time question has nothing to show, so the flow moves on.
  useEffect(() => {
    if (!claimed || kind !== "send" || step !== "time" || claimedProfile) return;
    if (sendProfileId && !profilesSettled) return;
    if (askSelf) setStep("self");
    else navigate(destination, { replace: true });
  }, [claimed, kind, step, claimedProfile, sendProfileId, profilesSettled, askSelf, destination, navigate]);

  // The address the claim is checked against (the account's primary, else its first), which is the one it signed in with:
  // the page names the account by it and by nothing it never gave (R15-18, R15-19's lesson). Unknown, the server decides.
  const accountEmail = user?.primaryEmailAddress?.emailAddress ?? user?.emailAddresses[0]?.emailAddress ?? null;
  const invitedEmail = inviteQ.data?.email ?? null;
  // B-51: an account the claim would refuse is told so before it claims, rather than after a 403.
  const wrongAccount = !!isSignedIn && !!accountEmail && !!invitedEmail && !sameAddress(accountEmail, invitedEmail);

  // Once per page load, or a hard failure (wrong account, expired) would claim again in a loop; Try again resets it.
  // A send or a share claims on arrival, as a send always has; a gift claims with the answer to its share question.
  const attemptedRef = useRef(false);
  useEffect(() => {
    if (!token || !isLoaded || !isSignedIn || isGift || wrongAccount) return;
    if (!inviteQ.data || inviteQ.data.alreadyClaimed) return;
    if (attemptedRef.current) return;
    if (claim.isPending || claim.isSuccess || claim.isError) return;
    attemptedRef.current = true;
    claim.mutate({ token });
  }, [token, isLoaded, isSignedIn, isGift, wrongAccount, inviteQ.data, claim.isPending, claim.isSuccess, claim.isError, claim]);

  // Each answer is sent as it was given, so Not now is a stated false (ADR-331).
  const answerGift = (shareBack: boolean) => {
    if (!token || attemptedRef.current) return;
    attemptedRef.current = true;
    const data: ClaimInviteBody = { shareBack };
    claim.mutate({ token, data });
  };

  const goSignIn = (thenClaim: boolean) => {
    const ret = `/claim?token=${encodeURIComponent(token ?? "")}${thenClaim ? "&claim=1" : ""}`;
    navigate(`/sign-in?return_to=${encodeURIComponent(ret)}`);
  };

  // Signing in again is the only way past a wrong account, so Sign out goes straight on to it and back to this link.
  const switchAccount = () => {
    const ret = `/claim?token=${encodeURIComponent(token ?? "")}${isGift ? "&claim=1" : ""}`;
    void signOut({ redirectUrl: `${basePath}/sign-in?return_to=${encodeURIComponent(ret)}` });
  };

  if (!token) {
    return (
      <Centered>
        <AlertTriangle className="h-8 w-8 text-brass mx-auto mb-3" />
        <h1 className="font-display text-sheet-title mb-2">Missing invite token</h1>
        <p className="text-paper-dim text-ui mb-5">
          This claim link is incomplete. Please use the link from your invitation.
        </p>
        <Button variant="secondary" onClick={() => navigate("/")}>Go home</Button>
      </Centered>
    );
  }

  if (inviteQ.isLoading) {
    return (
      <Centered>
        <p className="text-paper-dim"><StatusDots label="Loading your invitation…" /></p>
      </Centered>
    );
  }

  if (inviteQ.isError || !inviteQ.data) {
    return (
      <Centered>
        <AlertTriangle className="h-8 w-8 text-brass mx-auto mb-3" />
        <h1 className="font-display text-sheet-title mb-2">Invite unavailable</h1>
        <p className="text-paper-dim text-ui mb-5">
          This link doesn't work. It may have expired or already been used.
        </p>
        <Button variant="secondary" onClick={() => navigate("/")}>Go home</Button>
      </Centered>
    );
  }

  const inv: InvitePreview = inviteQ.data;
  const giver = inv.inviterName?.trim() || null;

  if (claimed && isGift) {
    return <GiftScreen inv={inv} giver={giver} claimed onDashboard={leave} />;
  }

  // The claim has already sent the reader to the dashboard; this shows only for the moment before it opens.
  if (claimed && isShare) {
    return (
      <Centered>
        <p className="text-paper-dim"><StatusDots label="Opening your dashboard…" /></p>
      </Centered>
    );
  }

  // A pair sent on the chart its reader keeps hands nothing over (ADR-285), so there is no time question to ask: the
  // effect above is already taking them to the pair.
  if (claimed && kind === "send" && claimed.profileId === null) {
    return (
      <Centered>
        <p className="text-paper-dim"><StatusDots label={`Opening your ${COMPATIBILITY_REPORT}…`} /></p>
      </Centered>
    );
  }

  if (claimed) {
    if (step === "self" && sendProfileId) {
      return (
        <IsThisYou
          profileId={sendProfileId}
          profile={claimedProfile}
          name={inv.profileName}
          giver={giver}
          onAnswered={leave}
          onHandedBack={leaveHandedBack}
        />
      );
    }
    if (!claimedProfile) {
      return (
        <Centered>
          <p className="text-paper-dim"><StatusDots label={`It's yours. ${askSelf ? "Two questions" : "One question"} before you read…`} /></p>
        </Centered>
      );
    }
    const blind = claimedProfile.horizon === "unknown";
    return (
      <Centered>
        {giver && <Eyebrow>From {giver}</Eyebrow>}
        <h1 className="font-display text-sheet-title mb-2">It's yours</h1>
        <p className="text-paper-dim text-ui">
          {blind
            ? "The report was written without your birth time. Add it and we update your rising sign and houses. The report keeps every word it can. We'll show you what changed."
            : "Check the birth time before you read: a corrected time updates your rising sign and houses, and we'll show you what changed."}
        </p>
        <BirthTimeDialog
          open
          onClose={afterTime}
          title={blind ? "Do you know your birth time?" : "Is this your birth time?"}
          description={bornLine(claimedProfile)}
          profile={{
            id: claimedProfile.id, name: claimedProfile.name, birthDate: claimedProfile.birthDate, birthTime: claimedProfile.birthTime,
            birthTimeWindowMinutes: claimedProfile.birthTimeWindowMinutes ?? 0, birthPlace: claimedProfile.birthPlace,
            latitude: claimedProfile.latitude, longitude: claimedProfile.longitude,
            timezone: claimedProfile.timezone, timezoneOffset: claimedProfile.timezoneOffset,
          }}
        />
      </Centered>
    );
  }

  // B-50: a used link says so before any sign-in, since signing in can't open it again.
  if (inv.alreadyClaimed) {
    return (
      <Centered>
        <AlertTriangle className="h-8 w-8 text-brass mx-auto mb-3" />
        <h1 className="font-display text-sheet-title mb-2">Already claimed</h1>
        <p className="text-paper-dim text-ui mb-5">
          {isGift ? "This gift has already been claimed. Its link no longer works." : "This link has already been used. It no longer works."}
        </p>
        {isSignedIn ? (
          <Button variant="secondary" onClick={() => navigate("/dashboard")}>
            Go to dashboard
          </Button>
        ) : (
          <Button variant="secondary" onClick={() => navigate("/")}>
            Go home
          </Button>
        )}
      </Centered>
    );
  }

  if (!isSignedIn) {
    // ADR-140: writing a report needs an account, and the claim binds to the invited email, so a gift is claimed signed in.
    // The preview needs only the public GET, so it never waits for Clerk (MB-183). Its button does: a reader who turns out
    // to be signed in claims from here rather than signing in.
    const waiting = !isLoaded;
    if (isGift) return <GiftScreen inv={inv} giver={giver} signedOut waiting={waiting} onClaim={() => goSignIn(true)} />;
    if (isShare) return <SharePreview inv={inv} giver={giver} waiting={waiting} onSignIn={() => goSignIn(false)} />;
    return <SendPreview inv={inv} giver={giver} waiting={waiting} onSignIn={() => goSignIn(false)} />;
  }

  if (wrongAccount || (claim.isError && claim.error?.data?.error === "wrong_recipient")) {
    return (
      <WrongAccount
        kind={kind}
        // A 403 can still meet an account whose address reads as the invited one; then it is named by nothing.
        account={accountEmail && !sameAddress(accountEmail, inv.email) ? accountEmail : null}
        invited={inv.email}
        onSignOut={switchAccount}
        onDashboard={() => navigate("/dashboard")}
      />
    );
  }

  if (claim.isError) {
    // The API's own line, never the client's "HTTP 403 Forbidden: ..." wrapper; a network or server failure has none.
    const code = claim.error?.data?.error;
    const status = claim.error?.status;
    const told = typeof claim.error?.data?.message === "string" && claim.error.data.message ? claim.error.data.message : null;
    let title = "Could not claim invite";
    let body = told ?? "Please try again.";
    // Every 409 names its status "Conflict", so a sharer opening the link to their own report is told so by its code.
    if (code === "own_chart") {
      title = "This is your own report";
      body = "You shared it from this account, so there's nothing to claim. It's on your dashboard.";
    } else if (code === "already_claimed") {
      title = "Already claimed";
      body = "This invitation has already been accepted by someone else.";
    } else if (code === "expired") {
      title = "Invite expired";
      body = "This invitation link has expired. Ask the sender for a new one.";
    } else if (code === "wrong_person") {
      title = "Wrong account";
    }
    // A refusal meets the same answer however often it is asked (B-51); only a failure on the way or on our side may not.
    const retry = !status || status >= 500;
    return (
      <Centered>
        <AlertTriangle className="h-8 w-8 text-error mx-auto mb-3" />
        <h1 className="font-display text-sheet-title mb-2">{title}</h1>
        <p className="text-paper-dim text-ui mb-5 [overflow-wrap:anywhere]">{body}</p>
        <div className="flex gap-2 justify-center">
          {retry && (
            <Button
              variant="secondary"
              onClick={() => {
                attemptedRef.current = false;
                claim.reset();
              }}
            >
              Try again
            </Button>
          )}
          <Button variant="secondary" onClick={() => navigate("/dashboard")}>
            Go to dashboard
          </Button>
        </div>
      </Centered>
    );
  }

  if (isGift) {
    const sending = claim.isPending ? (claim.variables?.data?.shareBack ?? false) : null;
    return (
      <GiftScreen
        inv={inv}
        giver={giver}
        asking={asking}
        sending={sending}
        onClaim={() => setAsking(true)}
        onAnswer={answerGift}
      />
    );
  }

  return (
    <Centered>
      <p className="text-paper-dim"><StatusDots label="Claiming your invitation…" /></p>
    </Centered>
  );
}

function SendPreview({
  inv, giver, waiting, onSignIn,
}: {
  inv: InvitePreview;
  giver: string | null;
  waiting: boolean;
  onSignIn: () => void;
}) {
  const pair = !!inv.relationshipId;
  return (
    <Centered>
      {giver && <Eyebrow>From {giver}</Eyebrow>}
      <h1 className="font-display text-sheet-title mb-2">Your {pair ? COMPATIBILITY_REPORT : PERSONAL_REPORT}</h1>
      <p className="text-paper-dim text-ui mb-1">
        {giver ?? "Someone"} had it written for {pair ? "the two of you" : "you"}.
      </p>
      <p className="text-caption text-paper-dim mb-5">
        Sign in with <span className="text-paper [overflow-wrap:anywhere]">{inv.email}</span> {pair ? "to read it" : "and it's yours"}.
      </p>
      <Button onClick={onSignIn} disabled={waiting} data-testid="button-claim-signin">Sign in to open it</Button>
    </Centered>
  );
}

/** What a share gives before the reader signs in: the whole report to read and its sharer in their circle (ADR-235). */
function SharePreview({
  inv, giver, waiting, onSignIn,
}: {
  inv: InvitePreview;
  giver: string | null;
  waiting: boolean;
  onSignIn: () => void;
}) {
  return (
    <Centered>
      <h1 className="font-display text-sheet-title text-balance mb-2">{giver ?? "Someone"} shared their {PERSONAL_REPORT} with you</h1>
      <p className="text-paper-dim text-ui mb-1">
        {giver ? `${giver} joins` : "They join"} your circle, and you can read the whole report.
      </p>
      <p className="text-caption text-paper-dim mb-5">
        Sign in with <span className="text-paper [overflow-wrap:anywhere]">{inv.email}</span> to read it.
      </p>
      <Button onClick={onSignIn} disabled={waiting} data-testid="button-claim-signin">Sign in to open it</Button>
    </Centered>
  );
}

// The cover is its own card, so it stands on the page rather than inside another one.
function GiftScreen({
  inv, giver, claimed = false, signedOut = false, waiting = false, asking = false, sending = null, onClaim, onAnswer,
  onDashboard,
}: {
  inv: InvitePreview;
  giver: string | null;
  claimed?: boolean;
  signedOut?: boolean;
  waiting?: boolean;
  asking?: boolean;
  /** The answer whose claim is on its way, else null. */
  sending?: boolean | null;
  onClaim?: () => void;
  onAnswer?: (shareBack: boolean) => void;
  onDashboard?: () => void;
}) {
  // MB-6 provisional: true wherever credits are enforced (ADR-138); where the soft pass held none, nothing moved, and writing is free there.
  const creditLine = "The gift is now a credit in your balance, to use on any report.";
  return (
    <div className="min-h-[100dvh] bg-ground text-paper flex items-center justify-center px-4 py-10">
      <div className="max-w-md w-full flex flex-col items-center gap-5 text-center">
        <div className="w-full">
          <GiftCover giverName={giver} recipientName={inv.recipientName} note={inv.note} />
        </div>
        <h1 className="font-display text-sheet-title mt-3">{giver ?? "Someone"} gave you a {PERSONAL_REPORT}</h1>
        {claimed ? (
          <>
            <p id="gift-credit" className="text-paper-dim text-ui">{creditLine}</p>
            {/* The Claim button this replaces had focus; without a new target it would fall to the page. */}
            <Button autoFocus aria-describedby="gift-credit" onClick={onDashboard}>Go to my dashboard</Button>
          </>
        ) : asking && onAnswer ? (
          <ShareQuestion giver={giver} giverShares={!!inv.giverShares} sending={sending} onAnswer={onAnswer} />
        ) : (
          <>
            {signedOut && (
              <p className="text-caption text-paper-dim">
                Sign in with <span className="text-paper [overflow-wrap:anywhere]">{inv.email}</span> to claim it.
              </p>
            )}
            <Button onClick={onClaim} disabled={waiting} data-testid="button-claim-gift">
              Claim my report
            </Button>
          </>
        )}
        <ClerkStalled className="max-w-sm" />
      </div>
    </div>
  );
}

/**
 * The gift's one question to its reader, about their own report only (ADR-331); when the giver shared first it is
 * ADR-235's Share yours back. A gift's reader may have no report yet, so a Yes waits until theirs is ready. What a Yes
 * gives is named before the tap (ADR-139), and neither answer is picked for them.
 */
function ShareQuestion({
  giver, giverShares, sending, onAnswer,
}: {
  giver: string | null;
  giverShares: boolean;
  sending: boolean | null;
  onAnswer: (shareBack: boolean) => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  // The question takes focus as it replaces the button pressed, so a stray Enter gives no answer (R14-12's lesson).
  useEffect(() => {
    heading.current?.focus();
  }, []);
  const busy = sending !== null;
  return (
    <section aria-labelledby="gift-share-question" className="w-full grid gap-3">
      {giverShares && <p className="text-ui">{giver ?? "Someone"} shared their report with you.</p>}
      <h2
        id="gift-share-question"
        ref={heading}
        tabIndex={-1}
        className="font-display text-card-title text-balance focus:outline-none [overflow-wrap:anywhere]"
      >
        {giverShares ? "Share yours back when it's ready?" : `Share your report with ${giver ?? "them"} when it's ready?`}
      </h2>
      <p className="text-paper-dim text-ui">
        {`${giver ?? "They"} can then read your whole ${PERSONAL_REPORT}, with your birth date, time and place. You can stop sharing any time.`}
      </p>
      <div className="grid gap-2.5 mt-2">
        <Button
          full
          disabled={busy}
          aria-busy={sending === true}
          onClick={() => onAnswer(true)}
          data-testid="button-claim-share-yes"
        >
          {sending === true ? <StatusDots label="Claiming" /> : "Yes, share my report"}
        </Button>
        <Button
          variant="secondary"
          full
          disabled={busy}
          aria-busy={sending === false}
          onClick={() => onAnswer(false)}
          data-testid="button-claim-share-no"
        >
          {sending === false ? <StatusDots label="Claiming" /> : "Not now"}
        </Button>
      </div>
    </section>
  );
}

/**
 * B-51: who is signed in, by the address they signed in with, and the address the link was sent to; Sign out goes on to
 * signing in, since no other tap here could claim it.
 */
function WrongAccount({
  kind, account, invited, onSignOut, onDashboard,
}: {
  kind: string;
  account: string | null;
  invited: string;
  onSignOut: () => void;
  onDashboard: () => void;
}) {
  const what = kind === "gift" ? "This gift was sent to" : kind === "share" ? "This report was shared with" : "This report was sent to";
  return (
    <Centered>
      <AlertTriangle className="h-8 w-8 text-brass mx-auto mb-3" />
      <h1 className="font-display text-sheet-title mb-2">Wrong account</h1>
      <p className="text-ui mb-1 [overflow-wrap:anywhere]" data-testid="text-claim-account">
        {account ? (
          <>
            You're signed in as <span className="text-paper">{account}</span>.
          </>
        ) : (
          "You're signed in with another account."
        )}
      </p>
      <p className="text-paper-dim text-ui mb-5 [overflow-wrap:anywhere]">
        {what} <span className="text-paper">{invited}</span>. Sign out, then sign in with that address.
      </p>
      <div className="flex flex-wrap gap-2 justify-center">
        <Button onClick={onSignOut} data-testid="button-claim-sign-out">Sign out</Button>
        <Button variant="secondary" onClick={onDashboard}>
          Go to dashboard
        </Button>
      </div>
    </Centered>
  );
}

function IsThisYou({
  profileId, profile, name, giver, onAnswered, onHandedBack,
}: {
  profileId: string;
  profile: ProfileSummary | null;
  name: string | null;
  giver: string | null;
  onAnswered: () => void;
  onHandedBack: () => void;
}) {
  const qc = useQueryClient();
  const heading = useRef<HTMLHeadingElement>(null);
  const [handBack, setHandBack] = useState<{ profileId: string; giverFirstName: string } | null>(null);
  // The dialog makes the call and closes alike on Cancel and once it is done, so the outcome is read off the call itself.
  const handedBack = useMutationState({
    filters: {
      mutationKey: getHandBackProfileMutationKey(),
      predicate: (m) => (m.state.variables as HandBackProfileMutationVariables | undefined)?.id === profileId,
    },
    select: (m) => m.state.status === "success" || (m.state.status === "error" && claimEnded(m.state.error)),
  }).some(Boolean);
  useEffect(() => {
    if (handedBack) onHandedBack();
  }, [handedBack, onHandedBack]);
  // The time dialog hands focus back to the page a tick after it closes; the question takes it after that, so a screen
  // reader starts here.
  useEffect(() => {
    const t = setTimeout(() => heading.current?.focus(), 0);
    return () => clearTimeout(t);
  }, []);
  const update = useUpdateProfile({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListProfilesQueryKey() });
        qc.invalidateQueries({ queryKey: getListReportsQueryKey() });
        qc.invalidateQueries({ queryKey: getListRelationshipsQueryKey() });
        onAnswered();
      },
    },
  });
  const facts = profile ? bornLine(profile) : name;
  return (
    <Centered>
      {giver && <Eyebrow>From {giver}</Eyebrow>}
      <h1 ref={heading} tabIndex={-1} className="font-display text-sheet-title mb-2 focus:outline-none">Is this you?</h1>
      {facts && <p className="text-ui mb-1">{facts}</p>}
      <p className="text-paper-dim text-ui mb-5">
        You already have a chart marked as yours. Choose This is me to mark this one instead.
      </p>
      <div className="flex flex-wrap gap-2 justify-center">
        <Button onClick={() => update.mutate({ id: profileId, data: { claimedAsSelf: true } })} disabled={update.isPending}>
          This is me
        </Button>
        <Button
          variant="secondary"
          onClick={() => setHandBack({ profileId, giverFirstName: giver ?? profile?.giverName?.trim() ?? "" })}
          disabled={update.isPending}
        >
          Not me
        </Button>
      </div>
      {update.isError && (
        <p role="alert" className="text-caption text-error mt-4">
          Your answer didn't save, so nothing changed. Try again.
        </p>
      )}
      <HandBackDialog target={handBack} onClose={() => setHandBack(null)} />
    </Centered>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <KickerEyebrow kind="kicker" className="mb-3 block">{children}</KickerEyebrow>;
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] bg-ground bg-stars text-paper flex items-center justify-center px-4">
      <Card as="div" variant="glass" large className="block w-full max-w-md p-8 text-center">
        {children}
        <ClerkStalled className="mt-6 border-t border-line pt-5" />
      </Card>
    </div>
  );
}
