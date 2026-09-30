/**
 * The site's two calls, Get my report and Sign in, with one HTML for both
 * states (reading 2): a production build before launch points the link at
 * /waitlist, every other build at the real door, and the click decides on the
 * client. A visitor before launch, or anyone in the preview, gets the waitlist
 * over the page; anyone else goes through sign-in to the birth form (ADR-140).
 * Launch stays one edit, `LAUNCHED = true`.
 */
import type { MouseEvent, ReactNode } from "react";
import { Link } from "wouter";
import { usePrelaunchView, useSignedInView } from "@/lib/prelaunch";
import { useWaitlistDialog } from "@/site/WaitlistDialog";

interface CtaProps {
  /** Where on the site the call sits; the waitlist stores it with the address. */
  source: string;
  className?: string;
}

function useDoor(source: string, door: string) {
  const visitor = usePrelaunchView();
  const { open } = useWaitlistDialog();
  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (!visitor) return;
    event.preventDefault();
    open(source);
  };
  return {
    href: visitor ? "/waitlist" : door,
    onClick,
    "aria-haspopup": visitor ? ("dialog" as const) : undefined,
  };
}

/** `/chart` sits behind sign-in, so a signed-out reader signs in first and lands on the birth form. */
export function ReportCta({ source, className, children }: CtaProps & { children?: ReactNode }) {
  const door = useDoor(source, "/chart");
  return (
    <Link {...door} className={className}>
      {children ?? "Get my report"}
    </Link>
  );
}

export function SignInCta({ source, className }: CtaProps) {
  const visitor = usePrelaunchView();
  const dashboard = useSignedInView() && !visitor;
  const door = useDoor(source, dashboard ? "/dashboard" : "/sign-in?return_to=/dashboard");
  return (
    <Link {...door} className={className}>
      {dashboard ? "Dashboard" : "Sign in"}
    </Link>
  );
}
