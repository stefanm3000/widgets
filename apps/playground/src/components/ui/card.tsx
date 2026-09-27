import type { ComponentProps } from "react";

import { cn } from "../../helpers/cn";

export function Card({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex flex-col rounded-3xl border border-black/10 bg-white/60 shadow-sm backdrop-blur",
        className,
      )}
      data-slot="card"
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("flex items-center justify-between px-4 py-2.5", className)}
      data-slot="card-header"
      {...props}
    />
  );
}

export function CardContent({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("px-4 pb-4", className)}
      data-slot="card-content"
      {...props}
    />
  );
}
