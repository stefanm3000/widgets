import { MessageScroller as MessageScrollerPrimitive } from "@shadcn/react/message-scroller";
import { ArrowDown } from "lucide-react";
import type { ComponentProps } from "react";

import { cn } from "../../utils/cn.js";
import { Button } from "./button.js";

export const MessageScrollerProvider = MessageScrollerPrimitive.Provider;

export function MessageScroller({
  className,
  ...props
}: ComponentProps<typeof MessageScrollerPrimitive.Root>) {
  return (
    <MessageScrollerPrimitive.Root
      className={cn(
        "group/message-scroller relative flex size-full min-h-0 flex-col overflow-hidden",
        className,
      )}
      data-slot="message-scroller"
      {...props}
    />
  );
}

export function MessageScrollerViewport({
  className,
  ...props
}: ComponentProps<typeof MessageScrollerPrimitive.Viewport>) {
  return (
    <MessageScrollerPrimitive.Viewport
      className={cn(
        "size-full min-h-0 min-w-0 overflow-y-auto overscroll-contain scroll-smooth outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
        className,
      )}
      data-slot="message-scroller-viewport"
      {...props}
    />
  );
}

export function MessageScrollerContent({
  className,
  ...props
}: ComponentProps<typeof MessageScrollerPrimitive.Content>) {
  return (
    <MessageScrollerPrimitive.Content
      className={cn("flex h-max min-h-full flex-col gap-4", className)}
      data-slot="message-scroller-content"
      {...props}
    />
  );
}

export function MessageScrollerItem({
  className,
  ...props
}: ComponentProps<typeof MessageScrollerPrimitive.Item>) {
  return (
    <MessageScrollerPrimitive.Item
      className={cn(
        "min-w-0 shrink-0 [contain-intrinsic-size:auto_10rem] [content-visibility:auto]",
        className,
      )}
      data-slot="message-scroller-item"
      {...props}
    />
  );
}

export function MessageScrollerButton({
  className,
  direction = "end",
  ...props
}: ComponentProps<typeof MessageScrollerPrimitive.Button>) {
  return (
    <MessageScrollerPrimitive.Button
      className={cn(
        "absolute right-4 bottom-4 z-10 inline-flex size-9 items-center justify-center rounded-full border border-border bg-card text-card-foreground shadow-lg transition-[opacity,transform] hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none data-[active=false]:translate-y-2 data-[active=false]:opacity-0",
        direction === "start" && "top-4 bottom-auto rotate-180",
        className,
      )}
      direction={direction}
      render={<Button size="icon" variant="outline" />}
      {...props}
    >
      <ArrowDown className="size-4" />
      <span className="sr-only">
        Scroll to {direction === "start" ? "start" : "latest message"}
      </span>
    </MessageScrollerPrimitive.Button>
  );
}
