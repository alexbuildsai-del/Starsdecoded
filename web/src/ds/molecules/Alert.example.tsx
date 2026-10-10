import { Alert, InlineError } from "./Alert";

export default function AlertExample() {
  return (
    <div className="grid max-w-md gap-4">
      <InlineError>We couldn't stop sharing. Try again in a minute.</InlineError>
      <InlineError>Use letters, spaces, apostrophes, hyphens and dots, up to 60 characters.</InlineError>
      <Alert>The payment didn't go through. Try again, or use another card.</Alert>
      <Alert>Pick the first and the last day.</Alert>
      <Alert tone="notice">Your reading is still being written.</Alert>
    </div>
  );
}
