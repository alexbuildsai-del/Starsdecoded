import { SiteLayout } from "../SiteLayout";
import { pageFor } from "../site";

const page = pageFor("/sample");

export default function SamplePage() {
  return <SiteLayout page={page} />;
}
