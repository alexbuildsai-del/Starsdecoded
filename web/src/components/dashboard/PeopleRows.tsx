/**
 * People (ADR-182): the reader and everyone whose Personal report they can
 * read, the same people as the circle, one row each that opens the report on
 * a tap and keeps its actions (review-01-10, scope 3): This is me ✓ or Share
 * with {name} in view, which opens the one Share window; Not me, Stop sharing
 * and Delete report behind "⋯". Its second line is the date of the report and
 * the three signs (review-05-10 §7).
 * A report that could not be written keeps its row, which says why in its
 * coded line (ADR-84), opens nothing, and offers Try again where the reader may
 * run it again, free (ADR-313); one the API finally could not write has no Try again and
 * shows its line that the credit is back. Not me on a report sent to the reader hands it back
 * (ADR-236), and its writer's row then reads Handed back with Send again; a
 * send still waiting can go to a corrected address (ADR-237).
 * Who is listed and what a row shows come from GET /home; the share, the giver,
 * why a report failed and the profile each action needs come from the lists
 * its route refreshes (reading 4). The page mounts it bare, so it holds its own
 * dialogs.
 */
import { useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetHomeQueryKey,
  getListProfilesQueryKey,
  getListReportsQueryKey,
  useListProfiles,
  useListReports,
  useRegenerateReport,
  useUpdateProfile,
  type HomePerson,
  type ProfileSummary,
  type ReportSummary,
} from "@workspace/api-client-react";
import { BirthTimeDialog } from "@/components/BirthTimeDialog";
import { DeleteReportDialog } from "@/components/DeleteReportDialog";
import { StatusDots } from "@/components/StatusDots";
import { HandBackDialog, type HandBackTarget } from "@/components/dashboard/HandBackDialog";
import { ListRow, MENU_DANGER, MenuItem, ROW_ACTION, ROW_DONE, ROW_STATUS } from "@/components/dashboard/RowMenu";
import { StopSharingDialog, type StopTarget } from "@/components/dashboard/StopSharingDialog";
import { ShareWindow, type ShareTarget } from "@/components/share/ShareWindow";
import { useToast } from "@/hooks/use-toast";
import { useHome } from "@/hooks/useHome";
import { TRY_AGAIN, birthDateText, failureLine, isFailed, ownIds } from "@/lib/home-view";
import { initials } from "@/lib/orbit";
import { HANDED_BACK, SEND_AGAIN, pairedWithReader, personRowView, reportFromText, sharedWaiting, signsLine, signsSpoken } from "@/lib/pair-row";
import { refusalLine } from "@/lib/refusals";
import { shareWith } from "@/lib/share-card";

interface PersonRowProps {
  person: HomePerson;
  report: ReportSummary | undefined;
  profile: ProfileSummary | undefined;
  unmarked: boolean;
  violet: boolean;
  /** This row's Try again is under way. */
  retrying: boolean;
  onShare: (target: ShareTarget) => void;
  onMark: (person: HomePerson, mine: boolean) => void;
  onHandBack: (target: HandBackTarget) => void;
  onRetry: (reportId: string) => void;
  onBirthTime: (profile: ProfileSummary) => void;
  onStop: (target: StopTarget) => void;
}

