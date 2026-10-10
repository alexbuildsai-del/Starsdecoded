import { Logo } from "@/ds/atoms/Logo";

export default function LogoExample() {
  return (
    <div className="flex flex-wrap items-center gap-6 bg-[#06080C] p-6">
      <Logo kind="mark" />
      <Logo kind="wordmark" />
      <Logo kind="icon" />
    </div>
  );
}
