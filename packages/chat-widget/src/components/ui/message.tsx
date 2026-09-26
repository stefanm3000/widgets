import type { ComponentProps } from "react";

import { cn } from "../../utils/cn.js";

export function MessageGroup({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("flex min-w-0 flex-col gap-2", className)}
      data-slot="message-group"
      {...props}
    />
  );
}

export function Message({
  align = "start",
  className,
  ...props
}: ComponentProps<"div"> & { align?: "start" | "end" }) {
  return (
    <div
      className={cn(
        "group/message relative flex w-full min-w-0 gap-2 text-sm data-[align=end]:flex-row-reverse",
        className,
      )}
      data-align={align}
      data-slot="message"
      {...props}
    />
  );
}

export function MessageAvatar({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex size-8 shrink-0 items-center justify-center self-end overflow-hidden rounded-full bg-muted text-[10px] font-bold text-muted-foreground group-has-data-[slot=message-footer]/message:-translate-y-7",
        className,
      )}
      data-slot="message-avatar"
      {...props}
    />
  );
}

export function MessageContent({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-1 flex-col gap-1.5 wrap-break-word group-data-[align=end]/message:*:data-slot:self-end",
        className,
      )}
      data-slot="message-content"
      {...props}
    />
  );
}

export function MessageHeader({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex max-w-full min-w-0 items-center gap-2 px-3 text-[11px] font-medium text-muted-foreground",
        className,
      )}
      data-slot="message-header"
      {...props}
    />
  );
}

export function MessageFooter({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex max-w-full min-w-0 items-center px-3 text-[10px] font-medium text-muted-foreground group-data-[align=end]/message:justify-end",
        className,
      )}
      data-slot="message-footer"
      {...props}
    />
  );
}
