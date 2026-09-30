import { useState } from "react";
import { Link, useSearch } from "wouter";
import { waitlistReady } from "@workspace/commerce";
import { ConfirmWaitlist } from "@/components/waitlist/ConfirmWaitlist";
import { WaitlistForm } from "@/components/waitlist/WaitlistForm";
import { APP_ENV } from "@/lib/appEnv";
import { useMounted } from "@/lib/prelaunch";
import { PERSONAL_REPORT } from "@/lib/product";
import { CONFIRM_LINK_DAYS, waitlistOpen } from "@/lib/waitlist";
import { PageHead, SiteLayout } from "../SiteLayout";
import { pageFor } from "../site";

const page = pageFor("/waitlist");
const houses = pageFor("/learn/whole-sign-houses");
const birthTime = pageFor("/learn/birth-time");

// The form decides the same way from the same build, so the steps below never describe emails a closed form cannot send.
const TAKES_SIGNUPS = waitlistOpen(APP_ENV, waitlistReady());

const STEPS = [
  { title: "We email you a link", text: "The link confirms your address. Until you open it, you're not on the list." },
  {
    title: `You open it within ${CONFIRM_LINK_DAYS} days`,
    text: `That puts your address on the list. A link you don't open stops working after ${CONFIRM_LINK_DAYS} days, and we delete the address.`,
  },
  {
    title: "We email you when we launch",
    text: `You hear from us once more, when you can get your ${PERSONAL_REPORT}. We use your address for nothing else.`,
  },
];

/** The emailed link's token (ADR-145), read after mount: the prerendered page is one page for everyone and has no query. */
function useConfirmToken(): string | null {
  const mounted = useMounted();
  const search = useSearch();
  return mounted ? new URLSearchParams(search).get("confirm") : null;
}

export default function WaitlistPage() {
  const [joined, setJoined] = useState<string | null>(null);
  const token = useConfirmToken();

  return (
    <SiteLayout
      page={page}
      head={
        <PageHead page={page}>
          {/* The confirmation brings its own form when a link has expired, so the page's own steps aside for it. */}
          <div className="sd-panel mt-1">
            {token === null ? <WaitlistForm source="page" joined={joined} onJoined={setJoined} /> : <ConfirmWaitlist token={token} />}
          </div>
        </PageHead>
      }
      end={
        <section aria-labelledby="wait-h">
          <h2 id="wait-h" className="sd-eyebrow">
            While you wait
          </h2>
          <div className="sd-rel mt-4">
            <Link className="sd-relcard" href="/">
              <span className="sd-eyebrow">{PERSONAL_REPORT}</span>
              <b>What your report covers</b>
              <span>How you think, work and love</span>
            </Link>
            <Link className="sd-relcard" href={houses.path}>
              <span className="sd-eyebrow">Learn</span>
              <b>{houses.h1}</b>
              <span>Why every house is one sign</span>
            </Link>
            <Link className="sd-relcard" href={birthTime.path}>
              <span className="sd-eyebrow">Learn</span>
              <b>{birthTime.h1}</b>
              <span>What changes without it, and where to look for it</span>
            </Link>
          </div>
        </section>
      }
    >
      {TAKES_SIGNUPS && (
        <section className="sd-pg-sec sd-sec-a sd-line" aria-labelledby="next-h">
          <div className="sd-wrap">
            <h2 id="next-h" className="mb-8 text-[clamp(28px,3vw,38px)] leading-[1.1] tracking-[-0.025em] min-[760px]:mb-10">
              What happens next
            </h2>
            <ol className="sd-steps">
              {STEPS.map((step, index) => (
                <li key={step.title} className="sd-step">
                  <p className="sn" aria-hidden="true">
                    {String(index + 1).padStart(2, "0")}
                  </p>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>
      )}
    </SiteLayout>
  );
}
