import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Heart, Loader2, Plus, Send, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AccountMenu } from "@/components/AccountMenu";
import InviteModal from "@/components/InviteModal";
import ProfileInviteHistory from "@/components/ProfileInviteHistory";
import {
  useListProfiles,
  useListRelationships,
  useCreateSynastryReport,
  getListRelationshipsQueryKey,
  getListProfilesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

export default function MyPeoplePage() {
  const [, navigate] = useLocation();
  const qc = useQueryClient();

  const profilesQ = useListProfiles({
    query: { queryKey: getListProfilesQueryKey() },
  });
  const relsQ = useListRelationships({
    query: {
      queryKey: getListRelationshipsQueryKey(),
      refetchInterval: (q) => {
        const data = q.state.data;
        if (!Array.isArray(data)) return false;
        return data.some(
          (r: any) =>
            r.latestReportStatus === "interpreting"
            || r.latestReportStatus === "computing"
            || r.latestReportStatus === "pending",
        )
          ? 3000
          : false;
      },
    },
  });

  const profiles = Array.isArray(profilesQ.data) ? profilesQ.data : [];
  const relationships = Array.isArray(relsQ.data) ? relsQ.data : [];

  const [profileAId, setProfileAId] = useState<string>("");
  const [profileBId, setProfileBId] = useState<string>("");
  type RelType = "romantic" | "parent_child" | "sibling" | "custom";
  const [type, setType] = useState<RelType>("romantic");

  const [inviteTarget, setInviteTarget] = useState<{
    profileId: string;
    profileName: string;
    relationshipId?: string | null;
  } | null>(null);

  const createSynastry = useCreateSynastryReport({
    mutation: {
      onSuccess: (data: any) => {
        qc.invalidateQueries({ queryKey: getListRelationshipsQueryKey() });
        navigate(`/synastry/${data.id}`);
      },
    },
  });

  const canCreate =
    profileAId !== "" && profileBId !== "" && profileAId !== profileBId && !createSynastry.isPending;

  const profileMap = useMemo(() => {
    const m = new Map<string, any>();
    for (const p of profiles) m.set(p.id, p);
    return m;
  }, [profiles]);

  const handleCreate = () => {
    if (!canCreate) return;
    createSynastry.mutate({
      data: { profileAId, profileBId, relationshipType: type },
    });
  };

  return (
    <div className="min-h-screen bg-background bg-stars text-foreground">
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="font-display text-lg gradient-text">Astra</span>
          </button>
          <AccountMenu />
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 pt-24 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <p className="font-label text-xs tracking-[0.2em] uppercase text-primary/80 mb-3">
            People & Compatibility
          </p>
          <h1 className="font-display text-3xl font-light">My People</h1>
          <p className="text-muted-foreground mt-2 max-w-xl">
            See compatibility between any two people whose charts you've calculated.
          </p>
        </motion.div>

        {/* Add a new person → defers to the existing /chart flow. */}
        <div className="mb-10 flex flex-wrap gap-3">
          <Button
            onClick={() => navigate("/chart")}
            className="gradient-primary text-white border-0 font-label font-medium gap-1.5"
          >
            <Plus className="h-4 w-4" />
            Add a person
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate("/dashboard")}
            className="border-border/60 font-label font-medium"
          >
            View dashboard
          </Button>
        </div>

        {/* Synastry composer */}
        <section className="mb-12 p-6 rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm">
          <h2 className="font-display text-xl font-light mb-1">New compatibility report</h2>
          <p className="text-sm text-muted-foreground mb-5">
            Select two people to generate a synastry reading.
          </p>

          {profiles.length < 2 ? (
            <div className="rounded-lg border border-dashed border-border/60 px-4 py-6 text-center">
              <Users className="h-6 w-6 text-muted-foreground/60 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                You need at least two people in your collection. Add another via "Add a person".
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-4 items-end">
              <div>
                <label className="font-label text-xs tracking-wide text-muted-foreground uppercase">
                  Person A
                </label>
                <select
                  className="mt-2 w-full rounded-lg bg-background border border-border/60 px-3 py-2 text-sm"
                  value={profileAId}
                  onChange={(e) => setProfileAId(e.target.value)}
                  data-testid="select-profile-a"
                >
                  <option value="">— choose —</option>
                  {profiles.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="font-label text-xs tracking-wide text-muted-foreground uppercase">
                  Person B
                </label>
                <select
                  className="mt-2 w-full rounded-lg bg-background border border-border/60 px-3 py-2 text-sm"
                  value={profileBId}
                  onChange={(e) => setProfileBId(e.target.value)}
                  data-testid="select-profile-b"
                >
                  <option value="">— choose —</option>
                  {profiles
                    .filter((p: any) => p.id !== profileAId)
                    .map((p: any) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="font-label text-xs tracking-wide text-muted-foreground uppercase">
                  Relationship
                </label>
                <select
                  className="mt-2 w-full rounded-lg bg-background border border-border/60 px-3 py-2 text-sm"
                  value={type}
                  onChange={(e) => setType(e.target.value as RelType)}
                >
                  <option value="romantic">Romantic</option>
                  <option value="parent_child">Parent / Child</option>
                  <option value="sibling">Sibling</option>
                  <option value="custom">Custom</option>
                </select>
              </div>

              <div className="md:col-span-3 flex justify-end">
                <Button
                  disabled={!canCreate}
                  onClick={handleCreate}
                  className="gradient-primary text-white border-0 font-label font-medium gap-1.5"
                  data-testid="button-create-synastry"
                >
                  {createSynastry.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Heart className="h-4 w-4" />
                  )}
                  Generate report
                </Button>
              </div>
              {createSynastry.isError && (
                <p className="md:col-span-3 text-sm text-destructive">
                  Could not start the report. Please try again.
                </p>
              )}
            </div>
          )}
        </section>

        {/* Existing relationships */}
        <section className="mb-12">
          <h2 className="font-display text-xl font-light mb-4">Your relationships</h2>
          {relsQ.isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-primary/50" />
            </div>
          ) : relationships.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border/60 px-4 py-8 text-center text-muted-foreground text-sm">
              No relationships yet. Generate one above.
            </div>
          ) : (
            <ul className="space-y-3">
              {relationships.map((r: any) => {
                const isReady = r.latestReportStatus === "complete";
                const isPending =
                  r.latestReportStatus === "interpreting"
                  || r.latestReportStatus === "computing"
                  || r.latestReportStatus === "pending";
                const isShared = r.ownership === "participant";
                return (
                  <li
                    key={r.id}
                    className="p-4 rounded-xl border border-border/60 bg-card/60 backdrop-blur-sm flex items-center justify-between gap-4"
                  >
                    <div className="min-w-0">
                      <p className="font-display text-lg truncate">
                        {r.participants.map((p: any) => p.name).join("  ·  ")}
                      </p>
                      <p className="font-label text-xs text-muted-foreground capitalize mt-0.5">
                        {r.type}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {isShared && (
                        <span
                          className="px-2 py-1 rounded-full text-xs font-label border border-primary/20 text-primary bg-primary/10"
                          data-testid={`badge-shared-${r.id}`}
                        >
                          Shared with you
                        </span>
                      )}
                      {isPending && (
                        <span className="px-2 py-1 rounded-full text-xs font-label border border-secondary/20 text-secondary bg-secondary/10">
                          Generating…
                        </span>
                      )}
                      {r.latestReportStatus === "failed" && (
                        <span className="px-2 py-1 rounded-full text-xs font-label border border-red-400/20 text-red-400 bg-red-400/10">
                          Failed
                        </span>
                      )}
                      {r.latestReportId && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/synastry/${r.latestReportId}`)}
                          className="font-label font-medium gap-1.5"
                        >
                          {isReady ? "Open" : "View"}
                          <ArrowRight className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* People grid */}
        <section>
          <h2 className="font-display text-xl font-light mb-4">People</h2>
          {profilesQ.isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-primary/50" />
            </div>
          ) : profiles.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border/60 px-4 py-8 text-center text-muted-foreground text-sm">
              No people yet. Use "Add a person" above to get started.
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
              {profiles.map((p: any) => {
                const ownership: string = p.ownership ?? "owner";
                // Invitable when the viewer created the profile and the
                // recipient hasn't joined yet — either a fresh send
                // ("owner") or a resend on an existing open invite
                // ("invited"). Never surface invite for "claimed"
                // (already joined) or "unclaimed" (someone else's slot).
                const canInvite = ownership === "owner" || ownership === "invited";
                const claimedByOther = ownership === "claimed" && !!p.claimedByName;
                return (
                  <div
                    key={p.id}
                    className="p-4 rounded-xl border border-border/60 bg-card/60 backdrop-blur-sm flex flex-col"
                    data-testid={`card-profile-${p.id}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-display text-base truncate">{p.name}</p>
                        <p className="font-label text-xs text-muted-foreground mt-1">
                          {p.birthDate}
                        </p>
                      </div>
                      {ownership === "claimed" && (
                        <span
                          className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-label border border-emerald-400/20 text-emerald-400 bg-emerald-400/10"
                          data-testid={`badge-claimed-${p.id}`}
                          title={p.claimedByName ?? undefined}
                        >
                          {claimedByOther ? "Joined" : "Claimed"}
                        </span>
                      )}
                      {ownership === "invited" && (
                        <span
                          className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-label border border-amber-400/20 text-amber-400 bg-amber-400/10"
                          data-testid={`badge-invited-${p.id}`}
                          title={p.inviteEmail ?? undefined}
                        >
                          Invited
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                      {p.sunSign && <span>☉ {p.sunSign}</span>}
                      {p.moonSign && <span>☽ {p.moonSign}</span>}
                      {p.risingSign && <span>↑ {p.risingSign}</span>}
                    </div>
                    {canInvite && (
                      <div className="mt-3 pt-3 border-t border-border/40 space-y-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full font-label gap-1.5"
                          onClick={() =>
                            setInviteTarget({ profileId: p.id, profileName: p.name })
                          }
                          data-testid={`button-invite-${p.id}`}
                        >
                          <Send className="h-3 w-3" />
                          Invite {p.name.split(" ")[0]}
                        </Button>
                        <ProfileInviteHistory profileId={p.id} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {inviteTarget && (
        <InviteModal
          open={!!inviteTarget}
          onClose={() => setInviteTarget(null)}
          profileId={inviteTarget.profileId}
          profileName={inviteTarget.profileName}
          relationshipId={inviteTarget.relationshipId ?? null}
        />
      )}
    </div>
  );
}
