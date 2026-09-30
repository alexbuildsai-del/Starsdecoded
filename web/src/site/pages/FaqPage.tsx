import { SiteLayout } from "../SiteLayout";
import { pageFor } from "../site";

const page = pageFor("/faq");

export default function FaqPage() {
  return <SiteLayout page={page} />;
}
