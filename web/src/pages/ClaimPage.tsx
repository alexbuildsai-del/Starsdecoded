import { useEffect, useMemo, useRef } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@clerk/react";
import { Loader2, Heart, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useGetInvite,
  useClaimInvite,
  getGetInviteQueryKey,
  getListProfilesQueryKey,
  getListRelationshipsQueryKey,
  type InviteClaimResponse,
  type InvitePreview,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

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

  const claim = useClaimInvite({
    mutation: {
      onSuccess: (data: InviteClaimResponse) => {
        qc.invalidateQueries({ queryKey: getListProfilesQueryKey() });
        qc.invalidateQueries({ queryKey: getListRelationshipsQueryKey() });
        navigate(data.redirectTo ?? "/people");
      },
    },
  });

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
        <h1 className="font-display text-2xl font-light mb-2">Missing invite token</h1>
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
        <h1 className="font-display text-2xl font-light mb-2">Invite unavailable</h1>
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
        <h1 className="font-display text-2xl font-light mb-2">
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
        <h1 className="font-display text-2xl font-light mb-2">Already claimed</h1>
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
        <h1 className="font-display text-2xl font-light mb-2">{title}</h1>
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
