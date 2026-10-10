import { Loader } from "@/ds/atoms/Loader";

interface LoadingStateProps {
  label?: string;
}

// The dots stand in for the ellipsis, so a label written with one loses it rather than showing both.
export default function LoadingState({ label = "Loading…" }: LoadingStateProps) {
  return <Loader label={label.replace(/…$/, "")} />;
}
