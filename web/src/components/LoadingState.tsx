interface LoadingStateProps {
  label?: string;
}

export default function LoadingState({ label = "Loading…" }: LoadingStateProps) {
  return (
    <div
      className="min-h-screen bg-background flex items-center justify-center"
      role="status"
      aria-live="polite"
    >
      <div className="text-center">
        <div className="text-4xl mb-4 animate-spin inline-block" aria-hidden>
          ☉
        </div>
        <p className="text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
