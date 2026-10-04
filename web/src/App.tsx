import { lazy, Suspense, useEffect, useRef, type ComponentType, type ReactNode } from "react";
import {
  Switch,
  Route,
  Redirect,
  Router as WouterRouter,
  useLocation,
} from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { ClerkProvider, SignIn, SignUp, useAuth, useClerk } from "@clerk/react";
import { shadcn } from "@clerk/themes";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import LoadingState from "@/components/LoadingState";
import ErrorBoundary from "@/components/ErrorBoundary";
import { ClerkStalled, ClerkStalledPage } from "@/components/ClerkStalled";
import { useClerkStalled } from "@/hooks/useClerkStalled";
import { StagingRibbon } from "@/components/StagingRibbon";
import { PrelaunchRibbon } from "@/components/PrelaunchRibbon";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { APP_ENV } from "@/lib/appEnv";
import { OPEN_BEFORE_LAUNCH, PRELAUNCH, PrelaunchViewProvider, useMounted, usePrelaunchView } from "@/lib/prelaunch";
import { usePageTitle } from "@/lib/page-title";
import { forgetSelection } from "@/lib/pair-selection";
import { PUBLIC_ROUTES } from "@/site/routes";

const importBirthForm = () => import("@/pages/BirthFormPage");
const importReport = () => import("@/pages/ReportPage");
const importDashboard = () => import("@/pages/DashboardPage");
const importTimeline = () => import("@/pages/TimelineAppPage");
const importAccount = () => import("@/pages/AccountPage");
const importCompatibility = () => import("@/pages/CompatibilityReportPage");
const importAdminPrompts = () => import("@/pages/AdminPromptsPage");
const importAdminLab = () => import("@/pages/AdminLabPage");
const importClaim = () => import("@/pages/ClaimPage");
const importAdminWaitlist = () => import("@/pages/AdminWaitlistPage");

const BirthFormPage = lazy(importBirthForm);
const ReportPage = lazy(importReport);
const DashboardPage = lazy(importDashboard);
const TimelineAppPage = lazy(importTimeline);
const AccountPage = lazy(importAccount);
const CompatibilityReportPage = lazy(importCompatibility);
const AdminPromptsPage = lazy(importAdminPrompts);
const AdminLabPage = lazy(importAdminLab);
const ClaimPage = lazy(importClaim);
const AdminWaitlistPage = lazy(importAdminWaitlist);

const SITE_PAGES = new Map(PUBLIC_ROUTES.map((route) => [route.path, lazy(route.load)]));
const SiteWaitlistPage = lazy(() => import("@/site/pages/WaitlistPage"));

/** The public page a prerendered document is, already loaded, so hydration renders it without suspending. */
export interface FirstPage {
  path: string;
  Page: ComponentType;
}

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 2, staleTime: 30_000 } },
});

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

// One Clerk application, one publishable key. This previously derived the
// key from window.location.hostname — a Replit trick for serving several
// Clerk custom domains from a single build, which on any other host risks
// resolving to the wrong key.
const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY");
}

// Clerk passes wouter setLocation absolute paths that already include the
// base; strip it so we don't double-prepend.
function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
    socialButtonsPlacement: "top" as const,
    socialButtonsVariant: "blockButton" as const,
  },
  variables: {
    colorPrimary: "hsl(234 48% 60%)",
    colorForeground: "hsl(220 14% 96%)",
    colorMutedForeground: "hsl(220 9% 70%)",
    colorDanger: "hsl(0 72% 60%)",
    colorBackground: "hsl(216 28% 9%)",
    colorInput: "hsl(216 28% 12%)",
    colorInputForeground: "hsl(220 14% 96%)",
    colorNeutral: "hsl(220 14% 25%)",
    fontFamily: "'Inter', system-ui, sans-serif",
    borderRadius: "0.75rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox:
      "bg-[hsl(216_28%_9%)] border border-[hsl(220_14%_18%)] rounded-2xl w-[440px] max-w-full overflow-hidden shadow-2xl",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle:
      "font-[\"Newsreader\",serif] text-2xl text-[hsl(220_14%_96%)]",
    headerSubtitle: "text-sm text-[hsl(220_9%_70%)]",
    socialButtonsBlockButtonText: "text-[hsl(220_14%_96%)] font-medium",
    formFieldLabel: "text-[hsl(220_14%_90%)] text-xs font-medium tracking-wide",
    footerActionLink:
      "text-[hsl(234_70%_72%)] hover:text-[hsl(234_70%_82%)] font-medium",
    footerActionText: "text-[hsl(220_9%_70%)]",
    dividerText: "text-[hsl(220_9%_60%)] text-xs uppercase tracking-wider",
    identityPreviewEditButton: "text-[hsl(234_70%_72%)]",
    formFieldSuccessText: "text-[hsl(150_60%_60%)]",
    alertText: "text-[hsl(220_14%_96%)]",
    logoBox: "flex justify-center mb-2",
    logoImage: "h-10 w-10",
    socialButtonsBlockButton:
      "border border-[hsl(220_14%_22%)] hover:bg-[hsl(220_14%_14%)] transition-colors",
    formButtonPrimary:
      "bg-gradient-to-r from-[hsl(234_48%_60%)] to-[hsl(280_50%_60%)] hover:opacity-90 text-white font-semibold tracking-wide normal-case",
    formFieldInput:
      "bg-[hsl(216_28%_12%)] border border-[hsl(220_14%_22%)] text-[hsl(220_14%_96%)] focus:border-[hsl(234_48%_60%)]",
    footerAction: "text-center",
    dividerLine: "bg-[hsl(220_14%_22%)]",
    alert: "bg-[hsl(216_28%_12%)] border border-[hsl(220_14%_22%)]",
    otpCodeFieldInput:
      "bg-[hsl(216_28%_12%)] border border-[hsl(220_14%_22%)] text-[hsl(220_14%_96%)]",
    formFieldRow: "space-y-1.5",
    main: "gap-5",
  },
};

