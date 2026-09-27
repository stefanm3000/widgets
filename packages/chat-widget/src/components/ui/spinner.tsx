import { LoaderCircle } from "lucide-react";
import type { ComponentProps } from "react";

import { cn } from "../../utils/cn";

export function Spinner({ className, ...props }: ComponentProps<"svg">) {
  return (
    <LoaderCircle
      aria-label="Loading"
      className={cn("size-4 animate-spin", className)}
      role="status"
      {...props}
    />
  );
}
