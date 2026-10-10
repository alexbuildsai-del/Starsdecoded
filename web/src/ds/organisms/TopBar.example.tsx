import { Button } from "@/ds/atoms/Button";
import { TextButton } from "@/ds/atoms/TextButton";
import { Wordmark } from "@/ds/atoms/Wordmark";
import { TopBar } from "./TopBar";

function Side({ title, note, children }: { title: string; note: string; children: React.ReactNode }) {
  return (
    <div className="grid content-start gap-2">
      <p className="m-0 font-label text-label uppercase text-label-dim">{title}</p>
      {children}
      <p className="m-0 text-caption text-muted">{note}</p>
    </div>
  );
}

const frame = "relative overflow-hidden rounded-card border border-line h-[70px] [&>header]:!absolute [&>header]:!inset-x-0 [&>header]:!top-0";

export default function TopBarExample() {
  return (
    <div className="grid gap-6">
      <Side title="N1 · kept" note="Public bar: no change. Links fold into the phone menu.">
        <div className={frame}>
          <TopBar
            version="site"
            widthClass="max-w-6xl"
            left={<Wordmark />}
            centre={<><span>Free chart</span><span>Sample report</span><span>FAQ</span></>}
            right={<><Button variant="secondary" size="compact">Sign in</Button><Button size="compact">Get my report</Button></>}
          />
        </div>
      </Side>
      <Side title="N2 · becomes AppHeader" note="Dashboard: wordmark left, credits and the account menu right.">
        <div className={frame}>
          <TopBar left={<Wordmark />} right={<><span className="text-data-sm text-paper-dim">3 credits</span><Button variant="secondary" size="compact">Add someone</Button><Button variant="secondary" size="compact">Account</Button></>} />
        </div>
      </Side>
      <Side title="N3, N4 · becomes AppHeader" note="Report, Compatibility report, Account, Timeline: back link left.">
        <div className={frame}>
          <TopBar left={<TextButton>← Dashboard</TextButton>} right={<><Button variant="secondary" size="compact">Export PDF</Button><Button variant="secondary" size="compact">Account</Button></>} />
        </div>
      </Side>
      <Side title="N5 · becomes AppHeader" note="Birth form: back link, then the wordmark, both left. No account menu.">
        <div className={frame}>
          <TopBar left={<><TextButton>← Back</TextButton><Wordmark /></>} />
        </div>
      </Side>
      <Side title="N6 · becomes AppHeader, admin" note="Admin pages: wordmark and Admin.">
        <div className={frame}>
          <TopBar version="admin" widthClass="max-w-7xl" left={<Wordmark size={17} />} right={<span className="font-label text-label uppercase text-muted">Admin</span>} />
        </div>
      </Side>
    </div>
  );
}
