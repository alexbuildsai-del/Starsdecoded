import { useEffect, useState } from "react";
import { useLocation, useParams } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, Heart, Loader2, Send, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AccountMenu } from "@/components/AccountMenu";
import InviteModal from "@/components/InviteModal";
import {
  useGetSynastryReport,
  getGetSynastryReportQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

const RELATIONSHIP_TYPE_LABEL: Record<string, string> = {
  romantic: "Romantic",
  parent_child: "Parent / Child",
  sibling: "Sibling",
  custom: "Custom",
};

const RATING_LABEL: Record<string, string> = {
  challenging: "Challenging",
  mixed: "Mixed",
  supportive: "Supportive",
  powerful: "Powerful",
};

const RATING_COLOR: Record<string, string> = {
  challenging: "text-red-400 bg-red-400/10 border-red-400/20",
  mixed: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  supportive: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  powerful: "text-primary bg-primary/10 border-primary/20",
};

const CATEGORY_LABEL: Record<string, string> = {
  emotional: "Emotional Attunement",
  communication: "Communication",
  physical: "Physical Chemistry",
  long_term: "Long-Term Bond",
  growth: "Growth Edge",
};

function Section({
  title,
  body,
}: {
  title: string;
  body?: string | null;
}) {
  if (!body) return null;
  return (
    <section className="mb-10">
      <h2 className="font-display text-2xl font-light mb-4 gradient-text">{title}</h2>
      <div className="prose prose-invert max-w-none">
        {body.split(/\n\n+/).map((para, i) => (
          <p key={i} className="text-foreground/90 leading-relaxed mb-3">
            {para}
          </p>
        ))}
      </div>
    </section>
  );
}

export default function SynastryReportPage() {
  const [, navigate] = useLocation();
  const params = useParams();
  const id = params.id as string;
  const qc = useQueryClient();

  const token = typeof window === "undefined"
    ? null
    : new URLSearchParams(window.location.search).get("token");
  const reportParams = token ? { token } : undefined;
  const reportQ = useGetSynastryReport(id, reportParams, {
    query: {
      queryKey: getGetSynastryReportQueryKey(id, reportParams),
      // Stop retrying on 4xx so the "Report not found" branch renders
      // promptly when the id is bogus or the viewer lost access.
      retry: (count, err) => {
        const status = (err as { status?: number } | null)?.status ?? 0;
        if (status >= 400 && status < 500) return false;
        return count < 2;
      },
      refetchInterval: (q) => {
        // Once the query has errored, polling would mask `isError` and
        // leave the viewer staring at a blank page forever — bail out.
        if (q.state.status === "error") return false;
        const data = q.state.data as any;
        if (!data) return 3000;
        return data.status === "interpreting"
          || data.status === "computing"
          || data.status === "pending"
          ? 3000
          : false;
      },
    },
  });

  // When the report flips to complete, stop the spinner immediately.
  useEffect(() => {
    if (reportQ.data?.status === "complete") {
      qc.invalidateQueries({ queryKey: getGetSynastryReportQueryKey(id, reportParams) });
    }
  }, [reportQ.data?.status, qc, id, reportParams]);

  const data = reportQ.data as any;
  const [inviteTarget, setInviteTarget] = useState<{
    profileId: string;
    profileName: string;
  } | null>(null);
  const isOwner = data?.ownership === "owner";
  // Any participant the viewer created that hasn't been claimed yet
  // is invite-eligible. We surface a CTA per such slot so the owner
  // can invite either side independently if both are unclaimed.
  const inviteableParticipants: Array<{
    id: string;
    name: string;
    ownership: string;
    inviteEmail?: string | null;
  }> = (data?.participants ?? []).filter((p: any) => {
    // Any unclaimed participant the viewer owns is invite-eligible.
    // We do NOT suppress by positional role — both primary and
    // secondary slots can be invited independently if they are
    // unclaimed. The backend's `selfProfile` flag (set when this
    // profile is the viewer's own claimed self) is the only thing we
    // exclude, so the viewer never sees an "Invite them" button for
    // their own profile.
    if (p.selfProfile) return false;
    return p.ownership === "owner" || p.ownership === "invited";
  });

  return (
    <div className="min-h-screen bg-background bg-stars text-foreground">
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center justify-between">
          <button
            onClick={() => navigate("/people")}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to People</span>
          </button>
          <AccountMenu />
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 pt-24 pb-20">
        {reportQ.isLoading && (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-primary/50" />
          </div>
        )}

        {reportQ.isError && (
          <div className="text-center py-20">
            <p className="text-muted-foreground mb-4">Report not found.</p>
            <Button variant="outline" onClick={() => navigate("/people")}>
              Back to People
            </Button>
          </div>
        )}

        {data && (
          <>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-10"
            >
              <p className="font-label text-xs tracking-[0.2em] uppercase text-primary/80 mb-3 flex items-center gap-2">
                <Heart className="h-3 w-3" /> Synastry Report
              </p>
              <h1 className="font-display text-3xl md:text-4xl font-light leading-tight">
                {data.participants
                  ?.map((p: any) => p.name)
                  .join(" & ") || "Compatibility"}
              </h1>
              {data.type && (
                <p className="font-label text-xs tracking-wide text-muted-foreground mt-2">
                  {RELATIONSHIP_TYPE_LABEL[data.type] ?? data.type}
                </p>
              )}
              {data.label && (
                <p className="text-muted-foreground mt-1">{data.label}</p>
              )}
              {!isOwner && (
                <p
                  className="font-label text-xs mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-primary/20 text-primary bg-primary/10"
                  data-testid="badge-shared-with-you"
                >
                  <Users className="h-3 w-3" /> Shared with you
                </p>
              )}
              {/* Per-participant ownership status: surfaces the four
                  required states for each slot. */}
              {data.participants && data.participants.length > 0 && (
                <ul
                  className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground"
                  data-testid="list-participant-status"
                >
                  {data.participants.map((p: any) => {
                    let label: string;
                    if (p.ownership === "owner") {
                      label = isOwner && p.role === "primary"
                        ? "Created by you"
                        : "Unclaimed";
                    } else if (p.ownership === "invited") {
                      label = `Invite sent${p.inviteEmail ? ` to ${p.inviteEmail}` : ""}`;
                    } else if (p.ownership === "claimed") {
                      label = p.claimedByName
                        ? `Joined — belongs to ${p.claimedByName}`
                        : "Joined";
                    } else {
                      label = "Unclaimed";
                    }
                    return (
                      <li
                        key={p.id}
                        data-testid={`participant-status-${p.id}`}
                        className="inline-flex items-center gap-1.5"
                      >
                        <span className="font-display text-foreground">{p.name}</span>
                        <span className="text-muted-foreground/70">·</span>
                        <span>{label}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </motion.div>

            {isOwner && inviteableParticipants.length > 0 && (
              <div
                className="mb-8 space-y-2"
                data-testid="banner-invite-suggest"
              >
                {inviteableParticipants.map((p) => (
                  <div
                    key={p.id}
                    className="p-4 rounded-xl border border-primary/30 bg-primary/5 flex flex-wrap items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="font-display text-base">
                        Invite {p.name} to view this reading
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        They'll sign in to claim their chart and see the same report.
                      </p>
                    </div>
                    <Button
                      onClick={() =>
                        setInviteTarget({
                          profileId: p.id,
                          profileName: p.name,
                        })
                      }
                      className="gradient-primary text-white border-0 gap-1.5"
                      data-testid={`button-invite-from-report-${p.id}`}
                    >
                      <Send className="h-4 w-4" />
                      {p.ownership === "invited" ? "Resend invite" : "Send invite"}
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {(data.status === "interpreting"
              || data.status === "computing"
              || data.status === "pending") && (
              <div className="rounded-2xl border border-border/60 bg-card/60 px-6 py-12 text-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary/60 mx-auto mb-3" />
                <p className="font-display text-xl font-light">Reading the field…</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Synthesising the cross-aspects between these charts.
                </p>
              </div>
            )}

            {data.status === "failed" && (
              <div className="rounded-2xl border border-red-400/30 bg-red-400/10 px-6 py-8">
                <p className="font-display text-lg">Generation failed</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {data.errorMessage ?? "Unknown error."}
                </p>
              </div>
            )}

            {data.status === "complete" && data.compute && data.interpretation && (
              <>
                {/* Score panel */}
                <div className="mb-10 rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm p-6">
                  <div className="flex items-center justify-between mb-5 gap-3">
                    <div>
                      <p className="font-label text-xs uppercase tracking-wide text-muted-foreground">
                        Overall
                      </p>
                      <p className="font-display text-4xl font-light mt-1">
                        {data.compute.overallScore}
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1.5 rounded-full text-xs font-label border ${
                        RATING_COLOR[data.compute.overallRating] ?? RATING_COLOR.mixed
                      }`}
                    >
                      {RATING_LABEL[data.compute.overallRating] ?? data.compute.overallRating}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {data.compute.categories.map((c: any) => (
                      <div
                        key={c.category}
                        className="p-3 rounded-lg border border-border/40 bg-background/40"
                      >
                        <p className="font-label text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
                          {CATEGORY_LABEL[c.category] ?? c.category}
                        </p>
                        <p className="font-display text-xl font-light">{c.score}</p>
                        <p className="font-label text-xs text-muted-foreground capitalize mt-0.5">
                          {c.rating} · {c.count}
                        </p>
                      </div>
                    ))}
                  </div>

                  {data.compute.themes?.length > 0 && (
                    <div className="mt-5 flex flex-wrap gap-2">
                      {data.compute.themes.map((t: string) => (
                        <span
                          key={t}
                          className="px-2.5 py-1 rounded-full text-xs font-label border border-border/40 bg-background/40 capitalize"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <Section title="Overview" body={data.interpretation.overview} />
                <Section
                  title="Emotional Attunement"
                  body={data.interpretation.emotional}
                />
                <Section title="Communication" body={data.interpretation.communication} />
                <Section title="Physical Chemistry" body={data.interpretation.physical} />
                <Section title="Conflict Patterns" body={data.interpretation.conflict} />
                <Section title="Growth Arc" body={data.interpretation.growth} />

                {/* Top contacts */}
                {data.compute.crossAspects?.length > 0 && (
                  <section className="mb-10">
                    <h2 className="font-display text-2xl font-light mb-4 gradient-text">
                      Strongest Contacts
                    </h2>
                    <ul className="space-y-2">
                      {data.compute.crossAspects.slice(0, 8).map((c: any, i: number) => {
                        const meaningKey = `${c.planetA}_${c.type}_${c.planetB}`;
                        const m = data.interpretation.topAspectMeanings?.[meaningKey];
                        const nameA = data.participants?.[0]?.name ?? "A";
                        const nameB = data.participants?.[1]?.name ?? "B";
                        const polarity = c.weight >= 0 ? "harmonious" : "frictional";
                        return (
                          <li
                            key={i}
                            className="p-4 rounded-xl border border-border/60 bg-card/60"
                          >
                            <p className="text-sm">
                              <span className="font-display capitalize">{nameA}'s {c.planetA}</span>{" "}
                              <span className="text-muted-foreground">{c.type}</span>{" "}
                              <span className="font-display capitalize">{nameB}'s {c.planetB}</span>{" "}
                              <span className="text-xs text-muted-foreground">
                                · orb {c.orb}° · {polarity}
                              </span>
                            </p>
                            {m?.dynamic && (
                              <p className="text-sm text-foreground/80 mt-2 leading-relaxed">
                                {m.dynamic}
                              </p>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                )}
              </>
            )}
          </>
        )}
      </main>

      {inviteTarget && (
        <InviteModal
          open={!!inviteTarget}
          onClose={() => setInviteTarget(null)}
          profileId={inviteTarget.profileId}
          profileName={inviteTarget.profileName}
          relationshipId={data?.relationshipId ?? null}
          reportId={id}
        />
      )}
    </div>
  );
}
