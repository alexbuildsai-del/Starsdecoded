import { SiteLayout } from "../SiteLayout";
import { pageFor } from "../site";
import BirthTime from "../sections/BirthTime";
import Claims from "../sections/Claims";
import Dawn from "../sections/Dawn";
import Faq from "../sections/Faq";
import Hero from "../sections/Hero";
import Inside from "../sections/Inside";
import Method from "../sections/Method";
import Pricing from "../sections/Pricing";
import TwoCharts from "../sections/TwoCharts";
import YourPeople from "../sections/YourPeople";

const page = pageFor("/");

/** The sections stand in the locked order (landing-and-ai-search, scope 2 to 13), prices above the questions (ADR-118). */
export default function HomePage() {
  return (
    <SiteLayout page={page}>
      <Hero />
      <Claims />
      <Inside />
      <YourPeople />
      <TwoCharts />
      <Method />
      <BirthTime />
      <Pricing />
      <Faq />
      <Dawn />
    </SiteLayout>
  );
}
