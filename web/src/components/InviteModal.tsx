import { useEffect, useMemo, useState } from "react";
import { Loader2, Send, Copy, Check, Mail, MailX } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useCreateInvite,
  getListProfilesQueryKey,
  getListRelationshipsQueryKey,
  getGetSynastryReportQueryKey,
  getListInvitesQueryKey,
  type InviteSummary,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

type Props = {
  open: boolean;
  onClose: () => void;
  profileId: string;
  profileName: string;
  relationshipId?: string | null;
  reportId?: string | null;
};

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function InviteModal({
  open,
  onClose,
  profileId,
  profileName,
  relationshipId,
  reportId,
}: Props) {
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [link, setLink] = useState<string | null>(null);
  const [emailDelivered, setEmailDelivered] = useState<boolean | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) {
      setEmail("");
      setLink(null);
      setEmailDelivered(null);
      setCopied(false);
    }
  }, [open]);

  const createInvite = useCreateInvite({
    mutation: {
      onSuccess: (data: InviteSummary) => {
        const claimPath = `/claim?token=${encodeURIComponent(data.token)}`;
        const url = `${window.location.origin}${basePath}${claimPath}`;
        setLink(url);
        setEmailDelivered(data.emailDelivered ?? null);
        qc.invalidateQueries({ queryKey: getListProfilesQueryKey() });
        qc.invalidateQueries({ queryKey: getListRelationshipsQueryKey() });
        qc.invalidateQueries({ queryKey: getListInvitesQueryKey({ profileId }) });
        if (reportId) {
          qc.invalidateQueries({ queryKey: getGetSynastryReportQueryKey(reportId) });
        }
      },
    },
  });

  const valid = useMemo(() => /.+@.+\..+/.test(email.trim()), [email]);

  const handleSend = () => {
    if (!valid || createInvite.isPending) return;
    createInvite.mutate({
      data: {
        profileId,
        email: email.trim(),
        relationshipId: relationshipId ?? undefined,
      },
    });
  };

  const handleCopy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (!o ? onClose() : undefined)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl font-light">
            Invite {profileName}
          </DialogTitle>
          <DialogDescription>
            Share access to this chart and any reports it's part of. They'll
            sign in to claim it.
          </DialogDescription>
        </DialogHeader>

        {!link ? (
          <div className="space-y-4">
            <div>
              <Label htmlFor="invite-email" className="text-xs uppercase tracking-wide">
                Their email
              </Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="them@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                data-testid="input-invite-email"
                className="mt-2"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
              />
            </div>
            {createInvite.isError && (
              <p className="text-sm text-destructive">
                Could not create the invite. Please try again.
              </p>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                disabled={!valid || createInvite.isPending}
                onClick={handleSend}
                className="gradient-primary text-white border-0 gap-1.5"
                data-testid="button-send-invite"
              >
                {createInvite.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Send invite
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {emailDelivered === true ? (
              <div className="flex items-start gap-2.5 rounded-md bg-emerald-950/40 border border-emerald-800/50 px-3 py-2.5">
                <Mail className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                <p className="text-sm text-emerald-300">
                  Invite sent to <span className="font-medium">{email}</span>.
                  They'll receive an email with their link.
                </p>
              </div>
            ) : (
              <div className="flex items-start gap-2.5 rounded-md bg-amber-950/40 border border-amber-800/50 px-3 py-2.5">
                <MailX className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                <p className="text-sm text-amber-300">
                  Email couldn't be sent — share this link directly:
                </p>
              </div>
            )}
            <div className="flex gap-2">
              <Input
                readOnly
                value={link}
                className="font-mono text-xs"
                data-testid="text-invite-link"
                onFocus={(e) => e.currentTarget.select()}
              />
              <Button
                variant="outline"
                onClick={handleCopy}
                className="shrink-0 gap-1.5"
                data-testid="button-copy-invite"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-emerald-400" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
            <div className="flex justify-end pt-2">
              <Button onClick={onClose} variant="outline">
                Done
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
