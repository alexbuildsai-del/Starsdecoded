import { SiteLayout } from "../SiteLayout";
import { pageFor } from "../site";

const page = pageFor("/compatibility");

export default function CompatibilityPage() {
  return <SiteLayout page={page} />;
}