function getReturnTo(): string {
  if (typeof window === "undefined") return "/";
  const params = new URLSearchParams(window.location.search);
  const ret = params.get("return_to");
  return ret && ret.startsWith("/") ? ret : "/";
}

function SignInPage() {
  usePageTitle("Sign in");
  const ret = getReturnTo();
  const fullRet = `${basePath}${ret === "/" ? "" : ret}` || "/";
  return (
    <div className="min-h-[100dvh] bg-background flex items-center justify-center px-4 py-10 bg-stars">
      <SignIn
        routing="path"
        path={`${basePath}/sign-in`}
        signUpUrl={`${basePath}/sign-up?return_to=${encodeURIComponent(ret)}`}
        forceRedirectUrl={fullRet}
        signUpForceRedirectUrl={fullRet}
      />
      {/* Until Clerk loads, its form draws nothing, so a blocked script would leave the page blank (MB-183). */}
      <ClerkStalled className="max-w-sm text-center" />
    </div>
  );
}

function SignUpPage() {
  usePageTitle("Create account");
  const ret = getReturnTo();
  const fullRet = `${basePath}${ret === "/" ? "" : ret}` || "/";
  return (
    <div className="min-h-[100dvh] bg-background flex items-center justify-center px-4 py-10 bg-stars">
      <SignUp
        routing="path"
        path={`${basePath}/sign-up`}
        signInUrl={`${basePath}/sign-in?return_to=${encodeURIComponent(ret)}`}
        forceRedirectUrl={fullRet}
        signInForceRedirectUrl={fullRet}
      />
      <ClerkStalled className="max-w-sm text-center" />
    </div>
  );
}

// Guards a route behind Clerk auth. Signed-out visitors are redirected to
// /sign-in with the full current path (including query string) as return_to.
function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  const clerkStalled = useClerkStalled();
  const [location, navigate] = useLocation();

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      navigate(`/sign-in?return_to=${encodeURIComponent(location)}`, { replace: true });
    }
  }, [isLoaded, isSignedIn, location, navigate]);

  if (!isLoaded) return clerkStalled ? <ClerkStalledPage /> : <LoadingState />;
  if (!isSignedIn) return null;
  return <>{children}</>;
}

// When the signed-in user changes, blow away cached queries so the dashboard
// doesn't briefly show the previous account's reports, and forget the pair the
// picker remembered, whose reports the next account may not see. It wraps
// rather than sits beside the routes, for WithSiblings' reason.
function ClerkQueryCacheInvalidator({ children }: { children: ReactNode }) {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prev = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    return addListener(({ user }) => {
      const id = user?.id ?? null;
      if (prev.current !== undefined && prev.current !== id) {
        qc.clear();
        // A sign-in from an anonymous session keeps the pair: it claims that session's reports.
        if (prev.current !== null) forgetSelection();
      }
      prev.current = id;
    });
  }, [addListener, qc]);
  return children;
}

function prefetchRoutes() {
  for (const t of [importBirthForm, importReport]) {
    t().catch(() => {});
  }
}

type IdleAPI = {
  requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
  cancelIdleCallback?: (handle: number) => void;
};

function useRoutePrefetch() {
  useEffect(() => {
    // Before launch a visitor never reaches these pages, so the public site does not spend their data on them.
    if (PRELAUNCH) return;
    const w = window as unknown as IdleAPI;
    if (typeof w.requestIdleCallback === "function") {
      const handle = w.requestIdleCallback(prefetchRoutes, { timeout: 2000 });
      return () => {
        if (typeof w.cancelIdleCallback === "function") w.cancelIdleCallback(handle);
      };
    }
    const handle = window.setTimeout(prefetchRoutes, 1500);
    return () => window.clearTimeout(handle);
  }, []);
}

/**
 * useId hands hydration the ids the server rendered only while every level above the page holds a single child, as
 * the prerender's shell does (entry-server.tsx). So a level's other children join once it has hydrated, which leaves
 * the ids already given as they are.
 */
