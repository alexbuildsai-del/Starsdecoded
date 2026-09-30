import { SiteLayout } from "../SiteLayout";
import { pageFor } from "../site";

const page = pageFor("/learn/whole-sign-houses");

export default function LearnHousesPage() {
  return <SiteLayout page={page} />;
}
