import { Check, Copy } from "lucide-react";
import { useCopyCode } from "../hooks/use-copy-code";

import { Button } from "./ui/button";

interface CopyCodeButtonProps {
  code: string;
}

export function CopyCodeButton({ code }: CopyCodeButtonProps) {
  const { attach, copied, copyCode } = useCopyCode(code);

  return (
    <Button
      ref={attach}
      aria-label={copied ? "Snippet copied" : "Copy snippet"}
      className="h-7 w-18 rounded-lg border-white/10 bg-white/5 px-2 text-[10px] tracking-normal text-white/70 normal-case shadow-none hover:bg-white/10 hover:text-white focus-visible:outline-white"
      onClick={copyCode}
      type="button"
      variant="outline"
    >
      {copied ? (
        <Check aria-hidden="true" className="size-3.5" />
      ) : (
        <Copy aria-hidden="true" className="size-3.5" />
      )}
      {copied ? "Copied" : "Copy"}
    </Button>
  );
}
