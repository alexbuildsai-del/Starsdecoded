import { Mail, MailX, HelpCircle, Clock } from "lucide-react";
import { useListInvites, getListInvitesQueryKey, type InviteRecord } from "@workspace/api-client-react";

type Props = {
  profileId: string;
};

function formatRelativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function DeliveryBadge({ delivered }: { delivered: boolean | null | undefined }) {
  if (delivered === true) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-label text-emerald-400">
        <Mail className="h-3 w-3" />
        Delivered
      </span>
    );
  }
  if (delivered === false) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-label text-amber-400">
        <MailX className="h-3 w-3" />
        Not delivered
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-label text-muted-foreground">
      <HelpCircle className="h-3 w-3" />
      Unknown
    </span>
  );
}

export default function ProfileInviteHistory({ profileId }: Props) {
  const params = { profileId };
  const { data, isLoading } = useListInvites(params, {
    query: { queryKey: getListInvitesQueryKey(params), staleTime: 30_000 },
  });

  const invites: InviteRecord[] = Array.isArray(data) ? data : [];

  if (isLoading) {
    return (
      <div className="mt-2 text-[10px] text-muted-foreground animate-pulse">
        Loading invites…
      </div>
    );
  }

  if (invites.length === 0) return null;

  return (
    <div className="mt-2 space-y-1.5">
      {invites.map((inv) => (
        <div
          key={inv.id}
          className="rounded-md bg-background/60 border border-border/40 px-2.5 py-1.5 flex items-center justify-between gap-2"
          data-testid={`invite-record-${inv.id}`}
        >
          <div className="min-w-0">
            <p className="text-xs text-foreground truncate" title={inv.email}>
              {inv.email}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Clock className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
              <span className="text-[10px] text-muted-foreground">
                {formatRelativeDate(inv.sentAt)}
              </span>
            </div>
          </div>
          <DeliveryBadge delivered={inv.emailDelivered} />
        </div>
      ))}
    </div>
  );
}
