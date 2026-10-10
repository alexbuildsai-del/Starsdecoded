/**
 * The natal report: one page, two skies (ADR-48, ADR-59). The generation
 * screen is the page until the reader takes the door (ADR-393):
 * full-bleed, the scroll locked behind it, the same screen before the chart
 * exists. Taking the door unmounts it, shows the report at the top, and the
 * hero's own sky gathers its stars onto the ring once; the chapters keep
 * R04's ground. Ten chapters, the last one Closing
 * (ADR-46); a chapter not yet landed shows a skeleton. A blind report renders
 * no rising text and no house readings, the call to action instead, and the
 * ledger above chapter 01 once a pass has run (ADR-35, ADR-37). A report
 * written before its birth time was last updated keeps its words and says so
 * there (MB-170); Try again, free, and Regenerate show only where the server lets the
 * reader rewrite it (MB-169). A report we finally could not write has no Try
 * again, and the generation screen says its credit is back (ADR-313).
 */
import { lazy, Suspense, useCallback, useEffect, useState, type CSSProperties } from "react";
import { useParams, useLocation } from "wouter";
import { ArrowLeft, Download } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { tokens } from "@workspace/design";
import { Button } from "@/ds/atoms/Button";
import { PlanetBody } from "@/ds/atoms/PlanetBody";
import { RetrogradeBadge } from "@/ds/atoms/RetrogradeBadge";
import { TextButton } from "@/ds/atoms/TextButton";
import { InlineError } from "@/ds/molecules/Alert";
import { AccountMenu } from "@/components/AccountMenu";
import { getGetReportQueryKey, getGetReportStatusQueryKey, useRegenerateReport, type SendState } from "@workspace/api-client-react";
import LoadingState from "@/components/LoadingState";
import {
  PLANET_LABELS,
  isCurrentInterpretation,
  rewriteOffer,
  type ChartData,
  type ChartPlanet,
  type Interpretation,
} from "@/types/chart";
import {
  OverviewBlock, DeepdiveBlock, MindBlock, MindRail, CareerBlock, CareerRail,
  MoneyBlock, MoneyRail, RelationshipsBlock, RelationshipsRail,
  FamilyBlock, FamilyRail, SuperpowersBlock, DiscoveriesBlock, ChapterFact,
} from "@/components/ReportSections";
import { ReportHero } from "@/components/report/ReportHero";
import { houseWithWord } from "@/lib/evidence-glossary";
import { usePageTitle, reportFileTitle } from "@/lib/page-title";
import { ReportSky } from "@/components/report/ReportSky";
import { Chapter } from "@/components/report/Chapter";
import { ChapterRail } from "@/components/report/ChapterRail";
import { ChapterSkeleton } from "@/components/report/ChapterSkeleton";
import { HouseDeck } from "@/components/report/HouseDeck";
import { BalanceRail } from "@/components/report/BalanceRail";
import { DawnClosing } from "@/components/report/DawnClosing";
import { MethodologyStrip } from "@/components/report/MethodologyStrip";
import { OpeningOverlay, plainSlots } from "@/components/report/OpeningOverlay";
import { useBuildStory } from "@/components/report/BuildStory";
import { RevisionLedger, marksShown, rememberMarks } from "@/components/report/RevisionLedger";
import { RevisionProvider, revisionSet } from "@/components/report/RevisedText";
import { BirthTimeDialog } from "@/components/BirthTimeDialog";
import { ShareWindow } from "@/components/share/ShareWindow";
import { HANDED_BACK, SEND_AGAIN, sharedWaiting } from "@/lib/pair-row";
import { shareWith } from "@/lib/share-card";
import { WorkbookProvider } from "@/lib/workbook";
import { useLiveReport } from "@/hooks/useLiveReport";
import { chapterAccent } from "@/lib/chapter-accent";
import { CHAPTERS } from "@/lib/chapters";
import { refusalLine } from "@/lib/refusals";
import { useTimelineAccess } from "@/lib/timeline-access";