function PersonRow(props: PersonRowProps) {
  const { person, report, profile, unmarked, violet, retrying, onShare, onMark, onHandBack, onRetry, onBirthTime, onStop } = props;
  const send = report?.send ?? profile?.send ?? null;
  const giver = profile?.giverName ?? report?.sharedBy ?? null;
  // The page polls the list while a report is under way; GET /home keeps the status it was read with.
  const status = report?.status ?? person.status;
  const view = personRowView({
    isSelf: person.isSelf,
    access: person.access,
    status,
    ownership: profile?.ownership,
    horizon: report?.horizon ?? profile?.horizon,
    send,
    giver,
    unmarked,
    canRegenerate: person.canRegenerate,
    name: person.name,
  });
  const written = reportFromText(person.createdAt);
  const line = written ?? birthDateText(person.birthDate);
  const signs = signsLine(person.triad);
  const spoken = signsSpoken(person.triad);

  const shareTarget: ShareTarget = { kind: "person", profileId: person.profileId, name: view.share?.name ?? person.name };

  const actions = [
    view.busy && (
      <span key="busy" className="font-label text-xs text-[#9FA8DA]">
        <StatusDots label={view.busy} />
      </span>
    ),
    isFailed(status) && <span key="failed" className={ROW_STATUS}>{failureLine(report)}</span>,
    view.retry && (
      <span key="retry" className="inline-flex flex-col items-start gap-1">
        <button
          type="button"
          onClick={() => onRetry(person.reportId)}
          disabled={retrying}
          aria-describedby={`free-${person.reportId}`}
          className={ROW_ACTION}
        >
          {retrying ? <StatusDots label={TRY_AGAIN.starting} /> : TRY_AGAIN.label}
        </button>
        <span id={`free-${person.reportId}`} className={ROW_STATUS}>{TRY_AGAIN.free}</span>
      </span>
    ),
    view.self && <span key="self" className={ROW_DONE}>This is me ✓</span>,
    view.mark && (
      <button key="mark" type="button" onClick={() => onMark(person, true)} className={ROW_ACTION}>
        This is me
      </button>
    ),
    view.handedBack && <span key="back" className={ROW_STATUS}>{HANDED_BACK}</span>,
    view.share?.kind === "offer" && send && (
      <button key="share" type="button" onClick={() => onShare(shareTarget)} className={ROW_ACTION}>
        {view.handedBack ? SEND_AGAIN : shareWith(view.share.name)}
      </button>
    ),
    view.share?.kind === "waiting" && <span key="waiting" className={ROW_STATUS}>{sharedWaiting(view.share.name)}</span>,
    view.changeAddress && send && (
      <button key="address" type="button" onClick={() => onShare(shareTarget)} className={ROW_ACTION}>
        Change address
      </button>
    ),
    view.share?.kind === "joined" && <span key="joined" className={ROW_STATUS}>Joined ✓</span>,
    view.addBirthTime && profile && (
      <button key="time" type="button" onClick={() => onBirthTime(profile)} className={ROW_ACTION}>
        Add birth time
      </button>
    ),
  ].filter(Boolean);

  const stopWith = view.stopWith;
  const menu: ReactNode[] = [
    view.notMe && (
      <MenuItem
        key="not-me"
        onSelect={() => (view.handBack ? onHandBack({ profileId: person.profileId, giverFirstName: giver ?? "" }) : onMark(person, false))}
      >
        Not me
      </MenuItem>
    ),
    stopWith && (
      <MenuItem key="stop" onSelect={() => onStop({ kind: "profile", id: person.profileId, name: stopWith, subject: view.stopSubject })}>
        Stop sharing with {stopWith}
      </MenuItem>
    ),
    view.deletes && (
      <DeleteReportDialog key="delete" reportId={person.reportId} personName={person.name} handsOver={view.handsOver} className={MENU_DANGER} />
    ),
  ].filter(Boolean);

  return (
    <ListRow
      initials={initials(person.name)}
      violet={violet}
      title={person.name}
      href={view.opens ? `/report/${person.reportId}` : undefined}
      sub={
        <>
          <span aria-hidden="true">{signs ? `${line} · ${signs}` : line}</span>
          <span className="sr-only">{`${written ?? `Born ${line}`}.${spoken ? ` ${spoken}.` : ""}`}</span>
        </>
      }
      moreLabel={`More for ${person.name}`}
      actions={actions.length > 0 ? actions : null}
      menu={menu.length > 0 ? menu : null}
    />
  );
}

export function PeopleRows() {
  const client = useQueryClient();
  const { toast } = useToast();
  const home = useHome().data;
  const reports = useListReports({ query: { queryKey: getListReportsQueryKey() } }).data;
  const profiles = useListProfiles({ query: { queryKey: getListProfilesQueryKey() } }).data;
  // The target stays after a close so the window can finish leaving with its own words.
  const [sharing, setSharing] = useState<{ target: ShareTarget; open: boolean } | null>(null);
  const [stopTarget, setStopTarget] = useState<StopTarget | null>(null);
  const [handBackTarget, setHandBackTarget] = useState<HandBackTarget | null>(null);
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
  // The writer marks their own chart; the person a chart was sent to says This is me, and Not me hands it back (ADR-120, 236).
  const mark = (person: HomePerson, mine: boolean) =>
    updateProfile.mutate({ id: person.profileId, data: person.access === "claimed" ? { claimedAsSelf: mine } : { isSelf: mine } });

  // Settled, not only started: the list then reads the report as written again, and the page polls it from there.
  const regenerate = useRegenerateReport({
    mutation: {
      onSettled: refresh,
      onError: (err) => {
        // 409: it is already being written, which the refreshed row shows.
        if (err.status === 409) return;
        toast({ variant: "destructive", title: "We couldn't start it again", description: refusalLine(err) ?? "Try again in a minute." });
      },
    },
  });

  if (!home) return null;
  const listed = Array.isArray(reports) ? new Map(reports.map((r) => [r.id, r])) : null;
  const byProfile = new Map((Array.isArray(profiles) ? profiles : []).map((p) => [p.id, p]));
  // A delete refetches the lists and GET /home together, and a list may land first, so a report gone from it leaves the rows at once.
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
                retrying={regenerate.isPending && regenerate.variables?.id === person.reportId}
                onShare={(target) => setSharing({ target, open: true })}
                onMark={mark}
                onHandBack={setHandBackTarget}
                onRetry={(id) => regenerate.mutate({ id })}
                onBirthTime={setTimeTarget}
                onStop={setStopTarget}
              />
            ))}
          </ul>
        </div>
      )}
      {sharing && <ShareWindow open={sharing.open} onClose={() => setSharing({ ...sharing, open: false })} target={sharing.target} />}
      <StopSharingDialog target={stopTarget} onClose={() => setStopTarget(null)} />
      <HandBackDialog target={handBackTarget} onClose={() => setHandBackTarget(null)} />
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
