import { useEffect, useRef, useState } from "react";
import { useParams, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useGetReportStatus, getGetReportStatusQueryKey } from "@workspace/api-client-react";

const STEPS = [
  {
    key: "pending",
    label: "Reading your birth data",
    description: "Locating the moment you arrived...",
  },
  {
    key: "computing",
    label: "Mapping the skies",
    description: "Calculating planetary positions at your exact birth moment...",
  },
  {
    key: "interpreting",
    label: "Crafting your reading",
    description: "Weaving your psychological portrait with AI...",
  },
  {
    key: "complete",
    label: "Your chart is ready",
    description: "",
  },
];

const PHASE_CEILINGS: Record<string, number> = {
  pending: 15,
  computing: 45,
  interpreting: 92,
  complete: 100,
};

const EASE_FACTOR = 0.55;
const EASE_FACTOR_COMPLETE = 1.8;
// Minimum velocity (% per second) ensures the bar NEVER freezes.
// For non-complete phases this lets it slowly crawl past the phase ceiling
// toward the 99.9 hard cap — visible motion even if a phase runs very long.
const MIN_VELOCITY = 0.005;
const MIN_VELOCITY_COMPLETE = 0.2;
// Hard visual cap for non-complete phases — keeps it just below 100% so the
// user can tell the report isn't actually ready yet.
const NON_COMPLETE_HARD_CAP = 99.9;
const NAVIGATE_THRESHOLD = 99.5;

// Seconds before a failed poll is retried manually.
const RETRY_SECONDS = 5;

