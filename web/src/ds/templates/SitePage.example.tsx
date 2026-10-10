import { SitePage, SitePageSection } from "./SitePage";

function Slot({ name, className = "" }: { name: string; className?: string }) {
  return (
    <div className={`grid place-items-center rounded-control border border-dashed border-line-strong p-4 font-label text-label uppercase text-label-dim ${className}`}>
      {name}
    </div>
  );
}

export default function SitePageExample() {
  return (
    <div className="max-h-[640px] overflow-auto rounded-card border border-line">
      <SitePage
        header={<Slot name="TopBar" />}
        hero={<Slot name="Hero: kicker, title, lede, actions" className="min-h-48" />}
        footer={<Slot name="Footer" />}
      >
        <SitePageSection kicker="Kicker" title="One job per section">
          <Slot name="Content" className="min-h-32" />
        </SitePageSection>
        <SitePageSection kicker="Kicker" title="The next job">
          <Slot name="Content" className="min-h-32" />
        </SitePageSection>
      </SitePage>
    </div>
  );
}
