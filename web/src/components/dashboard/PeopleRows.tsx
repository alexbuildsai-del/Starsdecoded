/**
 * People (ADR-182): the reader and everyone whose Personal report they can
 * read, the same people as the circle, one row each that opens the report on
 * a tap and keeps its actions (review-01-10, scope 3): This is me ✓ or Share
 * with {name} in view; Not me, Stop sharing and Delete report behind "⋯".
 * Who is listed and what a row shows come from GET /home; the share, the giver
 * and the profile each action needs come from the lists its route refreshes
 * (reading 4). The page mounts it bare, so it holds its own dialogs.
 */
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetHomeQueryKey,
  getListProfilesQueryKey,
  getListReportsQueryKey,
  useGetHome,
  useListProfiles,
  useListReports,
  useUpdateProfile,
  type HomePerson,
  type ProfileSummary,
  type ReportSummary,
} from "@workspace/api-client-react";
import { BirthTimeDialog } from "@/components/BirthTimeDialog";
import { DeleteReportDialog } from "@/components/DeleteReportDialog";
import { SendDialog, type SendTarget } from "@/components/SendDialog";
import { StatusDots } from "@/components/StatusDots";
import { ListRow, MENU_DANGER, MenuItem, ROW_ACTION, ROW_DONE, ROW_STATUS } from "@/components/dashboard/RowMenu";
import { StopSharingDialog, type StopTarget } from "@/components/dashboard/StopSharingDialog";
import { useToast } from "@/hooks/use-toast";
import { birthDateText, ownIds } from "@/lib/home-view";
import { initials } from "@/lib/orbit";
import { pairedWithReader, personRowView, sharedWaiting, signsLine, signsSpoken } from "@/lib/pair-row";
import { shareWith } from "@/lib/share-card";

interface PersonRowProps {
  person: HomePerson;
  report: ReportSummary | undefined;
  profile: ProfileSummary | undefined;
  unmarked: boolean;
  violet: boolean;
  onShare: (target: SendTarget) => void;
  onMark: (person: HomePerson, mine: boolean) => void;
  onBirthTime: (profile: ProfileSummary) => void;
  onStop: (target: StopTarget) => void;
}

function PersonRow({ person, report, profile, unmarked, violet, onShare, onMark, onBirthTime, onStop }: PersonRowProps) {
  const send = report?.send ?? profile?.send ?? null;
  const view = personRowView({
    isSelf: person.isSelf,
    access: person.access,
    // The page polls the list while a report is under way; GET /home keeps the status it was read with.
    status: report?.status ?? person.status,
    ownership: profile?.ownership,
    horizon: report?.horizon ?? profile?.horizon,
    send,
    giver: profile?.giverName ?? report?.sharedBy ?? null,
    unmarked,
  });
  const date = birthDateText(person.birthDate);
  const signs = signsLine(person.triad);
  const spoken = signsSpoken(person.triad);

  const actions = [
    view.busy && (
      <span key="busy" className="font-label text-xs text-[#9FA8DA]">
        <StatusDots label={view.busy} />
      </span>
    ),
    view.self && <span key="self" className={ROW_DONE}>This is me ✓</span>,
    view.mark && (
      <button key="mark" type="button" onClick={() => onMark(person, true)} className={ROW_ACTION}>
        This is me
      </button>
    ),
    view.share?.kind === "offer" && send && (
      <button key="share" type="button" onClick={() => onShare({ kind: "person", send, reportId: person.reportId })} className={ROW_ACTION}>
        {shareWith(view.share.name)}
      </button>
    ),
    view.share?.kind === "waiting" && <span key="waiting" className={ROW_STATUS}>{sharedWaiting(view.share.name)}</span>,
    view.share?.kind === "joined" && <span key="joined" className={ROW_DONE}>Joined ✓</span>,
    view.addBirthTime && profile && (
      <button key="time" type="button" onClick={() => onBirthTime(profile)} className={ROW_ACTION}>
        Add birth time
      </button>
    ),
  ].filter(Boolean);
  const stopWith = view.stopWith;

  return (
    <ListRow
      initials={initials(person.name)}
      violet={violet}
      title={person.name}
      href={view.opens ? `/report/${person.reportId}` : undefined}
      sub={
        <>
          <span aria-hidden="true">{signs ? `${date} · ${signs}` : date}</span>
          <span className="sr-only">{`Born ${date}.${spoken ? ` ${spoken}.` : ""}`}</span>
        </>
      }
      moreLabel={`More for ${person.name}`}
      actions={actions.length > 0 ? actions : null}
      menu={
        <>
          {view.notMe && <MenuItem onSelect={() => onMark(person, false)}>Not me</MenuItem>}
          {stopWith && (
            <MenuItem onSelect={() => onStop({ kind: "profile", id: person.profileId, name: stopWith })}>Stop sharing with {stopWith}</MenuItem>
          )}
          <DeleteReportDialog reportId={person.reportId} personName={person.name} handsOver={view.handsOver} className={MENU_DANGER} />
        </>
      }
    />
  );
}

