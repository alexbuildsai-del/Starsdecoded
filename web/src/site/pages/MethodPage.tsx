import { SiteLayout } from "../SiteLayout";
import { pageFor } from "../site";

const page = pageFor("/method");

export default function MethodPage() {
  return <SiteLayout page={page} />;
}
