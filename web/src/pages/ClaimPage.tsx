/**
 * Claiming a gifted report (ADR-38): the recipient signs in, the claim runs
 * once, and before the report opens the three-way time question is asked,
 * once. Adding or correcting the time is the horizon pass, free the first
 * time; "Not now" keeps what the giver entered. The giver keeps read access.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@clerk/react";
import { Loader2, Heart, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useGetInvite,
  useClaimInvite,
  useListProfiles,
  getGetInviteQueryKey,
  getListProfilesQueryKey,
  getListReportsQueryKey,
  getListRelationshipsQueryKey,
  type InviteClaimResponse,
  type InvitePreview,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { BirthTimeDialog } from "@/components/BirthTimeDialog";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  return params.get("token");
}

export default function ClaimPage() {
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const { isLoaded, isSignedIn } = useAuth();
  const token = useMemo(() => getToken(), []);

  const inviteQ = useGetInvite(token ?? "", {
    query: {
      queryKey: getGetInviteQueryKey(token ?? ""),
      enabled: !!token,
      retry: false,
    },
  });

  // The claim lands here first; the time question follows, then the redirect.
  const [claimed, setClaimed] = useState<InviteClaimResponse | null>(null);
  const claim = useClaimInvite({
    mutation: {
      onSuccess: (data: InviteClaimResponse) => {
        qc.invalidateQueries({ queryKey: getListProfilesQueryKey() });
        qc.invalidateQueries({ queryKey: getListReportsQueryKey() });
        qc.invalidateQueries({ queryKey: getListRelationshipsQueryKey() });
        setClaimed(data);
      },
    },
  });
  const profilesQ = useListProfiles({ query: { queryKey: getListProfilesQueryKey(), enabled: !!claimed } });
  const claimedProfile = useMemo(
    () => (claimed && Array.isArray(profilesQ.data) ? profilesQ.data.find((p) => p.id === claimed.profileId) ?? null : null),
    [claimed, profilesQ.data],
  );
  const destination = claimed?.redirectTo ?? "/dashboard";

  // Auto-claim once signed in and invite is loaded — but exactly
  // ONCE per page load. We guard with a ref so a hard failure
  // (already-claimed, wrong recipient, expired) doesn't trigger an
  // infinite re-mutate loop. The user can manually retry from the
  // error state's "Try again" button below.
  const attemptedRef = useRef(false);
  useEffect(() => {
    if (!token) return;
    if (!isLoaded || !isSignedIn) return;
    if (!inviteQ.data) return;
    if (inviteQ.data.alreadyClaimed) return;
    if (attemptedRef.current) return;
    if (claim.isPending || claim.isSuccess || claim.isError) return;
    attemptedRef.current = true;
    claim.mutate({ token });
  }, [
    token,
    isLoaded,
    isSignedIn,
    inviteQ.data,
    claim.isPending,
    claim.isSuccess,
    claim.isError,
    claim,
  ]);

  const goSignIn = () => {
    const ret = `/claim?token=${encodeURIComponent(token ?? "")}`;
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

  const inv: InvitePreview | undefined = inviteQ.data;

  if (!isSignedIn) {
    return (
      <Centered>
        <Heart className="h-8 w-8 text-primary mx-auto mb-3" />
        <h1 className="font-display text-2xl mb-2">
          You've been invited
        </h1>
        <p className="text-muted-foreground text-sm mb-1">
          <span className="text-foreground">{inv.inviterName ?? "Someone"}</span> wants to share
          {" "}
          {inv.relationshipId ? (
            <>their reading with <span className="text-foreground">{inv.profileName}</span></>
          ) : (
            <>the chart for <span className="text-foreground">{inv.profileName}</span></>
          )}{" "}
          with you.
        </p>
        <p className="text-xs text-muted-foreground mb-5">
          Sign in with <span className="text-foreground">{inv.email}</span> to claim it.
        </p>
        <Button
          onClick={goSignIn}
          className="gradient-primary text-white border-0"
          data-testid="button-claim-signin"
        >
          Sign in to claim
        </Button>
      </Centered>
    );
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

  if (claimed) {
    if (profilesQ.isLoading) {
      return (
        <Centered>
          <Loader2 className="h-6 w-6 animate-spin text-primary/60 mx-auto mb-3" />
          <p className="text-muted-foreground">It's yours. One question before you read…</p>
        </Centered>
      );
    }
    if (!claimedProfile) {
      navigate(destination);
      return null;
    }
    const blind = claimedProfile.horizon === "unknown";
    return (
      <Centered>
        <Heart className="h-8 w-8 text-primary mx-auto mb-3" />
        <h1 className="font-display text-2xl mb-2">It's yours</h1>
        <p className="text-muted-foreground text-sm mb-5">
          {blind
            ? "The report was written without your birth time. Add it and the horizon is drawn; the report keeps every word it can and marks each change."
            : "Check the birth time before you read: a corrected time redraws the horizon and marks each change."}
        </p>
        <BirthTimeDialog
          open
          onClose={() => navigate(destination)}
          onDone={() => navigate(destination)}
          title={blind ? "Do you know your birth time?" : "Is this your birth time?"}
          description={`${claimedProfile.name}, born ${claimedProfile.birthDate} in ${claimedProfile.birthPlace}.`}
          profile={{
            id: claimedProfile.id, name: claimedProfile.name, birthDate: claimedProfile.birthDate, birthTime: claimedProfile.birthTime,
            birthTimeWindowMinutes: claimedProfile.birthTimeWindowMinutes ?? 0, birthPlace: claimedProfile.birthPlace,
            latitude: claimedProfile.latitude, longitude: claimedProfile.longitude,
            timezone: claimedProfile.timezone, timezoneOffset: claimedProfile.timezoneOffset,
          }}
        />
        <Button variant="outline" onClick={() => navigate(destination)}>Read the report</Button>
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
        <p className="text-muted-foreground text-sm mb-5">{body}</p>
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

  return (
    <Centered>
      <Loader2 className="h-6 w-6 animate-spin text-primary/60 mx-auto mb-3" />
      <p className="text-muted-foreground">Claiming your invitation…</p>
    </Centered>
  );
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
