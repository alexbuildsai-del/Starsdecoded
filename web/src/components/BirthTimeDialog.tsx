/**
 * The one door to the horizon pass (ADR-35): the three-way control with its
 * live readout, opened from the hero, the explorer, the method strip, the
 * dashboard tile and the claim. Saving calls PATCH /profiles/:id/birth-time,
 * which recomputes the chart and starts a pass on every complete natal
 * report of the profile. The first pass is free; the copy says so.
 */
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getListProfilesQueryKey, getListReportsQueryKey, useUpdateProfileBirthTime, type BirthTimeUpdateResponse,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BirthTimeControl } from "@/components/BirthTimeControl";
import { fromValue, toValue, type BirthTimeAnswer } from "@/lib/birth-time";

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
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">{title ?? `${profile.name}'s birth time`}</DialogTitle>
          <DialogDescription>
            {description ?? "The hour draws the horizon: the rising sign, the houses, day or night and the Lots. The report keeps every word it can and marks each change."}
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
        />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <p className="font-label text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            {free ? "Free. Every change is marked." : "Every change is marked."}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="font-label">Not now</Button>
            <Button onClick={save} disabled={!value || unchanged || update.isPending} className="font-label">
              {update.isPending ? "Saving…" : "Save and redraw"}
            </Button>
          </div>
        </div>
        {update.isError && (
          <p className="text-xs text-destructive">
            {update.error instanceof Error && /widened|already running|in_progress/i.test(update.error.message)
              ? update.error.message
              : "Could not save the time. Try again in a minute."}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default BirthTimeDialog;
