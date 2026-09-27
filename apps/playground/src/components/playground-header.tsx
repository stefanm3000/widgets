import { Badge } from "./ui/badge";

export function PlaygroundHeader() {
  return (
    <nav className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-5 py-3 sm:px-8">
      <a className="flex items-center gap-2" href="/">
        <span className="grid size-7 place-items-center rounded-lg bg-[#171914] text-xs font-black text-[#d8ff68] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]">
          P
        </span>
        <span className="text-xs font-bold tracking-[-0.02em]">Pulse</span>
      </a>
      <Badge className="px-2 py-1 text-[9px] normal-case" variant="status">
        <span className="size-1 rounded-full bg-emerald-500" />
        Playground
      </Badge>
    </nav>
  );
}
