import { SiteLayout } from "../SiteLayout";
import { pageFor } from "../site";

const page = pageFor("/learn/birth-time");

export default function LearnBirthTimePage() {
  return <SiteLayout page={page} />;
}