function StarField() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: 60 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full bg-white"
          style={{
            width: Math.random() * 2 + 0.5,
            height: Math.random() * 2 + 0.5,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{ opacity: [0.2, 0.8, 0.2] }}
          transition={{
            duration: Math.random() * 3 + 2,
            delay: Math.random() * 4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

function SpinningWheel({ progress }: { progress: number }) {
  const planets = ["☉", "☽", "☿", "♀", "♂", "♃", "♄"];
  const radii = [60, 90, 115, 135, 150, 165, 175];
  const speeds = [8, 12, 5, 7, 15, 25, 35];

  return (
    <div className="relative" style={{ width: 380, height: 380 }}>
      {/* Rings */}
      {radii.map((r, i) => (
        <div
          key={r}
          className="absolute left-1/2 top-1/2 chart-ring transition-opacity duration-1000"
          style={{
            width: r * 2,
            height: r * 2,
            marginLeft: -r,
            marginTop: -r,
            opacity: (i / radii.length) * 0.5 + 0.1,
          }}
        />
      ))}

      {/* Rotating planets */}
      {planets.map((symbol, i) => (
        <motion.div
          key={symbol}
          className="absolute left-1/2 top-1/2 pointer-events-none"
          style={{ width: radii[i] * 2, height: radii[i] * 2, marginLeft: -radii[i], marginTop: -radii[i] }}
          animate={{ rotate: 360 }}
          transition={{ duration: speeds[i], repeat: Infinity, ease: "linear" }}
        >
          <span className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 text-base text-primary/70">
            {symbol}
          </span>
        </motion.div>
      ))}

      {/* Progress arc centre */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="font-display text-4xl mb-1 gradient-text"
        >
          {Math.round(progress)}%
        </motion.div>
        <div className="font-label text-xs text-muted-foreground tracking-wider">COMPUTING</div>
      </div>
    </div>
  );
}

export default function GenerationPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const hasNavigated = useRef(false);

  // Incremented after every refetch attempt (success or failure) so the
  // countdown effect re-runs even when isError stays true between attempts.
  const [retryVersion, setRetryVersion] = useState(0);

  const { data: status, isError, refetch } = useGetReportStatus(id!, {
    query: {
      queryKey: getGetReportStatusQueryKey(id!),
      refetchInterval: (query) => {
        // Pause the automatic interval during error so the manual countdown
        // has full control and the two mechanisms don't race.
        if (query.state.status === "error") return false;
        const data = query.state.data;
        if (!data) return 2000;
        if (data.status === "complete" || data.status === "failed") return false;
        return 2000;
      },
      retry: false,            // countdown handles retry timing
      refetchOnWindowFocus: false, // visibilitychange listener handles this
      enabled: !!id,
    },
  });

  const serverStatus = status?.status ?? "pending";

  const [retryCountdown, setRetryCountdown] = useState<number | null>(null);

  useEffect(() => {
    if (!isError) {
      setRetryCountdown(null);
      return;
    }

    setRetryCountdown(RETRY_SECONDS);
    let cancelled = false;

    const interval = setInterval(() => {
      setRetryCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          if (!cancelled) {
            refetch().finally(() => {
              if (!cancelled) {
                // Bump retryVersion to restart the cycle if isError stays true,
                // or exit cleanly if the refetch succeeded (isError → false).
                setRetryVersion((v) => v + 1);
              }
            });
          }
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [isError, retryVersion, refetch]);

  // Refetch immediately when the user returns to a backgrounded tab so a
  // report that completed offline triggers navigation right away.
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        refetch();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [refetch]);

  const [displayProgress, setDisplayProgress] = useState(0);
  const displayProgressRef = useRef(0);
  const ceilingRef = useRef(PHASE_CEILINGS["pending"]);
  const isCompleteRef = useRef(false);
  const isErrorRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  // Keep the error ref in sync so the RAF tick can read it without a stale closure.
  useEffect(() => {
    isErrorRef.current = isError;
  }, [isError]);

  useEffect(() => {
    // Always sync refs so the running RAF loop picks up the new phase immediately.
    ceilingRef.current = PHASE_CEILINGS[serverStatus] ?? 15;
    isCompleteRef.current = serverStatus === "complete";

    if (rafRef.current !== null) return;

    const tick = (now: number) => {
      const dt = lastTimeRef.current !== null ? Math.min((now - lastTimeRef.current) / 1000, 0.1) : 0.016;
      lastTimeRef.current = now;

      // While in error state, freeze the bar so the user knows something is wrong.
      // The retry countdown communicates that progress will resume.
      if (!isErrorRef.current) {
        const current = displayProgressRef.current;
        const ceiling = ceilingRef.current;
        const isComplete = isCompleteRef.current;

        const factor = isComplete ? EASE_FACTOR_COMPLETE : EASE_FACTOR;
        const minVel = isComplete ? MIN_VELOCITY_COMPLETE : MIN_VELOCITY;

        // gap may go negative if the bar has already crawled past the phase ceiling —
        // that's intentional: minVel * dt then takes over and keeps the bar moving.
        const gap = ceiling - current;
        const delta = Math.max(gap * factor * dt, minVel * dt);

        // Hard caps: non-complete phases are capped at 99.9 so the bar never reads
        // 100% before the server confirms completion.
        const hardCap = isComplete ? 100 : NON_COMPLETE_HARD_CAP;
        const next = Math.min(current + delta, hardCap);

        displayProgressRef.current = next;
        setDisplayProgress(next);
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
        lastTimeRef.current = null;
      }
    };
  }, [serverStatus]);


  // Navigate once displayProgress reaches the threshold — this guarantees the bar
  // visually fills to ~100% before leaving the screen. A hard timeout backstop
  // of 2 s prevents the user being stuck if the RAF loop is somehow slow.
  useEffect(() => {
    if (status?.status !== "complete" || hasNavigated.current) return;

    hasNavigated.current = true;

    const maxTimeout = setTimeout(() => {
      navigate(`/report/${id}`);
    }, 2000);

    const poll = setInterval(() => {
      if (displayProgressRef.current >= NAVIGATE_THRESHOLD) {
        clearInterval(poll);
        clearTimeout(maxTimeout);
        navigate(`/report/${id}`);
      }
    }, 50);

    return () => {
      clearInterval(poll);
      clearTimeout(maxTimeout);
    };
  }, [status?.status, id, navigate]);

  const currentStep = STEPS.find((s) => s.key === serverStatus) ?? STEPS[0];

  const stepOrder = ["pending", "computing", "interpreting"];

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center relative overflow-hidden">
      <StarField />

      {/* Subtle glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div
          className="rounded-full blur-3xl opacity-10"
          style={{ width: 600, height: 600, background: "radial-gradient(circle, hsl(234 48% 60%), transparent 70%)" }}
        />
      </div>

      <div className="relative z-10 flex flex-col items-center px-6 text-center">
        {/* Chart wheel */}
        <div className="mb-10">
          <SpinningWheel progress={displayProgress} />
        </div>

        {/* Status */}
        <AnimatePresence mode="wait">
          <motion.div
            key={serverStatus}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mb-8"
          >
            <h2 className="font-display text-2xl font-light mb-2">
              {serverStatus === "failed" ? "Something went wrong" : currentStep.label}
            </h2>
            <p className="text-muted-foreground text-sm max-w-sm">
              {serverStatus === "failed"
                ? (status?.errorMessage ?? "An unexpected error occurred.")
                : currentStep.description}
            </p>
          </motion.div>
        </AnimatePresence>

        {/* Progress bar — driven directly by RAF, no Framer animate */}
        <div className="w-72 h-1 bg-muted rounded-full overflow-hidden mb-8">
          <div
            className="h-full gradient-primary rounded-full"
            style={{ width: `${displayProgress}%` }}
          />
        </div>

        {/* Step indicators */}
        <div className="flex items-center gap-3">
          {stepOrder.map((key, i) => {
            const currentIdx = stepOrder.indexOf(serverStatus);
            // complete means all prior steps finished
            const isDone = serverStatus === "complete" || currentIdx > i;
            const isActive = key === serverStatus;
            return (
              <div key={key} className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full transition-all duration-500 ${
                    isDone
                      ? "bg-primary"
                      : isActive
                      ? "bg-primary animate-pulse"
                      : "bg-muted-foreground/30"
                  }`}
                />
                {i < 2 && <div className="w-8 h-px bg-border" />}
              </div>
            );
          })}
        </div>

        {/* Connection error banner with retry countdown */}
        <AnimatePresence>
          {isError && (
            <motion.div
              key="error-banner"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.25 }}
              className="mt-6 flex items-center gap-2 text-sm text-destructive"
            >
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-destructive animate-pulse shrink-0" />
              {retryCountdown !== null
                ? `Connection lost — reconnecting in ${retryCountdown} s…`
                : "Reconnecting…"}
            </motion.div>
          )}
        </AnimatePresence>

        {serverStatus === "failed" && (
          <button
            onClick={() => navigate("/chart")}
            className="mt-6 text-sm text-primary hover:underline font-label"
          >
            Try again
          </button>
        )}
      </div>
    </div>
  );
}
