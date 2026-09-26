/**
 * The recipient's side of the two verbs (ADR-38, ADR-120). A send hands over a
 * report someone had written about the reader, so it opens as theirs: the time
 * question comes first because a corrected time is the one free change (the
 * horizon pass), then "Is this you?" only when they already have a chart marked
 * as theirs, since only one can be. A gift is a credit, not a report (ADR-139):
 * its claim moves the held credit into the reader's balance and the dashboard
 * opens, with no birth form forced.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@clerk/react";
import { Loader2, AlertTriangle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetInvite,
  useClaimInvite,
  useListProfiles,
  useUpdateProfile,
  getGetInviteQueryKey,
  getListProfilesQueryKey,
  getListReportsQueryKey,
  getListRelationshipsQueryKey,
  getGetCreditsQueryKey,
  getGetCreditHistoryQueryKey,
  type InviteClaimResponse,
  type InvitePreview,
  type ProfileSummary,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { BirthTimeDialog } from "@/components/BirthTimeDialog";
import { StatusDots } from "@/components/StatusDots";
import { GiftCover } from "@/components/dashboard/GiftCover";
import { usePageTitle } from "@/lib/page-title";
import { COMPATIBILITY_REPORT, PERSONAL_REPORT } from "@/lib/product";

function getParam(name: string): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get(name);
}

function bornLine(p: Pick<ProfileSummary, "name" | "birthDate" | "birthPlace">): string {
  return `${p.name}, born ${p.birthDate} in ${p.birthPlace}.`;
}

export default function ClaimPage() {
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const { isLoaded, isSignedIn } = useAuth();
  const token = useMemo(() => getParam("token"), []);
  // The reader pressed Claim my report on a gift's cover before signing in; a second press on return would be one too many.
  const claimOnReturn = useMemo(() => getParam("claim") === "1", []);

  const [claimed, setClaimed] = useState<InviteClaimResponse | null>(null);
  const [step, setStep] = useState<"time" | "self">("time");

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
  usePageTitle(isGift ? "Your gift" : "Your report");

  const claim = useClaimInvite({
    mutation: {
      onSuccess: (data: InviteClaimResponse) => {
        qc.invalidateQueries({ queryKey: getListProfilesQueryKey() });
        qc.invalidateQueries({ queryKey: getListReportsQueryKey() });
        qc.invalidateQueries({ queryKey: getListRelationshipsQueryKey() });
        if ((data.kind ?? kind) === "gift") {
          qc.invalidateQueries({ queryKey: getGetCreditsQueryKey() });
          qc.invalidateQueries({ queryKey: getGetCreditHistoryQueryKey() });
        }
        setClaimed(data);
      },
    },
  });

  const sendProfileId = claimed && !isGift ? claimed.profileId : null;
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

  const afterTime = () => {
    if (askSelf) setStep("self");
    else leave();
  };

  // No chart to ask the time about: the time question has nothing to show, so the flow moves on.
  useEffect(() => {
    if (!claimed || isGift || step !== "time" || claimedProfile) return;
    if (sendProfileId && !profilesSettled) return;
    if (askSelf) setStep("self");
    else navigate(destination, { replace: true });
  }, [claimed, isGift, step, claimedProfile, sendProfileId, profilesSettled, askSelf, destination, navigate]);

  // Once per page load, or a hard failure (wrong account, expired) would claim again in a loop; Try again resets it.
  // A send claims on arrival as it always has; a gift shows its cover first and waits for Claim my report.
  const attemptedRef = useRef(false);
  const autoClaim = !isGift || claimOnReturn;
  useEffect(() => {
    if (!token || !isLoaded || !isSignedIn || !autoClaim) return;
    if (!inviteQ.data || inviteQ.data.alreadyClaimed) return;
    if (attemptedRef.current) return;
    if (claim.isPending || claim.isSuccess || claim.isError) return;
    attemptedRef.current = true;
    claim.mutate({ token });
  }, [token, isLoaded, isSignedIn, autoClaim, inviteQ.data, claim.isPending, claim.isSuccess, claim.isError, claim]);

  const claimGift = () => {
    if (!token || attemptedRef.current) return;
    attemptedRef.current = true;
    claim.mutate({ token });
  };

  const goSignIn = (thenClaim: boolean) => {
    const ret = `/claim?token=${encodeURIComponent(token ?? "")}${thenClaim ? "&claim=1" : ""}`;
    navigate(`/sign-in?return_to=${encodeURIComponent(ret)}`);
  };

  if (!token) {
    return (
      <Centered>
        <AlertTriangle className="h-8 w-8 text-amber-400 mx-auto mb-3" />
        <h1 className="font-display text-2xl mb-2">Missing invite token</h1>
        <p className="text-muted-foreground text-sm mb-5">
          This claim link is incomplete. Please use the link from your invitation.
        </p>
        <Button variant="outline" onClick={() => navigate("/")}>Go home</Button>
      </Centered>
    );
  }

  if (inviteQ.isLoading || !isLoaded) {
    return (
      <Centered>
        <Loader2 className="h-6 w-6 animate-spin text-primary/60 mx-auto mb-3" />
        <p className="text-muted-foreground">Loading your invitation…</p>
      </Centered>
    );
  }

  if (inviteQ.isError || !inviteQ.data) {
    return (
      <Centered>
        <AlertTriangle className="h-8 w-8 text-amber-400 mx-auto mb-3" />
        <h1 className="font-display text-2xl mb-2">Invite unavailable</h1>
        <p className="text-muted-foreground text-sm mb-5">
          This invite is invalid, expired, or already claimed.
        </p>
        <Button variant="outline" onClick={() => navigate("/")}>Go home</Button>
      </Centered>
    );
  }

  const inv: InvitePreview = inviteQ.data;
  const giver = inv.inviterName?.trim() || null;

  if (claimed && isGift) {
    return <GiftScreen inv={inv} giver={giver} claimed onDashboard={leave} />;
  }

  if (claimed) {
    if (step === "self" && sendProfileId) {
      return (
        <IsThisYou profileId={sendProfileId} profile={claimedProfile} name={inv.profileName} giver={giver} onAnswered={leave} />
      );
    }
    if (!claimedProfile) {
      return (
        <Centered>
          <Loader2 className="h-6 w-6 animate-spin text-primary/60 mx-auto mb-3" />
          <p className="text-muted-foreground">
            It's yours. {askSelf ? "Two questions" : "One question"} before you read…
          </p>
        </Centered>
      );
    }
    const blind = claimedProfile.horizon === "unknown";
    return (
      <Centered>
        {giver && <Eyebrow>From {giver}</Eyebrow>}
        <h1 className="font-display text-2xl mb-2">It's yours</h1>
        <p className="text-muted-foreground text-sm">
          {blind
            ? "The report was written without your birth time. Add it and the horizon is drawn. The report keeps every word it can and marks each change."
            : "Check the birth time before you read: a corrected time redraws the horizon and marks each change."}
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

  if (!isSignedIn) {
    // ADR-140: writing a report needs an account, and the claim binds to the invited email, so a gift is claimed signed in.
    if (isGift) return <GiftScreen inv={inv} giver={giver} signedOut onClaim={() => goSignIn(true)} />;
    return <SendPreview inv={inv} giver={giver} onSignIn={() => goSignIn(false)} />;
  }

  if (inv.alreadyClaimed) {
    return (
      <Centered>
        <AlertTriangle className="h-8 w-8 text-amber-400 mx-auto mb-3" />
        <h1 className="font-display text-2xl mb-2">Already claimed</h1>
        <p className="text-muted-foreground text-sm mb-5">
          This invitation has already been claimed and the link is no longer
          active.
        </p>
        <Button variant="outline" onClick={() => navigate("/dashboard")}>
          Go to dashboard
        </Button>
      </Centered>
    );
  }

  if (claim.isError) {
    const errMsg = claim.error instanceof Error ? claim.error.message : null;
    const lower = (errMsg ?? "").toLowerCase();
    let title = "Could not claim invite";
    let body = errMsg ?? "Please try again.";
    if (lower.includes("already") || lower.includes("conflict")) {
      title = "Already claimed";
      body = "This invitation has already been accepted by someone else.";
    } else if (lower.includes("expired")) {
      title = "Invite expired";
      body = "This invitation link has expired. Ask the sender for a new one.";
    } else if (lower.includes("recipient") || lower.includes("email")) {
      title = "Wrong account";
      body = `Sign in with ${inv.email} to accept this invitation.`;
    }
    return (
      <Centered>
        <AlertTriangle className="h-8 w-8 text-red-400 mx-auto mb-3" />
        <h1 className="font-display text-2xl mb-2">{title}</h1>
        <p className="text-muted-foreground text-sm mb-5 [overflow-wrap:anywhere]">{body}</p>
        <div className="flex gap-2 justify-center">
          <Button
            variant="outline"
            onClick={() => {
              attemptedRef.current = false;
              claim.reset();
            }}
          >
            Try again
          </Button>
          <Button variant="outline" onClick={() => navigate("/dashboard")}>
            Go to dashboard
          </Button>
        </div>
      </Centered>
    );
  }

  if (isGift) {
    return (
      <GiftScreen inv={inv} giver={giver} busy={claim.isPending || (claimOnReturn && claim.isIdle)} onClaim={claimGift} />
    );
  }

  return (
    <Centered>
      <Loader2 className="h-6 w-6 animate-spin text-primary/60 mx-auto mb-3" />
      <p className="text-muted-foreground">Claiming your invitation…</p>
    </Centered>
  );
}

function SendPreview({ inv, giver, onSignIn }: { inv: InvitePreview; giver: string | null; onSignIn: () => void }) {
  const pair = !!inv.relationshipId;
  return (
    <Centered>
      {giver && <Eyebrow>From {giver}</Eyebrow>}
      <h1 className="font-display text-2xl mb-2">Your {pair ? COMPATIBILITY_REPORT : PERSONAL_REPORT}</h1>
      <p className="text-muted-foreground text-sm mb-1">
        {giver ?? "Someone"} had it written for {pair ? "the two of you" : "you"}.
      </p>
      <p className="text-xs text-muted-foreground mb-5">
        Sign in with <span className="text-foreground [overflow-wrap:anywhere]">{inv.email}</span> {pair ? "to read it" : "and it's yours"}.
      </p>
      <Button onClick={onSignIn} data-testid="button-claim-signin">Sign in to open it</Button>
    </Centered>
  );
}

// The cover is its own card, so it stands on the page rather than inside another one.
function GiftScreen({
  inv, giver, claimed = false, signedOut = false, busy = false, onClaim, onDashboard,
}: {
  inv: InvitePreview;
  giver: string | null;
  claimed?: boolean;
  signedOut?: boolean;
  busy?: boolean;
  onClaim?: () => void;
  onDashboard?: () => void;
}) {
  // MB-6 provisional: true wherever credits are enforced (ADR-138); where the soft pass held none, nothing moved, and writing is free there.
  const creditLine = "The gift is now a credit in your balance, to use on any report.";
  return (
    <div className="min-h-[100dvh] bg-background text-foreground flex items-center justify-center px-4 py-10">
      <div className="max-w-md w-full flex flex-col items-center gap-5 text-center">
        <div className="w-full">
          <GiftCover giverName={giver} recipientName={inv.recipientName} note={inv.note} />
        </div>
        <h1 className="font-display text-2xl mt-3">{giver ?? "Someone"} gave you a {PERSONAL_REPORT}</h1>
        {claimed ? (
          <>
            <p id="gift-credit" className="text-muted-foreground text-sm">{creditLine}</p>
            {/* The Claim button this replaces had focus; without a new target it would fall to the page. */}
            <Button autoFocus aria-describedby="gift-credit" onClick={onDashboard}>Go to my dashboard</Button>
          </>
        ) : (
          <>
            {signedOut && (
              <p className="text-xs text-muted-foreground">
                Sign in with <span className="text-foreground [overflow-wrap:anywhere]">{inv.email}</span> to claim it.
              </p>
            )}
            <Button onClick={onClaim} disabled={busy} aria-busy={busy} data-testid="button-claim-gift">
              {busy ? <StatusDots label="Claiming" /> : "Claim my report"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

function IsThisYou({
  profileId, profile, name, giver, onAnswered,
}: {
  profileId: string;
  profile: ProfileSummary | null;
  name: string | null;
  giver: string | null;
  onAnswered: () => void;
}) {
  const qc = useQueryClient();
  const heading = useRef<HTMLHeadingElement>(null);
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
  // MB-103 provisional: Not me keeps the report as someone else's chart, as locked; the open row may hand it back instead.
  const answer = (claimedAsSelf: boolean) => update.mutate({ id: profileId, data: { claimedAsSelf } });
  const facts = profile ? bornLine(profile) : name;
  return (
    <Centered>
      {giver && <Eyebrow>From {giver}</Eyebrow>}
      <h1 ref={heading} tabIndex={-1} className="font-display text-2xl mb-2 focus:outline-none">Is this you?</h1>
      {facts && <p className="text-sm mb-1">{facts}</p>}
      <p className="text-muted-foreground text-sm mb-5">
        You already have a chart marked as yours. Choose This is me to mark this one instead.
      </p>
      <div className="flex flex-wrap gap-2 justify-center">
        <Button onClick={() => answer(true)} disabled={update.isPending}>This is me</Button>
        <Button variant="outline" onClick={() => answer(false)} disabled={update.isPending}>Not me</Button>
      </div>
      {update.isError && (
        <p role="alert" className="text-xs text-destructive mt-4">
          Your answer didn't save, so nothing changed. Try again.
        </p>
      )}
    </Centered>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="font-label text-xs tracking-[0.2em] uppercase text-primary/80 mb-3">{children}</p>;
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] bg-background bg-stars text-foreground flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center p-8 rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm">
        {children}
      </div>
    </div>
  );
}
