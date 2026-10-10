import { Show, useUser, useClerk } from "@clerk/react";
import { useLocation } from "wouter";
import { Button } from "@/ds/atoms/Button";
import {
  Menu,
  MenuContent,
  MenuItem,
  MenuLabel,
  MenuSeparator,
  MenuTrigger,
} from "@/ds/organisms/Menu";
import { User as UserIcon } from "lucide-react";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { useTimelineAccess } from "@/lib/timeline-access";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

/**
 * Header-aligned account control. Renders a "Sign in" button for anonymous
 * visitors and, for a signed-in reader, a dropdown with their reports, Timeline
 * only when they have it (ADR-262), their Account page (ADR-263) and sign-out.
 * The admin's part adds the dashboard as a new visitor sees it, in its own tab
 * so the admin's dashboard stays open in this one (ADR-389, reading 21).
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
        <Button size="compact" variant="secondary" onClick={() => navigate("/sign-in")}>
          Sign in
        </Button>
      </Show>
      <Show when="signed-in">
        <Menu>
          <MenuTrigger asChild>
            <Button size="compact" variant="secondary">
              <UserIcon />
              <span className="hidden sm:inline truncate max-w-[160px]">
                {user?.primaryEmailAddress?.emailAddress ?? "Account"}
              </span>
            </Button>
          </MenuTrigger>
          <MenuContent align="end" className="w-56">
            <MenuLabel>
              Signed in
            </MenuLabel>
            <MenuItem onClick={() => navigate("/dashboard")}>
              My reports
            </MenuItem>
            {hasTimeline && (
              <MenuItem onClick={() => navigate("/dashboard/timeline")}>
                Timeline
              </MenuItem>
            )}
            <MenuItem onClick={() => navigate("/dashboard/account")}>
              Account
            </MenuItem>
            {isAdmin && (
              <>
                <MenuSeparator />
                <MenuLabel>
                  Admin
                </MenuLabel>
                <MenuItem onClick={() => navigate("/admin/prompts")}>
                  Prompts
                </MenuItem>
                <MenuItem onClick={() => navigate("/admin/sales")}>
                  Sales
                </MenuItem>
                <MenuItem asChild>
                  <a href={`${basePath}/dashboard?visitor=new`} target="_blank" rel="noopener noreferrer">
                    See the dashboard as a new visitor
                  </a>
                </MenuItem>
              </>
            )}
            <MenuSeparator />
            <MenuItem
              onClick={() =>
                signOut(() => navigate("/")).catch(() => {
                  /* swallow — user already signed out locally */
                })
              }
            >
              Sign out
            </MenuItem>
          </MenuContent>
        </Menu>
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
