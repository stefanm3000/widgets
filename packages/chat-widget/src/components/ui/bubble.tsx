import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "@radix-ui/react-slot";
import type { ComponentProps } from "react";

import { cn } from "../../utils/cn";

const bubbleVariants = cva(
  "group/bubble relative flex w-fit max-w-[80%] min-w-0 flex-col gap-1 group-data-[align=end]/message:self-end data-[align=end]:self-end data-[variant=ghost]:max-w-full",
  {
    variants: {
      variant: {
        default:
          "*:data-[slot=bubble-content]:bg-primary *:data-[slot=bubble-content]:text-primary-foreground",
        destructive:
          "*:data-[slot=bubble-content]:bg-destructive/10 *:data-[slot=bubble-content]:text-destructive",
        ghost:
          "*:data-[slot=bubble-content]:rounded-none *:data-[slot=bubble-content]:bg-transparent *:data-[slot=bubble-content]:p-0",
        outline:
          "*:data-[slot=bubble-content]:border-border *:data-[slot=bubble-content]:bg-background",
        secondary:
          "*:data-[slot=bubble-content]:bg-secondary *:data-[slot=bubble-content]:text-secondary-foreground",
      },
      source: {
        playground:
          "*:data-[slot=bubble-content]:border-2 *:data-[slot=bubble-content]:border-partner-playground",
        system: "*:data-[slot=bubble-content]:border-border",
        svelte:
          "*:data-[slot=bubble-content]:border-2 *:data-[slot=bubble-content]:border-partner-svelte",
        vanilla:
          "*:data-[slot=bubble-content]:border-2 *:data-[slot=bubble-content]:border-partner-vanilla",
        vue: "*:data-[slot=bubble-content]:border-2 *:data-[slot=bubble-content]:border-partner-vue",
      },
    },
    defaultVariants: { source: "system", variant: "secondary" },
  },
);

export function Bubble({
  align = "start",
  className,
  source = "system",
  variant = "secondary",
  ...props
}: ComponentProps<"div"> &
  VariantProps<typeof bubbleVariants> & { align?: "start" | "end" }) {
  return (
    <div
      className={cn(bubbleVariants({ source, variant }), className)}
      data-align={align}
      data-slot="bubble"
      data-source={source}
      data-variant={variant}
      {...props}
    />
  );
}

export function BubbleContent({
  asChild = false,
  className,
  ...props
}: ComponentProps<"div"> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "div";

  return (
    <Comp
      className={cn(
        "w-fit max-w-full min-w-0 overflow-hidden rounded-[calc(var(--pulse-radius)*0.8)] border border-transparent px-3.5 py-2.5 text-sm leading-relaxed wrap-break-word group-data-[align=end]/bubble:self-end",
        className,
      )}
      data-slot="bubble-content"
      {...props}
    />
  );
}
