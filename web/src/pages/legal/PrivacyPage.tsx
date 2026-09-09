import { LegalLayout, LegalSection } from "./LegalLayout";

// MB-31 and MB-33 provisional: entity, region and retention are placeholders
// until the Owner fills them in.
export default function PrivacyPage() {
  return (
    <LegalLayout kicker="Legal" title="Privacy policy" updated="9 September 2026">
      <LegalSection title="Who we are">
        <p>
          Stars Decoded is operated by [LEGAL ENTITY], [ADDRESS], [COUNTRY]. Questions about this
          policy go to [CONTACT EMAIL].
        </p>
      </LegalSection>

      <LegalSection title="What we collect">
        <p>
          To compute a natal chart we need a name, a birth date, a birth time and a birth place.
          Birth data is personal data under the GDPR. We also store the computed planetary
          positions, the report text written from them, and the session cookie that ties them to
          your browser. If you sign in, we store the account identifier our sign-in provider gives
          us and the email address on that account.
        </p>
        <p>We do not collect health data, and the report makes no health, medical or clinical claims.</p>
      </LegalSection>

      <LegalSection title="How the report is made">
        <p>
          Planetary positions are computed on our server with astronomy-engine. The report is
          written by a general language model at OpenAI, which receives the name you entered and
          the computed positions, not your raw birth date, time or place. Nothing is trained on
          your data.
        </p>
      </LegalSection>

      <LegalSection title="Processors we use">
        <p>These services receive data because the code calls them. Regions are marked where not yet confirmed.</p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Supabase, the Postgres database that stores profiles, reports and accounts. Region: [REGION].</li>
          <li>OpenAI, which receives the name and computed positions to write the report.</li>
          <li>Clerk, which handles sign-in and holds your account email.</li>
          <li>Resend, which sends invitation emails when you invite a second person.</li>
          <li>Vercel, which serves the web app. Region: [REGION].</li>
          <li>Railway, which runs the API. Region: [REGION].</li>
          <li>
            Nominatim (OpenStreetMap) and timeapi.io, which your browser calls directly to look up
            the birth place and its time zone. Those requests carry the place name you type, not your name.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="Retention and deletion">
        <p>
          Reports and birth data are kept for [RETENTION] or until you delete them. You can delete
          a report from your dashboard at any time. Deleting a report removes the report itself and,
          when no other report or relationship uses it, the birth data behind it. A record of any
          purchase is kept, without birth data, for accounting.
        </p>
      </LegalSection>

      <LegalSection title="Your rights">
        <p>
          You can ask for a copy of your data, ask us to correct or delete it, or object to how we
          use it, by writing to [CONTACT EMAIL]. You can complain to the supervisory authority in
          [COUNTRY].
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
