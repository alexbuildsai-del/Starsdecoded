import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowRight,
  Clock,
  Heart,
  Loader2,
  Plus,
  Send,
  Star,
  UserCheck,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AccountMenu } from "@/components/AccountMenu";
import InviteModal from "@/components/InviteModal";
import ProfileInviteHistory from "@/components/ProfileInviteHistory";
import { DeleteReportDialog } from "@/components/DeleteReportDialog";
import { CompatibilityPicker } from "@/components/CompatibilityPicker";
import { BirthTimeDialog } from "@/components/BirthTimeDialog";
import { lensInfo } from "@/lib/lenses";
import type { Lens } from "@/types/chart";
import {
  useListReports,
  useListProfiles,
  useUpdateProfile,
  useGetCredits,
  getListReportsQueryKey,
  getListProfilesQueryKey,
  type ProfileSummary,
  type ReportSummary,
  type CreditCounts,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Wordmark } from "@/components/Wordmark";
import { usePageTitle } from "@/lib/page-title";

/** A report is being written or revised: readable, but not finished. */
function inProgress(status: string | undefined): boolean {
  return status === "computing" || status === "interpreting" || status === "pending" || status === "revising";
}

function CreditBadge({ available }: { available: number }) {
  if (available > 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-label border border-primary/30 text-primary bg-primary/10">
        {available} available
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-label border border-border/40 text-muted-foreground bg-muted/40">
      Unlock
    </span>
  );
}

const STATUS_COLORS: Record<string, string> = {
  complete: "text-green-400 bg-green-400/10 border-green-400/20",
  failed: "text-red-400 bg-red-400/10 border-red-400/20",
  computing: "text-primary bg-primary/10 border-primary/20",
  interpreting: "text-secondary bg-secondary/10 border-secondary/20",
  revising: "text-secondary bg-secondary/10 border-secondary/20",
  pending: "text-muted-foreground bg-muted border-border",
};

const STATUS_LABELS: Record<string, string> = {
  complete: "Complete",
  failed: "Failed",
  computing: "Computing...",
  interpreting: "Writing...",
  revising: "Revising...",
  pending: "Pending",
};

/** The blind tile's call to action (ADR-37): the same door as the hero and the explorer. */
function AddBirthTimeButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      size="sm"
      variant="outline"
      className="mt-3 w-full font-label gap-1.5 border-brass/50 text-brass hover:bg-brass/10"
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      data-testid="button-add-birth-time"
    >
      <Clock className="h-3 w-3" />
      Add your birth time
    </Button>
  );
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function SignRow({ sign, symbol }: { sign: string; symbol: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-sm">{symbol}</span>
      <span className="font-label text-xs text-muted-foreground">{sign}</span>
    </div>
  );
}

// ─── Zone 1: the signed-in user's own chart ────────────────────────────────

