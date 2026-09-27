import type { ComponentProps } from "react";

import { cn } from "../../helpers/cn";

export function Input({ className, type, ...props }: ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "h-9 w-full min-w-0 rounded-xl border border-black/10 bg-white px-3 py-1 text-sm shadow-sm outline-none transition placeholder:text-black/35 disabled:pointer-events-none disabled:opacity-50 focus-visible:border-black/30 focus-visible:ring-2 focus-visible:ring-black/5",
        className,
      )}
      data-slot="input"
      type={type}
      {...props}
    />
  );
}
