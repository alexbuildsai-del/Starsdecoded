import { SiteLayout } from "../SiteLayout";
import { pageFor } from "../site";

const page = pageFor("/waitlist");

export default function WaitlistPage() {
  return <SiteLayout page={page} />;
}
