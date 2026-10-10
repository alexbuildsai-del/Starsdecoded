import { Button } from "@/ds/atoms/Button";
import { Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger } from "./Menu";

// Open menus are drawn static here: a Radix content portals and closes on blur, which a catalogue cannot show side by side.
const panel = "w-56 rounded-card border border-line bg-raised p-1 text-paper shadow-raised";
const row = "flex min-h-11 items-center rounded-inner px-3 text-sm";

export default function MenuExample() {
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <section className="grid content-start gap-3">
        <h3 className="text-xs text-muted">Today: shadcn defaults, 32 px rows, theme-grey fills</h3>
        <div className="w-56 rounded-md border border-line bg-surface p-1 text-sm text-paper">
          <div className="rounded-sm px-2 py-1.5">My reports</div>
          <div className="rounded-sm bg-raised px-2 py-1.5">Account</div>
          <div className="rounded-sm px-2 py-1.5 opacity-50">Timeline</div>
          <div className="rounded-sm px-2 py-1.5">Sign out</div>
        </div>
      </section>
      <section className="grid content-start gap-3">
        <h3 className="text-xs text-muted">After: closed, open, hovered, disabled</h3>
        <Menu>
          <MenuTrigger asChild>
            <Button variant="secondary" size="compact">Closed: Account</Button>
          </MenuTrigger>
          <MenuContent align="start">
            <MenuLabel>Signed in</MenuLabel>
            <MenuItem>My reports</MenuItem>
            <MenuItem disabled>Timeline</MenuItem>
            <MenuSeparator />
            <MenuItem danger>Sign out</MenuItem>
          </MenuContent>
        </Menu>
        <div className={panel}>
          <p className="m-0 px-3 py-1.5 font-label text-[11px] uppercase tracking-[.14em] text-paper-dim">Open</p>
          <div className={row}>My reports</div>
          <div className={`${row} bg-surface`}>Hovered: Account</div>
          <div className={`${row} opacity-50`}>Disabled: Timeline</div>
          <div className="-mx-1 my-1 h-px bg-line-soft" />
          <div className={`${row} text-error`}>Sign out</div>
        </div>
      </section>
    </div>
  );
}