function WithSiblings({ children, siblings }: { children: ReactNode; siblings: ReactNode }) {
  const mounted = useMounted();
  return mounted ? (
    <>
      {children}
      {siblings}
    </>
  ) : (
    children
  );
}

/**
 * Before launch, and in the preview, a visitor on an app path gets the waitlist page instead (readings 1 and 3);
 * sign-in and the admin stay the admin's way in, and once /api/admin/me says the signed-in user is the admin, the
 * whole app is theirs. A first paint never waits for Clerk: until it loads, everyone is a visitor.
 */
function AppGate({ children }: { children: ReactNode }) {
  const visitor = usePrelaunchView();
  const [location] = useLocation();
  if (!visitor || OPEN_BEFORE_LAUNCH.test(location)) return children;
  return (
    <Suspense fallback={<div className="min-h-[100dvh] bg-background" />}>
      <SiteWaitlistPage />
    </Suspense>
  );
}

/** The rest is spread whole because Switch passes in the match it found, which spares Route a second match. */
function AppRoute({ children, ...route }: { path: string; children: ReactNode }) {
  return (
    <Route {...route}>
      <AppGate>{children}</AppGate>
    </Route>
  );
}

/** The public site comes first and is everyone's; an unknown path answers with the page 404.html prerenders. */
function Routes({ first }: { first?: FirstPage }) {
  useRoutePrefetch();
  return (
    <Suspense fallback={<LoadingState />}>
      <Switch>
        {PUBLIC_ROUTES.map(({ path }) => (
          <Route key={path} path={path} component={first && first.path === path ? first.Page : SITE_PAGES.get(path)} />
        ))}
        <AppRoute path="/sign-in/*?">
          <SignInPage />
        </AppRoute>
        <AppRoute path="/sign-up/*?">
          <SignUpPage />
        </AppRoute>
        <AppRoute path="/chart">
          <RequireAuth>
            <BirthFormPage />
          </RequireAuth>
        </AppRoute>
        {/* One page: a report is read while it is written (ADR-48), so the old waiting room redirects. */}
        <Route path="/generating/:id">{(params) => <Redirect to={`/report/${params.id}`} />}</Route>
        <AppRoute path="/report/:id">
          <ReportPage />
        </AppRoute>
        <AppRoute path="/compatibility/:id">
          <CompatibilityReportPage />
        </AppRoute>
        {/* Access is known only for a signed-in reader, so a signed-out one signs in first and then gets the page or /timeline (reading 1). */}
        <AppRoute path="/dashboard/timeline">
          <RequireAuth>
            <TimelineAppPage />
          </RequireAuth>
        </AppRoute>
        <AppRoute path="/dashboard/account">
          <RequireAuth>
            <AccountPage />
          </RequireAuth>
        </AppRoute>
        <AppRoute path="/dashboard">
          <DashboardPage />
        </AppRoute>
        <Route path="/people">{() => <Redirect to="/dashboard" />}</Route>
        <AppRoute path="/claim">
          <ClaimPage />
        </AppRoute>
        <AppRoute path="/admin/prompts">
          <AdminPromptsPage />
        </AppRoute>
        <AppRoute path="/admin/report-lab">
          <AdminLabPage />
        </AppRoute>
        <AppRoute path="/admin/waitlist">
          <AdminWaitlistPage />
        </AppRoute>
        <Route path="/admin">{() => <Redirect to="/admin/waitlist" />}</Route>
        <Route path="/login">{() => <Redirect to="/sign-in" />}</Route>
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

/** The admin's reminder, on production before launch, that visitors see the waitlist over the site (ADR-141). */
function AdminRibbon() {
  const isAdmin = useIsAdmin();
  return PRELAUNCH && isAdmin ? <PrelaunchRibbon /> : null;
}

function ClerkRoutedProvider({ first }: { first?: FirstPage }) {
  const [location, setLocation] = useLocation();
  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: {
          start: {
            title: "Welcome back",
            subtitle: "Sign in to access your charts",
          },
        },
        signUp: {
          start: {
            title: "Create your Stars Decoded account",
            subtitle: "Save your reports and access them anywhere",
          },
        },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <ClerkQueryCacheInvalidator>
        <PrelaunchViewProvider>
          <WithSiblings siblings={<AdminRibbon />}>
            {/* The outer boundary sits above the router and never sees a navigation; this one resets on each, by prop rather than key, so no page or Clerk sign-in step remounts. */}
            <ErrorBoundary resetKey={location}>
              <Routes first={first} />
            </ErrorBoundary>
          </WithSiblings>
        </PrelaunchViewProvider>
      </ClerkQueryCacheInvalidator>
    </ClerkProvider>
  );
}

function App({ first }: { first?: FirstPage }) {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WithSiblings
            siblings={
              <>
                <Toaster />
                {APP_ENV === "staging" && <StagingRibbon />}
              </>
            }
          >
            <WouterRouter base={basePath}>
              <ClerkRoutedProvider first={first} />
            </WouterRouter>
          </WithSiblings>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