// Ask's chat brings Timeline's pieces and the sky engine with it, so a reader without Timeline never downloads them.
const AskLauncher = lazy(() => import("@/components/ask/AskLauncher"));

const TOTAL = CHAPTERS.length;
const OPENING_ACCENT = tokens.color["chapter-1"];

function PlanetRow({ name, planet, meaning }: { name: string; planet: ChartPlanet; meaning?: string }) {
  return (
    <div id={`planet-${name}`} className="py-3 border-b border-line-soft last:border-0 scroll-mt-24">
      <div className="flex items-center gap-3">
        <span className="grid w-6 place-items-center"><PlanetBody body={name} size={20} /></span>
        <span className="font-label text-ui w-24 text-muted">{PLANET_LABELS[name] ?? name}</span>
        <span className="font-numeric text-ui flex-1">
          {planet.degree.toFixed(1)}° {planet.sign}
        </span>
        {planet.house && <span className="font-numeric text-caption text-muted">{houseWithWord(planet.house)}</span>}
        {planet.retrograde && <RetrogradeBadge size="small" label="Retrograde" />}
      </div>
      {meaning && (
        <p className="mt-2 ml-9 pr-2 text-ui text-paper-dim whitespace-pre-line">{meaning}</p>
      )}
    </div>
  );
}

function Centred({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-ground flex items-center justify-center">
      <div className="text-center max-w-md px-6">{children}</div>
    </div>
  );
}

/** The hero and the houses draw the chart as it stands now, so a report written before the change says why its words differ. */
function OutdatedLine({ onRegenerate, pending, error }: { onRegenerate?: () => void; pending: boolean; error: string | null }) {
  return (
    <div
      className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-card border border-line bg-surface-glass px-3 py-2.5"
      data-testid="outdated-line"
    >
      <p id="outdated-line-text" className="min-w-0 flex-1 basis-[200px] text-small text-paper">
        The birth time was updated after this report was written.
      </p>
      {onRegenerate && (
        <Button
          variant="secondary"
          size="compact"
          disabled={pending}
          onClick={onRegenerate}
          aria-describedby="outdated-line-text"
          className="shrink-0 text-indigo-lt"
        >
          {pending ? "Starting…" : "Regenerate"}
        </Button>
      )}
      {error && <InlineError className="basis-full">{error}</InlineError>}
    </div>
  );
}

function lineText(send: SendState): { title: string; note: string } {
  const name = send.firstName;
  if (send.state === "sent") return { title: sharedWaiting(name), note: "When they sign in, the report is theirs." };
  if (send.state === "joined") return { title: `${name} joined`, note: "The report is theirs now. They can delete it or stop you seeing it." };
  if (send.state === "handed_back") return { title: HANDED_BACK, note: "Whoever opened your link said it isn't about them, so it's yours again." };
  return { title: `Give ${name} their report`, note: "An email and a link. When they sign in, it is theirs." };
}

/** The server decides where a share is offered (reading 11), so a null `send` draws nothing; a first one, a grant to someone already here, or a new one after a handback (ADR-236). */
function SendLine({ send, onSend }: { send: SendState | null | undefined; onSend: () => void }) {
  if (!send) return null;
  const { title, note } = lineText(send);
  const offered = send.state === "can_send" || send.state === "can_grant" || send.state === "handed_back";
  return (
    <div
      className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-card border border-line bg-surface-glass px-3 py-2.5"
      data-testid="send-line"
      data-state={send.state}
    >
      <div className="min-w-0 flex-1 basis-[200px]">
        <p className="text-small text-paper">{title}</p>
        <p className="mt-0.5 text-caption text-muted">{note}</p>
      </div>
      {send.state === "joined" && (
        <span className="inline-flex h-[30px] shrink-0 items-center rounded-inner border border-element-earth/40 px-[11px] font-label text-caption text-element-earth">
          Joined ✓
        </span>
      )}
      {offered && (
        <Button
          variant="secondary"
          size="compact"
          onClick={onSend}
          className="shrink-0 text-indigo-lt"
          data-testid="button-send-to"
        >
          {send.state === "handed_back" ? SEND_AGAIN : shareWith(send.firstName)}
        </Button>
      )}
    </div>
  );
}

