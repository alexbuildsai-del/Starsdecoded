import { Show, useUser, useClerk } from "@clerk/react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CircleUser, LogOut, User as UserIcon, LayoutDashboard, Orbit, Receipt, Shield } from "lucide-react";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { useTimelineAccess } from "@/lib/timeline-access";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

/**
 * Header-aligned account control. Renders a "Sign in" button for anonymous
 * visitors and, for a signed-in reader, a dropdown with their reports, Timeline
 * only when they have it (ADR-262), their Account page (ADR-263) and sign-out.
 * Designed to slot into the right side of any page nav.
 */
export function AccountMenu() {
  const [, navigate] = useLocation();
  const { signOut } = useClerk();
  const { user } = useUser();
  const isAdmin = useIsAdmin();
  // Read with the page rather than when the menu opens, so Timeline is already there or not and never pops in.
  const { access: hasTimeline } = useTimelineAccess();

  return (
    <>
      <Show when="signed-out">
        <Button
          size="sm"
          variant="ghost"
          className="font-label text-xs"
          onClick={() => navigate("/sign-in")}
        >
          Sign in
        </Button>
      </Show>
      <Show when="signed-in">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              className="font-label text-xs gap-2"
            >
              <UserIcon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline truncate max-w-[160px]">
                {user?.primaryEmailAddress?.emailAddress ?? "Account"}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-label text-[10px] tracking-wider uppercase text-muted-foreground">
              Signed in
            </DropdownMenuLabel>
            <DropdownMenuItem onClick={() => navigate("/dashboard")}>
              <LayoutDashboard className="h-4 w-4 mr-2" /> My reports
            </DropdownMenuItem>
            {hasTimeline && (
              <DropdownMenuItem onClick={() => navigate("/dashboard/timeline")}>
                <Orbit className="h-4 w-4 mr-2" /> Timeline
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => navigate("/dashboard/account")}>
              <CircleUser className="h-4 w-4 mr-2" /> Account
            </DropdownMenuItem>
            {isAdmin && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="font-label text-[10px] tracking-wider uppercase text-muted-foreground">
                  Admin
                </DropdownMenuLabel>
                <DropdownMenuItem onClick={() => navigate("/admin/prompts")}>
                  <Shield className="h-4 w-4 mr-2" /> Prompts
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/admin/sales")}>
                  <Receipt className="h-4 w-4 mr-2" /> Sales
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() =>
                signOut(() => navigate("/")).catch(() => {
                  /* swallow — user already signed out locally */
                })
              }
            >
              <LogOut className="h-4 w-4 mr-2" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </Show>
    </>
  );
}

export { basePath as accountBasePath };

// Convenience: navigate to sign-in with a return-to query param.
export function useSignInWithReturn() {
  const [location, navigate] = useLocation();
  return () => {
    const ret = encodeURIComponent(location);
    navigate(`/sign-in?return_to=${ret}`);
  };
}

// Convenience: build the full sign-up URL (used by Clerk's redirects).
export function fullSignUpUrl() {
  return `${basePath}/sign-up`;
}
