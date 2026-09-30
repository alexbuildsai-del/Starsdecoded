import { SiteLayout } from "../SiteLayout";
import { pageFor } from "../site";

const page = pageFor("/sky");

export default function SkyPage() {
  return <SiteLayout page={page} />;
}
