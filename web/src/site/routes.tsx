import type { ComponentType } from "react";
import { SAMPLE_LIVE, type PagePath } from "./site";

export interface PublicRoute {
  path: PagePath;
  load: () => Promise<{ default: ComponentType }>;
}

export const PUBLIC_ROUTES: readonly PublicRoute[] = [
  { path: "/", load: () => import("./pages/HomePage") },
  { path: "/sky", load: () => import("./pages/SkyPage") },
  // MB-90 provisional: behind the constant, a production build never reaches the import, so her report stays out of it.
  ...(SAMPLE_LIVE ? [{ path: "/sample" as const, load: () => import("./pages/SamplePage") }] : []),
  { path: "/method", load: () => import("./pages/MethodPage") },
  { path: "/compatibility", load: () => import("./pages/CompatibilityPage") },
  { path: "/learn/whole-sign-houses", load: () => import("./pages/LearnHousesPage") },
  { path: "/learn/birth-time", load: () => import("./pages/LearnBirthTimePage") },
  { path: "/faq", load: () => import("./pages/FaqPage") },
  { path: "/waitlist", load: () => import("./pages/WaitlistPage") },
  { path: "/privacy", load: () => import("@/pages/legal/PrivacyPage") },
  { path: "/terms", load: () => import("@/pages/legal/TermsPage") },
  { path: "/refunds", load: () => import("@/pages/legal/RefundsPage") },
  { path: "/company", load: () => import("@/pages/legal/CompanyPage") },
];