export default function ReportPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const client = useQueryClient();
  const [active, setActive] = useState(-1);
  const [askTime, setAskTime] = useState(false);
  const [sending, setSending] = useState(false);
  const [marks, setMarks] = useState(() => marksShown(id ?? ""));
  const { access } = useTimelineAccess();
  // Once drawn, Ask stays: a chat open when access goes keeps its refusal on screen until the reader closes it.
  const [asks, setAsks] = useState(false);
  useEffect(() => {
    if (access) setAsks(true);
  }, [access]);

  const live = useLiveReport(id!);
  const { report, sections, workbook, writing, revising, open, setOpen, progress, horizonPass } = live;
  const interpretation = live.interpretation as Interpretation | null;
  const story = useBuildStory(report, live.chartReady, progress);

  const refresh = useCallback(() => {
    client.invalidateQueries({ queryKey: getGetReportQueryKey(id!) });
    client.invalidateQueries({ queryKey: getGetReportStatusQueryKey(id!) });
  }, [client, id]);
  // A 409 is a rewrite already under way, or a report that went final meanwhile (ADR-313): either way the page only has to catch up.
  const regenerate = useRegenerateReport({ mutation: { onSuccess: refresh, onError: (err) => err.status === 409 && refresh() } });

  // The browser offers document.title as the print-to-PDF filename, so the
  // complete report's title is the filename we want to hand the buyer.
  const complete = report?.status === "complete";
  usePageTitle(
    complete ? reportFileTitle("Personal Report", report.name) : "Personal Report",
    { raw: complete },
  );

  const handlePrint = () => window.print();

  // The door taken: the report shows from the top, and the gather runs from there.
  useEffect(() => {
    if (open) window.scrollTo({ top: 0, behavior: "auto" });
  }, [open]);

  if (live.isLoading) return <LoadingState label="Loading your report…" />;

  if (live.isError || !report) {
    return (
      <Centred>
        <p className="text-muted mb-4">Report not found.</p>
        <Button onClick={() => navigate("/chart")} variant="secondary">Start over</Button>
      </Centred>
    );
  }

  const chartData = (report.chartData ?? null) as unknown as ChartData | null;
  // The status route is fresher than the row while it polls, and a failure reaches it first.
  const offer = rewriteOffer({ status: live.status, canRegenerate: report.canRegenerate, outdated: report.outdated });
  const rewrite = () => regenerate.mutate({ id: id! });
  const regenerateError = regenerate.isError && regenerate.error.status !== 409
    ? refusalLine(regenerate.error) ?? "Could not start regeneration. Please try again in a minute."
    : null;

  // MB-45: a finished report from an earlier prompt version keeps its words
  // but not this page's shape, so it is offered a regeneration and never
  // regenerated on its own.
  if (!writing && interpretation && !isCurrentInterpretation(interpretation)) {
    return (
      <Centred>
        <p className="text-muted mb-4">
          This report was made with an older version. Write it again to read it.
        </p>
        {offer.regenerate && (
          <Button variant="secondary" disabled={regenerate.isPending} onClick={rewrite}>
            {regenerate.isPending ? "Starting…" : "Regenerate"}
          </Button>
        )}
        {regenerateError && (
          <InlineError className="mt-3">{regenerateError}</InlineError>
        )}
      </Centred>
    );
  }

  // Until the door is taken the generation screen is the page; behind it the
  // body mounts as soon as the chart and the first sections exist, so the
  // hero has measured its ring by the time the screen leaves. A failed report
  // has no door, so with chapters written or not it stays on the screen and its
  // line, unless the reader had already gone through.
  const ready = !!chartData && !!interpretation;
  const showOverlay = !open;
  const accent = active < 0 ? OPENING_ACCENT : chapterAccent(active + 1);
  const onHero = active < 0;
  const revisions = revisionSet(horizonPass, marks);

  if (!ready) {
    return (
      <div className="rp-root min-h-screen" style={{ "--accent": OPENING_ACCENT } as CSSProperties}>
        <ReportSky accent={OPENING_ACCENT} opening />
        <OpeningOverlay
          progress={progress}
          failureLine={live.failureReason?.line ?? null}
          onOpen={setOpen}
          onRetry={offer.tryAgain ? rewrite : undefined}
          retrying={regenerate.isPending}
          slots={story ?? plainSlots(progress)}
        />
      </div>
    );
  }

  const blind = chartData.angles === undefined;
  const mainPlanets = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"];
  const minorPlanets = ["chiron", "north_node", "south_node"];
  const angles = interpretation.angleMeanings;

  const done = (key: string) => !writing || sections[key] === "done";
  const rail = CHAPTERS.map((c) => ({
    eyebrow: c.eyebrow, title: c.title,
    writing: !revising && !done(c.section),
    revising: revising && !done(c.section),
  }));
  const ch = (n: number) => ({ number: n, total: TOTAL, eyebrow: CHAPTERS[n - 1].eyebrow, title: CHAPTERS[n - 1].title });
  const counter = (n: number) => `${String(n).padStart(2, "0")} / ${String(TOTAL).padStart(2, "0")}`;
  const body = (key: string, node: React.ReactNode) => (done(key) && node ? node : <ChapterSkeleton lines={key === "focus" ? 4 : 5} />);
  const openTime = () => setAskTime(true);
  // The route refuses a report still being written or revised, so the offer waits, as Export PDF does.
  const send = writing ? null : report.send ?? null;

  return (
    <WorkbookProvider reportId={id!} initial={workbook}>
    <RevisionProvider value={revisions}>
    <div className={`rp-root min-h-screen${marks ? "" : " marks-off"}`} style={{ "--accent": accent } as CSSProperties}>
      <ReportSky accent={accent} opening={onHero} />

      {showOverlay && (
        <OpeningOverlay
          progress={progress}
          failureLine={live.failureReason?.line ?? null}
          onOpen={setOpen}
          onRetry={offer.tryAgain ? rewrite : undefined}
          retrying={regenerate.isPending}
          slots={story ?? plainSlots(progress)}
        />
      )}

      <ReportHero
        name={report.name}
        birthDate={report.birthDate}
        birthTime={report.birthTime}
        birthTimeWindowMinutes={report.birthTimeWindowMinutes}
        birthPlace={report.birthPlace}
        latitude={report.latitude}
        longitude={report.longitude}
        chartData={chartData}
        meta={interpretation.meta}
        onAddBirthTime={report.profileId ? openTime : undefined}
        writtenOn={report.createdAt}
        accent={OPENING_ACCENT}
        gather={open}
      />

      {/* The opening screen draws its own grid to the top edge, so the chrome waits for the door and then takes a ground once the reading starts. */}
      {!showOverlay && <nav
        className={`fixed top-0 inset-x-0 z-50 border-b no-print transition-colors duration-500 ${
          onHero ? "border-transparent bg-transparent" : "border-line bg-ground/90 backdrop-blur-md"
        }`}
      >
        <div className="max-w-[880px] mx-auto px-6 h-14 flex items-center justify-between">
          <TextButton onClick={() => navigate("/dashboard")} className="text-muted">
            <ArrowLeft className="h-4 w-4" />
            <span className="font-label text-ui">Dashboard</span>
          </TextButton>
          <div className="flex items-center gap-2">
            {/* Export reads the same status the door reads and flips at complete (ADR-48). */}
            <Button variant="secondary" size="compact" disabled={writing} onClick={handlePrint} className="gap-1.5">
              <Download className="h-3.5 w-3.5" />
              {revising ? "Revising…" : writing ? "Writing…" : "Export PDF"}
            </Button>
            <AccountMenu />
          </div>
        </div>
      </nav>}

      <ChapterRail
        chapters={rail}
        active={active}
        onActive={setActive}
        revision={horizonPass ? { sentencesRevised: horizonPass.sentencesRevised, paragraphsAdded: horizonPass.paragraphsAdded, at: horizonPass.at } : null}
      />

      <main className="rp-body pb-20">
        {offer.outdated && (
          <div className="rp-chapter no-print pb-6">
            <div className="max-w-[64ch]">
              <OutdatedLine onRegenerate={offer.regenerate ? rewrite : undefined} pending={regenerate.isPending} error={regenerateError} />
            </div>
          </div>
        )}

        {horizonPass && (
          <div className="rp-chapter">
            <RevisionLedger
              pass={horizonPass}
              chart={chartData}
              meta={interpretation.meta}
              shown={marks}
              onToggle={(next) => { setMarks(next); rememberMarks(id!, next); }}
            />
          </div>
        )}

        <Chapter {...ch(1)} lede={interpretation.overview?.headline}>
          {body("overview", interpretation.overview && <OverviewBlock s={interpretation.overview} />)}
        </Chapter>

        <Chapter {...ch(2)}>
          {/* Up to 960 px the chapter bar sits under the nav, so the deck pins below the two of them. */}
          <div className="[--deck-top:6rem] min-[961px]:[--deck-top:4.5rem]">
            <HouseDeck
              chart={chartData}
              readings={interpretation.houses?.houses}
              counter={counter(2)}
              orbs={interpretation.meta.orbs}
              birthPlace={report.birthPlace}
              onAddBirthTime={report.profileId ? openTime : undefined}
            />
          </div>

          <div className="mt-10">
            {body("overview", interpretation.overview && <DeepdiveBlock s={interpretation.overview} />)}
            <div className="mt-6">
              <BalanceRail chartData={chartData} />
            </div>
          </div>

          {/* Print only: the PDF is where the composed per-planet and angle text
              lives, since the cards on screen now read the generated section. */}
          <div className="hidden print:block mt-5 space-y-3">
            {(["mercury", "venus", "mars", "jupiter", "saturn"] as const).map((name) => {
              const text = interpretation.personalPlanets?.[name];
              const planet = chartData.planets[name];
              if (!text || !planet) return null;
              return (
                <div key={name} className="p-5 rounded-card border border-line bg-surface/40">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <PlanetBody body={name} size={16} />
                      <span className="font-display text-ui text-paper">
                        {PLANET_LABELS[name]} in {planet.sign}
                      </span>
                    </div>
                    {planet.house && <span className="font-numeric text-data-sm text-muted">{houseWithWord(planet.house)}</span>}
                  </div>
                  <p className="text-ui text-paper-dim">{text}</p>
                </div>
              );
            })}
            {angles && !blind && (
              <div className="p-5 rounded-card border border-line bg-surface/40">
                <p className="font-label text-caption text-muted tracking-wider uppercase mb-2">Angles</p>
                <p className="text-ui text-paper-dim">{angles.ascendant.firstImpression}</p>
                <p className="text-ui text-paper-dim mt-2">{angles.ascendant.orientationStyle}</p>
                <p className="text-ui text-paper-dim mt-2">{angles.midheaven.publicDirection}</p>
                <p className="text-ui text-paper-dim mt-2">{angles.midheaven.whereYouThrive}</p>
              </div>
            )}
          </div>

          {/* Placement table, print only; the PDF is the one place every degree appears. */}
          <div className="hidden print:block print:mt-8">
            <div className="rounded-card border border-line bg-surface/40 divide-y divide-line-soft overflow-hidden">
              <div className="px-5 py-3 bg-raised/60">
                <p className="font-label text-caption text-muted tracking-wider uppercase">Personal Planets</p>
              </div>
              <div className="px-5">
                {mainPlanets.map((name) => {
                  const planet = chartData.planets[name];
                  if (!planet) return null;
                  return <PlanetRow key={name} name={name} planet={planet} meaning={interpretation.personalPlanets?.[name]} />;
                })}
              </div>
              <div className="px-5 py-3 bg-raised/60">
                <p className="font-label text-caption text-muted tracking-wider uppercase">Points</p>
              </div>
              <div className="px-5">
                {minorPlanets.map((name) => {
                  const planet = chartData.planets[name];
                  if (!planet) return null;
                  return <PlanetRow key={name} name={name} planet={planet} meaning={interpretation.personalPlanets?.[name]} />;
                })}
              </div>
            </div>
          </div>
        </Chapter>

        <Chapter {...ch(3)} aside={interpretation.mind ? <MindRail s={interpretation.mind} /> : undefined}>
          {body("mind", interpretation.mind && <MindBlock s={interpretation.mind} />)}
        </Chapter>

        <Chapter {...ch(4)} aside={interpretation.career ? <CareerRail s={interpretation.career} /> : undefined}>
          {body("career", interpretation.career && <CareerBlock s={interpretation.career} />)}
        </Chapter>

        <Chapter {...ch(5)} aside={interpretation.money ? <MoneyRail s={interpretation.money} /> : undefined}>
          {body("money", interpretation.money && <MoneyBlock s={interpretation.money} />)}
        </Chapter>

        <Chapter {...ch(6)} aside={interpretation.relationships ? <RelationshipsRail s={interpretation.relationships} /> : undefined}>
          {body("relationships", interpretation.relationships && <RelationshipsBlock s={interpretation.relationships} />)}
        </Chapter>

        <Chapter {...ch(7)} aside={interpretation.family ? <FamilyRail s={interpretation.family} /> : undefined}>
          {body("family", interpretation.family && <FamilyBlock s={interpretation.family} />)}
        </Chapter>

        <Chapter {...ch(8)}>
          {body("superpowers", interpretation.superpowers && <SuperpowersBlock s={interpretation.superpowers} />)}
        </Chapter>

        <Chapter {...ch(9)}>
          {body("discoveries", interpretation.discoveries && <DiscoveriesBlock s={interpretation.discoveries} />)}
        </Chapter>

        <Chapter {...ch(10)}>
          {body("focus", interpretation.focus && (
            <>
              <DawnClosing s={interpretation.focus} fact={<div className="relative mt-8"><ChapterFact fact={interpretation.focus.didYouKnow} /></div>} />
            </>
          ))}
        </Chapter>

        {/* Where the reading ends, the person it is about can be given it (ADR-120); the server offers it only on a report the reader wrote about someone else. */}
        {send && report.profileId && (
          <div className="rp-chapter no-print">
            <div className="max-w-[64ch]">
              <SendLine send={send} onSend={() => setSending(true)} />
            </div>
          </div>
        )}

        <div className="rp-chapter">
          <MethodologyStrip meta={interpretation.meta} chart={chartData} birthTime={report.birthTime} pass={horizonPass} />
        </div>
      </main>

      {/* In the corner once the reading shows, past the generation screen; a question asked here can read this report (reading 16). */}
      {open && asks && (
        <Suspense fallback={null}>
          <AskLauncher reportId={id} />
        </Suspense>
      )}

      {askTime && report.profileId && (
        <BirthTimeDialog
          open={askTime}
          onClose={() => setAskTime(false)}
          onDone={refresh}
          profile={{
            id: report.profileId, name: report.name, birthDate: report.birthDate, birthTime: report.birthTime,
            birthTimeWindowMinutes: report.birthTimeWindowMinutes, birthPlace: report.birthPlace,
            latitude: report.latitude, longitude: report.longitude, timezone: report.timezone, timezoneOffset: report.timezoneOffset,
            horizonPasses: report.horizonPasses,
          }}
        />
      )}

      {send && report.profileId && (
        <ShareWindow
          open={sending}
          onClose={() => setSending(false)}
          target={{ kind: "person", profileId: report.profileId, name: send.firstName }}
        />
      )}
    </div>
    </RevisionProvider>
    </WorkbookProvider>
  );
}
