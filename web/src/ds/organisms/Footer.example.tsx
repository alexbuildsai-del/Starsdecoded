import { Wordmark } from "@/ds/atoms/Wordmark";
import { Footer } from "./Footer";

export default function FooterExample() {
  return (
    <Footer
      brand={<Wordmark />}
      tagline="We write reports about you from your birth chart."
      columns={[
        { heading: "Product", links: [<a key="a" href="#sample">Sample report</a>, <a key="b" href="#faq">FAQ</a>] },
        { heading: "Company", links: [<a key="c" href="#method">Method</a>, <a key="d" href="#terms">Terms</a>] },
      ]}
      base={["Positions computed with the ephemeris.", "Updated today"]}
    />
  );
}
