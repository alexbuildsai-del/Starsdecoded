import { PERSONAL_REPORT } from "@/lib/product";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { Link, useLocation, useSearch } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { Button } from "@/ds/atoms/Button";
import { Eyebrow } from "@/ds/atoms/Eyebrow";
import { FIELD_LABEL, Input } from "@/ds/atoms/Input";
import { Heading } from "@/ds/atoms/Heading";
import { Text } from "@/ds/atoms/Text";
import { TextButton } from "@/ds/atoms/TextButton";
import { Wordmark } from "@/ds/atoms/Wordmark";
import { BirthDateField, BirthTimeControl, PlaceField } from "@/ds/molecules/BirthFields";
import { TopBar } from "@/ds/organisms/TopBar";
import { AppPage } from "@/ds/templates/AppPage";
import {
  useCreateReport,
  useListProfiles,
  useListReports,
  getListProfilesQueryKey,
  getListReportsQueryKey,
  type ProfileSummary,
} from "@workspace/api-client-react";
import { offsetAtBirth } from "@workspace/engine";
import { usePageTitle } from "@/lib/page-title";
import { DEFAULT_ANSWER, toValue, type BirthTimeAnswer } from "@/lib/birth-time";
import { localDay } from "@/lib/date-entry";
import { checkoutHref } from "@/lib/checkout-view";
import { saveFormDraft, takeFormDraft } from "@/lib/form-draft";
import type { GeocodeResult } from "@/lib/places";
import { nameRuleLine, isPersonName } from "@/lib/person-name";
import { isNoCredit, refusalLine } from "@/lib/refusals";

const TIME_ID = "birthTime";

/**
 * Whether the element was there to take focus, so a caller can fall through to the next. Focus arrives mid-typing, so a
 * value already in the field is selected and the next keys replace it (QA-02 #2).
 */
function focusById(id: string): true | undefined {
  const el = document.getElementById(id);
  el?.focus();
  if (el instanceof HTMLInputElement) el.select();
  return el ? true : undefined;
}

// About 5 km: the same place picked again can come back from the search with a slightly different point.
const SAME_PLACE_DEGREES = 0.05;

/**
 * The reader's own chart when the details typed are its birth details. Date, time and place only: never the name, since
 * the reader may type any name for themselves or for someone born at the same moment in the same town.
 */
function ownChartMatching(
  profiles: readonly ProfileSummary[] | null | undefined,
  birthDate: string,
  birthTime: string | undefined,
  place: GeocodeResult | null,
): ProfileSummary | undefined {
  if (!Array.isArray(profiles) || !birthDate || !birthTime || !place) return undefined;
  return profiles.find(
    (p) =>
      p.isSelf === true &&
      p.birthDate === birthDate &&
      p.birthTime.slice(0, 5) === birthTime.slice(0, 5) &&
      Math.abs(p.latitude - place.latitude) < SAME_PLACE_DEGREES &&
      Math.abs(p.longitude - place.longitude) < SAME_PLACE_DEGREES,
  );
}