function ZoneYou({
  selfProfile,
  natalReport,
  isLoading,
  onUnmarkSelf,
  onAddBirthTime,
}: {
  selfProfile: ProfileSummary | null;
  natalReport: ReportSummary | null;
  isLoading: boolean;
  onUnmarkSelf: (profileId: string) => void;
  onAddBirthTime: (profile: ProfileSummary) => void;
}) {
  const [, navigate] = useLocation();

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="text-2xl animate-spin text-primary/50">☉</div>
      </div>
    );
  }

  // Show CTA when: no self profile identified at all, OR self profile exists
  // but no natal report has been generated for it yet.
  if (!selfProfile || !natalReport) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-8 flex flex-col items-center text-center"
      >
        <Star className="h-10 w-10 text-primary/30 mb-4" />
        <h2 className="font-display text-xl mb-2">Your chart awaits</h2>
        <p className="text-muted-foreground text-sm mb-6 max-w-sm">
          Generate your natal chart to unlock your archetype, big three, and a full
          psychological interpretation.
        </p>
        <Button
          onClick={() => navigate("/chart?self=1")}
          className="gradient-primary text-white border-0 font-label font-semibold px-6 gap-1.5"
        >
          <Plus className="h-4 w-4" />
          Generate My Chart
        </Button>
      </motion.div>
    );
  }

  const isComplete = natalReport.status === "complete";
  const isInProgress = inProgress(natalReport.status);
  const isClickable = isComplete || isInProgress;

  const handleClick = () => {
    if (!natalReport) return;
    if (isClickable) navigate(`/report/${natalReport.id}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`group rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 to-secondary/5 backdrop-blur-sm p-6 transition-all duration-200 ${
        isClickable ? "cursor-pointer hover:border-primary/50 hover:from-primary/15 hover:to-secondary/10" : ""
      }`}
      onClick={isClickable ? handleClick : undefined}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="font-label text-[10px] tracking-[0.2em] uppercase text-primary/70 mb-1">
            Your Natal Chart
          </p>
          <h2 className="font-display text-2xl truncate mb-0.5">{selfProfile.name}</h2>
          {natalReport?.archetypeName && (
            <p className="font-label text-xs text-primary/70 mb-3">{natalReport.archetypeName}</p>
          )}

          <div className="flex items-center gap-1.5 text-muted-foreground mb-3">
            <Clock className="h-3 w-3" />
            <span className="font-label text-xs">
              {selfProfile.birthDate &&
                new Date(selfProfile.birthDate + "T12:00:00").toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
            </span>
          </div>

          {(selfProfile.sunSign || selfProfile.moonSign || selfProfile.risingSign) && (
            <div className="flex items-center gap-4">
              {selfProfile.sunSign && <SignRow sign={selfProfile.sunSign} symbol="☉" />}
              {selfProfile.moonSign && <SignRow sign={selfProfile.moonSign} symbol="☽" />}
              {selfProfile.risingSign && <SignRow sign={selfProfile.risingSign} symbol="↑" />}
            </div>
          )}
          {selfProfile.horizon === "unknown" && isComplete && (
            <AddBirthTimeButton onClick={() => onAddBirthTime(selfProfile)} />
          )}
        </div>

        <div className="flex flex-col items-end gap-3 flex-shrink-0">
          {natalReport && (
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-label border ${
                STATUS_COLORS[natalReport.status] ?? STATUS_COLORS.pending
              }`}
            >
              {STATUS_LABELS[natalReport.status] ?? natalReport.status}
            </span>
          )}
          {isClickable && (
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
          )}
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-border/30 flex items-center justify-between gap-4">
        {natalReport ? (
          <p className="font-label text-xs text-muted-foreground">
            Created {formatDate(natalReport.createdAt)}
          </p>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-3">
          {(selfProfile.ownership ?? "owner") === "owner" && (
            <DeleteReportDialog
              reportId={natalReport.id}
              personName={selfProfile.name}
              className="font-label text-[10px] h-auto px-0 gap-1 text-muted-foreground/60 hover:text-destructive hover:bg-transparent"
            />
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onUnmarkSelf(selfProfile.id);
            }}
            className="font-label text-[10px] text-muted-foreground/60 hover:text-muted-foreground transition-colors underline underline-offset-2"
            data-testid="button-unmark-self"
          >
            Not me
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Zone 2: other people's charts ────────────────────────────────────────

function PersonCard({
  profile,
  natalReport,
  onInvite,
  onMarkSelf,
  onAddBirthTime,
}: {
  profile: ProfileSummary;
  natalReport: ReportSummary | null;
  onInvite: (profileId: string, profileName: string) => void;
  onMarkSelf: (profileId: string) => void;
  onAddBirthTime: (profile: ProfileSummary) => void;
}) {
  const [, navigate] = useLocation();
  const ownership: string = profile.ownership ?? "owner";
  const canInvite = ownership === "owner" || ownership === "invited";
  const claimedByOther = ownership === "claimed" && !!profile.claimedByName;

  const isComplete = natalReport?.status === "complete";
  const isInProgress = inProgress(natalReport?.status);

  return (
    <div
      className="p-4 rounded-xl border border-border/60 bg-card/60 backdrop-blur-sm flex flex-col"
      data-testid={`card-profile-${profile.id}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-display text-base truncate">{profile.name}</p>
          <p className="font-label text-xs text-muted-foreground mt-1">
            {profile.birthDate &&
              new Date(profile.birthDate + "T12:00:00").toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          {ownership === "claimed" && (
            <span
              className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-label border border-emerald-400/20 text-emerald-400 bg-emerald-400/10"
              data-testid={`badge-claimed-${profile.id}`}
              title={profile.claimedByName ?? undefined}
            >
              {claimedByOther ? "Joined" : "Claimed"}
            </span>
          )}
          {ownership === "invited" && (
            <span
              className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-label border border-amber-400/20 text-amber-400 bg-amber-400/10"
              data-testid={`badge-invited-${profile.id}`}
              title={profile.inviteEmail ?? undefined}
            >
              Invited
            </span>
          )}
          {natalReport && (
            <span
              className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-label border ${
                STATUS_COLORS[natalReport.status] ?? STATUS_COLORS.pending
              }`}
            >
              {STATUS_LABELS[natalReport.status] ?? natalReport.status}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
        {profile.sunSign && <span>☉ {profile.sunSign}</span>}
        {profile.moonSign && <span>☽ {profile.moonSign}</span>}
        {profile.risingSign && <span>↑ {profile.risingSign}</span>}
      </div>

      {natalReport && (isComplete || isInProgress) && (
        <Button
          size="sm"
          variant="outline"
          className="mt-3 w-full font-label gap-1.5"
          onClick={() => navigate(`/report/${natalReport.id}`)}
        >
          {isComplete ? "View Report" : "Read as it writes"}
          <ArrowRight className="h-3 w-3" />
        </Button>
      )}
      {profile.horizon === "unknown" && isComplete && (ownership === "owner" || ownership === "claimed") && (
        <AddBirthTimeButton onClick={() => onAddBirthTime(profile)} />
      )}

      {natalReport && ownership === "owner" && (
        <div className="mt-2 flex justify-end">
          <DeleteReportDialog
            reportId={natalReport.id}
            personName={profile.name}
            className="font-label text-[10px] h-auto px-0 gap-1 text-muted-foreground/60 hover:text-destructive hover:bg-transparent"
          />
        </div>
      )}

      {/* "This is me" — only show for profiles the user directly owns and hasn't yet marked as self */}
      {ownership === "owner" && !profile.isSelf && (
        <div className="mt-3 pt-3 border-t border-border/40">
          <Button
            size="sm"
            variant="ghost"
            className="w-full font-label gap-1.5 text-primary/70 hover:text-primary hover:bg-primary/10"
            onClick={() => onMarkSelf(profile.id)}
            data-testid={`button-mark-self-${profile.id}`}
          >
            <UserCheck className="h-3 w-3" />
            This is me
          </Button>
        </div>
      )}

      {canInvite && (
        <div className="mt-3 pt-3 border-t border-border/40 space-y-2">
          <Button
            size="sm"
            variant="outline"
            className="w-full font-label gap-1.5"
            onClick={() => onInvite(profile.id, profile.name)}
            data-testid={`button-invite-${profile.id}`}
          >
            <Send className="h-3 w-3" />
            Invite {profile.name.split(" ")[0]}
          </Button>
          <ProfileInviteHistory profileId={profile.id} />
        </div>
      )}
    </div>
  );
}

// ─── Zone 3: compatibility ─────────────────────────────────────────────────

/** One compatibility report: "{A} & {B} Compatibility", its lens, its status, one button. */
function PairRow({ report }: { report: ReportSummary }) {
  const [, navigate] = useLocation();
  const isReady = report.status === "complete";
  const lens = report.lens ? lensInfo(report.lens as Lens).title : null;
  return (
    <li className="p-4 rounded-xl border border-border/60 bg-card/60 backdrop-blur-sm flex items-center justify-between gap-4" data-testid={`row-compatibility-${report.id}`}>
      <div className="min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <Heart className="h-3 w-3 text-secondary/70" />
          <span className="font-label text-[10px] tracking-widest uppercase text-secondary/70">{lens ?? "Compatibility"}</span>
        </div>
        <p className="font-display text-lg truncate">{report.name} Compatibility</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {inProgress(report.status) && (
          <span className="px-2 py-1 rounded-full text-xs font-label border border-secondary/20 text-secondary bg-secondary/10">Writing…</span>
        )}
        {report.status === "failed" && (
          <span className="px-2 py-1 rounded-full text-xs font-label border border-red-400/20 text-red-400 bg-red-400/10">Failed</span>
        )}
        {report.status !== "failed" && (
          <Button size="sm" variant="outline" onClick={() => navigate(`/compatibility/${report.id}`)} className="font-label font-medium gap-1.5">
            {isReady ? "Open" : "Read as it writes"}
            <ArrowRight className="h-3 w-3" />
          </Button>
        )}
      </div>
    </li>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────

export default function DashboardPage() {
  usePageTitle("Dashboard");

  const [, navigate] = useLocation();
  const qc = useQueryClient();

  // One credit kind (ADR-42): a natal report or a compatibility report each spend one.
  const creditsQ = useGetCredits();
  const credits: CreditCounts = creditsQ.data ?? { available: 0, used: 0 };

  const reportsQ = useListReports({
    query: {
      queryKey: getListReportsQueryKey(),
      refetchInterval: (query) => {
        const data = query.state.data;
        if (!Array.isArray(data)) return false;
        const hasInProgress = (data as ReportSummary[]).some((r) => inProgress(r.status));
        return hasInProgress ? 3000 : false;
      },
    },
  });

  const profilesQ = useListProfiles({
    query: { queryKey: getListProfilesQueryKey() },
  });

  const allReports = Array.isArray(reportsQ.data) ? reportsQ.data : [];
  const allProfiles = Array.isArray(profilesQ.data) ? profilesQ.data : [];
  const pairReports = useMemo(
    () => allReports.filter((r) => r.kind === "compatibility").sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
    [allReports],
  );

  // Natal reports only, indexed by profileId for stable matching (latest per profile).
  const natalReportsByProfileId = useMemo(() => {
    const map = new Map<string, ReportSummary>();
    for (const r of allReports) {
      if (r.kind !== "natal" || !r.profileId) continue;
      const existing = map.get(r.profileId);
      if (!existing || r.createdAt > existing.createdAt) {
        map.set(r.profileId, r);
      }
    }
    return map;
  }, [allReports]);

  // Zone 1: use isSelf flag from backend.
  // If exactly one profile has isSelf=true → use it.
  // If zero or multiple isSelf=true profiles → ambiguous, show CTA.
  const selfProfile = useMemo(() => {
    const candidates = allProfiles.filter((p) => p.isSelf === true);
    return candidates.length === 1 ? candidates[0] : null;
  }, [allProfiles]);

  // Zone 2: all profiles that are NOT being displayed in Zone 1.
  // Only exclude a profile when it is unambiguously the self-profile AND
  // actually shown in Zone 1 (selfProfile !== null). If self resolution is
  // ambiguous (selfProfile === null), include every profile here so nothing
  // becomes invisible.
  const otherProfiles = useMemo(
    () =>
      selfProfile
        ? allProfiles.filter((p) => p.id !== selfProfile.id)
        : allProfiles,
    [allProfiles, selfProfile],
  );

  const isLoading = reportsQ.isLoading || profilesQ.isLoading;
  const isError = reportsQ.isError || profilesQ.isError;

  const updateProfile = useUpdateProfile({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListProfilesQueryKey() });
      },
    },
  });

  const handleMarkSelf = (profileId: string) => {
    updateProfile.mutate({ id: profileId, data: { isSelf: true } });
  };

  const handleUnmarkSelf = (profileId: string) => {
    updateProfile.mutate({ id: profileId, data: { isSelf: false } });
  };

  const [inviteTarget, setInviteTarget] = useState<{
    profileId: string;
    profileName: string;
  } | null>(null);

  const handleInvite = (profileId: string, profileName: string) => {
    setInviteTarget({ profileId, profileName });
  };

  const [timeTarget, setTimeTarget] = useState<ProfileSummary | null>(null);

  return (
    <div className="min-h-screen bg-background bg-stars text-foreground">
      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <Wordmark />
          <div className="flex items-center gap-2">
            <Button
              onClick={() => navigate("/chart")}
              size="sm"
              variant="outline"
              className="font-label font-medium gap-1.5 border-border/60"
              data-testid="button-add-person"
            >
              <Plus className="h-3.5 w-3.5" />
              Add a Person
            </Button>
            <AccountMenu />
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 pt-24 pb-20">
        {/* Page header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <p className="font-label text-xs tracking-[0.2em] uppercase text-primary/80 mb-3">
            Your Cosmos
          </p>
          <h1 className="font-display text-3xl">Dashboard</h1>
        </motion.div>

        {/* Global error */}
        {isError && (
          <div className="flex flex-col items-center py-10 text-center mb-8">
            <AlertCircle className="h-8 w-8 text-destructive mb-3" />
            <p className="text-muted-foreground mb-4">Failed to load your data.</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                reportsQ.refetch();
                profilesQ.refetch();
              }}
            >
              Retry
            </Button>
          </div>
        )}

        {/* ── Zone 1: You ─────────────────────────────────────────────── */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl">You</h2>
          </div>
          <ZoneYou
            selfProfile={selfProfile}
            natalReport={selfProfile ? (natalReportsByProfileId.get(selfProfile.id) ?? null) : null}
            isLoading={isLoading}
            onUnmarkSelf={handleUnmarkSelf}
            onAddBirthTime={setTimeTarget}
          />
        </section>

        {/* ── Zone 2: Your People ──────────────────────────────────────── */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl">Your People</h2>
            <div className="flex items-center gap-2">
              <span className="font-label text-[10px] text-muted-foreground uppercase tracking-wider">Credits</span>
              <CreditBadge available={credits.available} />
            </div>
          </div>

          {profilesQ.isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-primary/50" />
            </div>
          ) : otherProfiles.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border/60 px-4 py-8 text-center text-muted-foreground text-sm">
              <Users className="h-6 w-6 text-muted-foreground/40 mx-auto mb-2" />
              <p>No other people yet. Add someone to compare charts or generate a compatibility report.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
              {otherProfiles.map((p) => (
                <PersonCard
                  key={p.id}
                  profile={p}
                  natalReport={natalReportsByProfileId.get(p.id) ?? null}
                  onInvite={handleInvite}
                  onMarkSelf={handleMarkSelf}
                  onAddBirthTime={setTimeTarget}
                />
              ))}
            </div>
          )}

          {/* Add a Person CTA */}
          <div className="mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/chart")}
              className="font-label font-medium border-border/60 gap-1.5"
              data-testid="button-add-person-zone2"
            >
              <Plus className="h-3.5 w-3.5" />
              Add a Person
            </Button>
          </div>
        </section>

        {/* ── Zone 3: Compatibility ────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl">Compatibility</h2>
          </div>

          {reportsQ.isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-primary/50" />
            </div>
          ) : pairReports.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border/60 px-4 py-6 text-center text-muted-foreground text-sm mb-6">
              No compatibility reports yet.
            </div>
          ) : (
            <ul className="space-y-3 mb-6">
              {pairReports.map((r) => <PairRow key={r.id} report={r} />)}
            </ul>
          )}

          <CompatibilityPicker reports={allReports} />
        </section>
      </main>

      {timeTarget && (
        <BirthTimeDialog
          open={!!timeTarget}
          onClose={() => setTimeTarget(null)}
          profile={{
            id: timeTarget.id, name: timeTarget.name, birthDate: timeTarget.birthDate, birthTime: timeTarget.birthTime,
            birthTimeWindowMinutes: timeTarget.birthTimeWindowMinutes ?? 720, birthPlace: timeTarget.birthPlace,
            latitude: timeTarget.latitude, longitude: timeTarget.longitude, timezone: timeTarget.timezone, timezoneOffset: timeTarget.timezoneOffset,
          }}
          onDone={() => {
            qc.invalidateQueries({ queryKey: getListReportsQueryKey() });
            qc.invalidateQueries({ queryKey: getListProfilesQueryKey() });
          }}
        />
      )}

      {inviteTarget && (
        <InviteModal
          open={!!inviteTarget}
          onClose={() => setInviteTarget(null)}
          profileId={inviteTarget.profileId}
          profileName={inviteTarget.profileName}
          relationshipId={null}
        />
      )}
    </div>
  );
}
