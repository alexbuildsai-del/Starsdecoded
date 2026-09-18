import { useEffect, useRef, useState } from "react";
import { useParams, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useGetReportStatus, getGetReportStatusQueryKey } from "@workspace/api-client-react";

/**
 * One moment, not a progress bar. The report opens the instant the chart is
 * stored and writes itself in front of the reader (ADR-25), so this screen has
 * nothing left to estimate: it waits for the chart and leaves.
 */
const POLL_MS = 1000;

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

function SpinningWheel() {
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
          className="font-label text-xs text-muted-foreground tracking-wider"
        >
          COMPUTING
        </motion.div>
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
        if (!data) return POLL_MS;
        if (data.chartReady || data.status === "complete" || data.status === "failed") return false;
        return POLL_MS;
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

  // The chart is what the report opens on, so the moment it exists this screen
  // is done. A failed run stays here to say so.
  useEffect(() => {
    if (hasNavigated.current) return;
    if (!status?.chartReady && status?.status !== "complete") return;
    hasNavigated.current = true;
    navigate(`/report/${id}`);
  }, [status?.chartReady, status?.status, id, navigate]);

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
          <SpinningWheel />
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
            <h2 className="font-display text-2xl mb-2">
              {serverStatus === "failed" ? "Something went wrong" : "Computing your chart"}
            </h2>
            <p className="text-muted-foreground text-sm max-w-sm">
              {serverStatus === "failed"
                ? (status?.errorMessage ?? "An unexpected error occurred.")
                : "Your report opens the moment the positions are in. The chapters arrive as they are written."}
            </p>
          </motion.div>
        </AnimatePresence>

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