export default function BirthFormPage() {
  usePageTitle("Your birth data");

  const [, navigate] = useLocation();
  // ?self=1 means the user arrived from the "Generate My Chart" CTA — pre-check the toggle.
  // wouter's useLocation() only returns the pathname, so the query string must
  // come from useSearch().
  const search = useSearch();
  const selfFromUrl = new URLSearchParams(search).get("self") === "1";

  // Default toggle to true (optimistic); flip to false once we confirm a self-profile exists.
  const [isSelf, setIsSelf] = useState(true);
  const [selfInitialized, setSelfInitialized] = useState(selfFromUrl);

  const { data: profiles } = useListProfiles({
    query: { queryKey: getListProfilesQueryKey(), staleTime: 60_000 },
  });

  useEffect(() => {
    // Guard with Array.isArray: a body-less response (e.g. a 304) resolves to
    // null rather than an array and must not crash the page.
    if (!selfInitialized && Array.isArray(profiles)) {
      const hasSelfProfile = profiles.some((p) => p.isSelf);
      setIsSelf(!hasSelfProfile);
      setSelfInitialized(true);
    }
  }, [profiles, selfInitialized]);

  const [name, setName] = useState("");
  const [nameLeft, setNameLeft] = useState(false);
  const [birthDate, setBirthDate] = useState("");
  const [birthTime, setBirthTime] = useState<BirthTimeAnswer>(DEFAULT_ANSWER);
  const [selectedPlace, setSelectedPlace] = useState<GeocodeResult | null>(null);

  // The sky screen's date, time and place arrive through sign-in once (ADR-140), and the whole form, the name too, comes
  // back from checkout (reading 2); read after mount, so a render React throws away cannot use up the draft. The reader
  // still submits it, and a form that kept no name leaves the name field as it is.
  useEffect(() => {
    const draft = takeFormDraft();
    if (!draft) return;
    if (draft.name) setName(draft.name);
    setBirthDate(draft.birthDate);
    setBirthTime(draft.time);
    setSelectedPlace(draft.place);
  }, []);

  const createReport = useCreateReport({
    mutation: {
      onSuccess: (data) => {
        navigate(`/report/${data.id}`);
      },
      onError: (err) => {
        console.error("[BirthForm] createReport failed:", err);
      },
    },
  });

  const time = toValue(birthTime);
  const canSubmit = isPersonName(name.trim()) && birthDate && time !== null && selectedPlace;
  // Said once the reader leaves the field, so a name is not scolded mid-word; it clears the moment the name is fine.
  const nameRule = nameLeft ? nameRuleLine(name) : null;

  // Told, never blocked: the reader may still save these details as someone else's (ADR-340).
  const ownChart = ownChartMatching(profiles, birthDate, time?.birthTime, selectedPlace);
  const { data: reports } = useListReports({
    query: { queryKey: getListReportsQueryKey(), enabled: !!ownChart, staleTime: 60_000 },
  });
  const ownReport = ownChart && Array.isArray(reports)
    ? reports
        .filter((r) => r.kind === "natal" && r.profileId === ownChart.id)
        .sort((x, y) => y.createdAt.localeCompare(x.createdAt))[0]
    : undefined;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !selectedPlace || !time) return;

    createReport.mutate(
      {
        data: {
          name: name.trim(),
          birthDate,
          birthTime: time.birthTime,
          birthTimeWindowMinutes: time.birthTimeWindowMinutes,
          birthPlace: selectedPlace.name,
          latitude: selectedPlace.latitude,
          longitude: selectedPlace.longitude,
          // The zone's offset at the birth, never the place's today (reading 1); the server works the chart out from the zone.
          timezoneOffset: offsetAtBirth(selectedPlace.timezone, birthDate, time.birthTime),
          timezone: selectedPlace.timezone,
          isForSelf: isSelf,
        },
      },
      {
        // With no credit the form keeps what was typed for the trip to checkout, and nothing is written for the
        // reader, who presses Write themselves when they are back (reading 2).
        onError: (err) => {
          if (isNoCredit(err)) saveFormDraft({ name: name.trim(), birthDate, time: birthTime, place: selectedPlace });
        },
      },
    );
  };

  const refusal = createReport.isError ? refusalLine(createReport.error) : null;
  const noCredit = createReport.isError && isNoCredit(createReport.error);
  // The reader's own day, so a birth today is allowed before UTC midnight and after it alike.
  const today = localDay(new Date());

  const reduceMotion = useReducedMotion();

  return (
    <AppPage
      header={
        <TopBar
          left={
            <>
              <TextButton onClick={() => navigate("/")}>
                <ArrowLeft className="h-4 w-4" />
                Back
              </TextButton>
              <Wordmark />
            </>
          }
        />
      }
    >
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="mx-auto w-full max-w-lg pt-12"
      >
        <div className="mb-10 text-center">
          <Eyebrow kind="kicker" className="mb-3 block">{PERSONAL_REPORT}</Eyebrow>
          <Heading style="page-title" className="mb-3">Enter your birth details</Heading>
          <Text>Your birth time and place make your chart exact.</Text>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            id="name"
            type="text"
            label="Your Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => setNameLeft(true)}
            error={nameRule ?? undefined}
            placeholder="First name or full name"
            required
          />

          <div className="grid gap-4">
            <div className="space-y-2">
              <label htmlFor="birthDate" className={FIELD_LABEL}>
                Birth Date
              </label>
              <BirthDateField
                id="birthDate"
                value={birthDate}
                onChange={setBirthDate}
                max={today}
                // Where the time is not typed (a part of the day, or unknown), the place is next.
                onComplete={() => focusById(TIME_ID) ?? focusById("birthPlace")}
              />
            </div>
          </div>

          {/* The three-way time with its live readout (ADR-33): the place comes after, so the readout waits for it. */}
          <BirthTimeControl
            value={birthTime}
            onChange={setBirthTime}
            birthDate={birthDate || undefined}
            latitude={selectedPlace?.latitude}
            longitude={selectedPlace?.longitude}
            timezone={selectedPlace?.timezone}
            country={selectedPlace?.country}
            timeId={TIME_ID}
            onTimeComplete={() => focusById("birthPlace")}
          />

          <PlaceField
            id="birthPlace"
            value={selectedPlace}
            onChange={setSelectedPlace}
            birthDate={birthDate}
            birthTime={time?.birthTime}
          />

          {/* "This chart is for me" toggle */}
          <TextButton
            bare
            // MB-163 provisional
            aria-pressed={isSelf}
            onClick={() => setIsSelf((v) => !v)}
            className={cn(
              "flex w-full items-center gap-3 rounded-card border px-4 py-3.5 text-left transition-colors duration-(--dur-fast) ease-[var(--ease)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
              isSelf ? "border-indigo-lt/40 bg-indigo/14" : "border-control-edge bg-surface hover:border-indigo-lt",
            )}
          >
            <div className={cn(
              "flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-inner border-2 transition-colors duration-(--dur-fast)",
              isSelf ? "border-indigo bg-indigo" : "border-control-edge bg-transparent",
            )}>
              {isSelf && <Check className="h-3 w-3 text-on-indigo" />}
            </div>
            <div>
              <p className={cn("m-0 text-ui font-medium leading-tight", isSelf ? "text-paper" : "text-paper-dim")}>
                This is my own chart
              </p>
              <p className="m-0 mt-0.5 text-caption leading-tight text-paper-dim">
                Saves this chart as yours on your profile
              </p>
            </div>
          </TextButton>

          {ownChart && (
            <p role="status" className="rounded-card border border-indigo-lt/40 bg-indigo/14 px-4 py-3 text-ui leading-snug text-paper">
              These are your own birth details.
              {ownReport && (
                <>
                  {" "}
                  <Link href={`/report/${ownReport.id}`} className="text-indigo-lt underline underline-offset-2">
                    Open your report
                  </Link>
                </>
              )}
            </p>
          )}

          <Button
            type="submit"
            full
            disabled={!canSubmit || createReport.isPending}
            busy={createReport.isPending ? "Writing" : undefined}
            className="disabled:cursor-not-allowed disabled:opacity-45 disabled:active:scale-100"
          >
            {isSelf ? "Write my report" : "Write their report"}
            <ArrowRight className="h-4 w-4" />
          </Button>

          {createReport.isError && (
            <div role="alert" className="space-y-1 text-center text-small text-error">
              {refusal ? (
                <>
                  <p>{refusal}</p>
                  {noCredit && (
                    <Button asChild variant="secondary" className="mt-2">
                      <Link href={checkoutHref(null, "/chart")}>Get credits</Link>
                    </Button>
                  )}
                </>
              ) : (
                <>
                  <p>Something went wrong. Please try again.</p>
                  <p className="break-all font-numeric text-caption opacity-80">
                    {createReport.error instanceof Error
                      ? createReport.error.message
                      : String(createReport.error)}
                  </p>
                </>
              )}
            </div>
          )}
        </form>
      </motion.div>
    </AppPage>
  );
}
