/**
 * The one door to the horizon pass (ADR-35): the three-way control with its
 * live readout, opened from the hero, the house deck, the method strip, the
 * dashboard tile and the claim. Saving calls PATCH /profiles/:id/birth-time,
 * which recomputes the chart and starts a pass on the newest complete natal
 * report of the profile; the older ones are left outdated, each offering
 * Regenerate (MB-170). The first pass is free; the copy says so.
 */
import { useId, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getListProfilesQueryKey, getListReportsQueryKey, useUpdateProfileBirthTime, type BirthTimeUpdateResponse,
} from "@workspace/api-client-react";
import { Button } from "@/ds/atoms/Button";
import { InlineError } from "@/ds/molecules/Alert";
import { Eyebrow } from "@/ds/atoms/Eyebrow";
import { BirthTimeControl } from "@/ds/molecules/BirthFields";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/ds/organisms/Dialog";
import { fromValue, toValue, type BirthTimeAnswer } from "@/lib/birth-time";
import { refusalLine } from "@/lib/refusals";

export interface BirthTimeProfile {
  id: string;
  name: string;
  birthDate: string;
  birthTime: string;
  birthTimeWindowMinutes: number;
  birthPlace?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string | null;
  timezoneOffset?: number;
  /** How many passes the profile's report has had; the first is free. */
  horizonPasses?: number;
}

export interface BirthTimeDialogProps {
  open: boolean;
  onClose: () => void;
  profile: BirthTimeProfile;
  onDone?: (result: BirthTimeUpdateResponse) => void;
  /** The claim's framing: the person confirming their own time rather than adding one. */
  title?: string;
  description?: string;
}

/** The country is the last part of the place the geocoder returned, when it gave one. */
function countryOf(place?: string): string | null {
  if (!place) return null;
  const parts = place.split(",").map((p) => p.trim()).filter(Boolean);
  return parts.length > 1 ? parts[parts.length - 1] : null;
}

export function BirthTimeDialog({ open, onClose, profile, onDone, title, description }: BirthTimeDialogProps) {
  const client = useQueryClient();
  const saveId = useId();
  const [answer, setAnswer] = useState<BirthTimeAnswer>(() => fromValue({ birthTime: profile.birthTime, birthTimeWindowMinutes: profile.birthTimeWindowMinutes }));
  const update = useUpdateProfileBirthTime();
  const value = toValue(answer);
  const unchanged = value !== null && value.birthTime === profile.birthTime && value.birthTimeWindowMinutes === profile.birthTimeWindowMinutes;
  const free = (profile.horizonPasses ?? 0) === 0;

  function save() {
    if (!value) return;
    update.mutate({ id: profile.id, data: value }, {
      onSuccess: (res) => {
        client.invalidateQueries({ queryKey: getListProfilesQueryKey() });
        client.invalidateQueries({ queryKey: getListReportsQueryKey() });
        onDone?.(res);
        onClose();
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title ?? `${profile.name}'s birth time`}</DialogTitle>
          <DialogDescription>
            {description ?? "Your birth time gives you your rising sign, your houses and day or night. The report keeps every word it can. We'll show you what changed."}
          </DialogDescription>
        </DialogHeader>
        <BirthTimeControl
          value={answer}
          onChange={setAnswer}
          birthDate={profile.birthDate}
          latitude={profile.latitude}
          longitude={profile.longitude}
          timezone={profile.timezone}
          timezoneOffset={profile.timezoneOffset}
          country={countryOf(profile.birthPlace)}
          compact
          // No place field follows in the dialog, so a whole time sends focus to Save, the step it was typed for (reading 8);
          // a frame later, once the new value has enabled the button.
          onTimeComplete={() => requestAnimationFrame(() => document.getElementById(saveId)?.focus())}
        />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <Eyebrow>{free ? "Free. We'll show you what changed." : "We'll show you what changed."}</Eyebrow>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>Not now</Button>
            <Button id={saveId} onClick={save} disabled={!value || unchanged || update.isPending}>
              {update.isPending ? "Saving…" : "Save and update"}
            </Button>
          </div>
        </div>
        {update.isError && (
          <InlineError>
            {refusalLine(update.error) ??
              (update.error instanceof Error && /widened|already running|in_progress/i.test(update.error.message)
                ? update.error.message
                : "Could not save the time. Try again in a minute.")}
          </InlineError>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default BirthTimeDialog;
