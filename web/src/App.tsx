import { lazy, Suspense, useEffect, useRef } from "react";
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
import LandingPage from "@/pages/LandingPage";
import NotFound from "@/pages/not-found";
import LoadingState from "@/components/LoadingState";

const importBirthForm = () => import("@/pages/BirthFormPage");
const importGeneration = () => import("@/pages/GenerationPage");
const importReport = () => import("@/pages/ReportPage");
const importDashboard = () => import("@/pages/DashboardPage");
const importAdmin = () => import("@/pages/MeaningLibraryAdminPage");
const importAdminPrompts = () => import("@/pages/AdminPromptsPage");
const importSynastry = () => import("@/pages/SynastryReportPage");
const importClaim = () => import("@/pages/ClaimPage");

const BirthFormPage = lazy(importBirthForm);
const GenerationPage = lazy(importGeneration);
const ReportPage = lazy(importReport);
const DashboardPage = lazy(importDashboard);
const MeaningLibraryAdminPage = lazy(importAdmin);
const AdminPromptsPage = lazy(importAdminPrompts);
const SynastryReportPage = lazy(importSynastry);
const ClaimPage = lazy(importClaim);

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
      "font-[\"Noto_Serif\",serif] text-2xl font-light text-[hsl(220_14%_96%)]",
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
    </div>
  );
}

function SignUpPage() {
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
    </div>
  );
}

// Guards a route behind Clerk auth. Signed-out visitors are redirected to
// /sign-in with the full current path (including query string) as return_to.
function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  const [location, navigate] = useLocation();

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      navigate(`/sign-in?return_to=${encodeURIComponent(location)}`, { replace: true });
    }
  }, [isLoaded, isSignedIn, location, navigate]);

  if (!isLoaded) return <LoadingState />;
  if (!isSignedIn) return null;
  return <>{children}</>;
}

// When the signed-in user changes, blow away cached queries so the dashboard
// doesn't briefly show the previous account's reports.
function ClerkQueryCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prev = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    return addListener(({ user }) => {
      const id = user?.id ?? null;
      if (prev.current !== undefined && prev.current !== id) qc.clear();
      prev.current = id;
    });
  }, [addListener, qc]);
  return null;
}

function prefetchRoutes() {
  for (const t of [importBirthForm, importGeneration, importReport]) {
    t().catch(() => {});
  }
}

type IdleAPI = {
  requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
  cancelIdleCallback?: (handle: number) => void;
};

function useRoutePrefetch() {
  useEffect(() => {
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

function Routes() {
  useRoutePrefetch();
  return (
    <Suspense fallback={<LoadingState />}>
      <Switch>
        <Route path="/" component={LandingPage} />
        <Route path="/sign-in/*?" component={SignInPage} />
        <Route path="/sign-up/*?" component={SignUpPage} />
        <Route path="/chart">{() => <RequireAuth><BirthFormPage /></RequireAuth>}</Route>
        <Route path="/generating/:id" component={GenerationPage} />
        <Route path="/report/:id" component={ReportPage} />
        <Route path="/dashboard" component={DashboardPage} />
        <Route path="/people">{() => <Redirect to="/dashboard" />}</Route>
        <Route path="/synastry/:id" component={SynastryReportPage} />
        <Route path="/claim" component={ClaimPage} />
        <Route path="/admin/meanings" component={MeaningLibraryAdminPage} />
        <Route path="/admin/prompts" component={AdminPromptsPage} />
        <Route path="/login">{() => <Redirect to="/sign-in" />}</Route>
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function ClerkRoutedProvider() {
  const [, setLocation] = useLocation();
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
            title: "Create your Astra account",
            subtitle: "Save your reports and access them anywhere",
          },
        },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <ClerkQueryCacheInvalidator />
      <Routes />
    </ClerkProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={basePath}>
          <ClerkRoutedProvider />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
