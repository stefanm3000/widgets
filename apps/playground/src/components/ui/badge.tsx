import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

import { cn } from "../../helpers/cn";

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold tracking-[0.06em] uppercase transition",
  {
    variants: {
      variant: {
        default: "border-black/10 bg-white/55 text-[#55594f] backdrop-blur",
        status: "border-transparent bg-transparent px-0 py-0 text-[#62665e]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export function Badge({
  asChild = false,
  className,
  variant,
  ...props
}: ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span";

  return (
    <Comp
      className={cn(badgeVariants({ className, variant }))}
      data-slot="badge"
      {...props}
    />
  );
}
