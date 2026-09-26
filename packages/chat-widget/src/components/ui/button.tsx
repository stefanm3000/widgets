import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

import { cn } from "../../utils/cn";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all outline-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30 aria-invalid:border-destructive aria-invalid:ring-destructive/20",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-xs hover:brightness-95",
        destructive: "bg-destructive text-white shadow-xs hover:brightness-95",
        ghost: "hover:bg-muted hover:text-foreground",
        outline:
          "border border-border bg-background text-foreground shadow-xs hover:bg-muted",
        secondary:
          "bg-secondary text-secondary-foreground shadow-xs hover:brightness-95",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        icon: "size-9",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        sm: "h-8 gap-1.5 rounded-md px-3 has-[>svg]:px-2.5",
      },
    },
    defaultVariants: { size: "default", variant: "default" },
  },
);

export function Button({
  asChild = false,
  className,
  size = "default",
  variant = "default",
  ...props
}: ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      className={cn(buttonVariants({ className, size, variant }))}
      data-size={size}
      data-slot="button"
      data-variant={variant}
      {...props}
    />
  );
}

export { buttonVariants };