export function PeopleRows() {
  const client = useQueryClient();
  const { toast } = useToast();
  const home = useGetHome({ query: { queryKey: getGetHomeQueryKey() } }).data;
  const reports = useListReports({ query: { queryKey: getListReportsQueryKey() } }).data;
  const profiles = useListProfiles({ query: { queryKey: getListProfilesQueryKey() } }).data;
  const [sendTarget, setSendTarget] = useState<SendTarget | null>(null);
  const [stopTarget, setStopTarget] = useState<StopTarget | null>(null);
  const [timeTarget, setTimeTarget] = useState<ProfileSummary | null>(null);

  // A mark moves the circle's centre and what each row offers, so all three reads follow it.
  const refresh = () => {
    void client.invalidateQueries({ queryKey: getListProfilesQueryKey() });
    void client.invalidateQueries({ queryKey: getListReportsQueryKey() });
    void client.invalidateQueries({ queryKey: getGetHomeQueryKey() });
  };
  const updateProfile = useUpdateProfile({
    mutation: {
      onSuccess: refresh,
      onError: () => toast({ variant: "destructive", title: "We couldn't save that", description: "Try again in a minute." }),
    },
  });
  // The writer marks their own chart; the person a chart was sent to says This is me or Not me (ADR-120).
  const mark = (person: HomePerson, mine: boolean) =>
    updateProfile.mutate({ id: person.profileId, data: person.access === "claimed" ? { claimedAsSelf: mine } : { isSelf: mine } });

  if (!home) return null;
  const listed = Array.isArray(reports) ? new Map(reports.map((r) => [r.id, r])) : null;
  const byProfile = new Map((Array.isArray(profiles) ? profiles : []).map((p) => [p.id, p]));
  // A delete refreshes the lists, not GET /home, so a report gone from them leaves the rows before home catches up.
  const people = [...(home.you ? [home.you] : []), ...home.people]
    .filter((person) => !listed || listed.has(person.reportId))
    .sort((x, y) => Number(y.isSelf) - Number(x.isSelf));
  const own = ownIds(home);
  const violet = pairedWithReader(home.pairs, own);
  const unmarked = Array.isArray(profiles) ? !profiles.some((p) => p.isSelf === true) : own.size === 0;

  return (
    <>
      {people.length === 0 ? (
        <p className="text-[13px] leading-snug text-[#9AA3B5]">No reports yet.</p>
      ) : (
        <div className="@container">
          <ul className="grid gap-2 @min-[620px]:grid-cols-2">
            {people.map((person) => (
              <PersonRow
                key={person.profileId}
                person={person}
                report={listed?.get(person.reportId)}
                profile={byProfile.get(person.profileId)}
                unmarked={unmarked}
                violet={violet.has(person.profileId)}
                onShare={setSendTarget}
                onMark={mark}
                onBirthTime={setTimeTarget}
                onStop={setStopTarget}
              />
            ))}
          </ul>
        </div>
      )}
      <SendDialog open={!!sendTarget} onClose={() => setSendTarget(null)} target={sendTarget} />
      <StopSharingDialog target={stopTarget} onClose={() => setStopTarget(null)} />
      {timeTarget && (
        <BirthTimeDialog
          open
          onClose={() => setTimeTarget(null)}
          profile={{
            id: timeTarget.id,
            name: timeTarget.name,
            birthDate: timeTarget.birthDate,
            birthTime: timeTarget.birthTime,
            birthTimeWindowMinutes: timeTarget.birthTimeWindowMinutes ?? 720,
            birthPlace: timeTarget.birthPlace,
            latitude: timeTarget.latitude,
            longitude: timeTarget.longitude,
            timezone: timeTarget.timezone,
            timezoneOffset: timeTarget.timezoneOffset,
          }}
          onDone={refresh}
        />
      )}
    </>
  );
}

export default PeopleRows;
