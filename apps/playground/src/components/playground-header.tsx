import { Badge } from "./ui/badge";

export function PlaygroundHeader() {
  return (
    <nav className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-10">
      <a className="flex items-center gap-2.5" href="/">
        <span className="grid size-8 place-items-center rounded-[10px] bg-[#171914] text-sm font-black text-[#d8ff68] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]">
          P
        </span>
        <span className="text-sm font-bold tracking-[-0.02em]">Pulse</span>
      </a>
      <Badge className="normal-case" variant="status">
        <span className="size-1.5 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.12)]" />
        SDK playground
      </Badge>
    </nav>
  );
}
