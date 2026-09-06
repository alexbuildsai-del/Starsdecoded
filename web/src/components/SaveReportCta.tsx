import { Show } from "@clerk/react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Sparkles, Lock, Check } from "lucide-react";

/**
 * "Save your report" prompt shown to anonymous visitors viewing a report
 * tied to their current session. After sign-in the server claims the
 * matching profile/reports automatically, so this CTA needs no
 * post-login wiring beyond returning the user to the report page.
 */
export function SaveReportCta({ reportId }: { reportId: string }) {
  const [, navigate] = useLocation();

  return (
    <Show when="signed-out">
      <div className="no-print rounded-xl border border-primary/30 bg-primary/5 p-5 mb-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-full bg-primary/15 p-2">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="font-display text-base text-foreground">
              Save your report
            </p>
            <p className="text-sm text-muted-foreground">
              Create a free account to keep your chart and access it on any
              device. Your report will be linked to your account
              automatically.
            </p>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button
            size="sm"
            variant="ghost"
            onClick={() =>
              navigate(`/sign-in?return_to=${encodeURIComponent(`/report/${reportId}`)}`)
            }
          >
            Sign in
          </Button>
          <Button
            size="sm"
            className="gradient-primary text-white border-0 font-label font-semibold"
            onClick={() =>
              navigate(`/sign-up?return_to=${encodeURIComponent(`/report/${reportId}`)}`)
            }
          >
            Create free account
          </Button>
        </div>
      </div>
    </Show>
  );
}

/**
 * "Unlock full report" / "Save permanently" action button rendered at the
 * end of the report. Gated on auth: signed-out users get bounced to the
 * sign-up flow with a return_to so they land back on the same report
 * (where the server has already claimed their profile). Signed-in users
 * see a confirmation pill — their report is already saved to their
 * account.
 */
export function UnlockReportButton({ reportId }: { reportId: string }) {
  const [, navigate] = useLocation();
  const ret = encodeURIComponent(`/report/${reportId}`);

  return (
    <>
      <Show when="signed-out">
        <Button
          size="lg"
          onClick={() => navigate(`/sign-up?return_to=${ret}`)}
          className="gradient-primary text-white border-0 font-label font-semibold px-8"
        >
          <Lock className="mr-2 h-4 w-4" />
          Unlock &amp; Save Permanently
        </Button>
      </Show>
      <Show when="signed-in">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-label text-primary/90">
          <Check className="h-4 w-4" />
          Saved to your account
        </div>
      </Show>
    </>
  );
}
