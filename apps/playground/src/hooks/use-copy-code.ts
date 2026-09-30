import { useRef, useState } from "react";

export function useCopyCode(code: string) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  function attach(button: HTMLButtonElement | null) {
    if (!button) return;
    return () => clearTimeout(timer.current);
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopiedCode(null), 2_000);
    } catch {
      setCopiedCode(null);
    }
  }

  return { attach, copied: copiedCode === code, copyCode };
}
