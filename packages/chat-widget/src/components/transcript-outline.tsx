import { useMemo, useRef } from "react";

import type { OptimisticMessage } from "../types";
import { cn } from "../utils/cn";
import { formatTime } from "../utils/messages";
import {
  useMessageScroller,
  useMessageScrollerVisibility,
} from "./ui/message-scroller";

interface TranscriptOutlineProps {
  className?: string;
  messages: OptimisticMessage[];
}

const MAX_OUTLINE_MARKERS = 40;

export function TranscriptOutline({
  className,
  messages,
}: TranscriptOutlineProps) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const { scrollToMessage } = useMessageScroller();
  const { currentAnchorId, visibleMessageIds } = useMessageScrollerVisibility();
  const visibleIds = useMemo(
    () => new Set(visibleMessageIds),
    [visibleMessageIds],
  );
  const currentMessageId =
    currentAnchorId ?? visibleMessageIds[0] ?? messages.at(-1)?.id ?? null;
  const currentMessageIndex = messages.findIndex(
    (message) => message.id === currentMessageId,
  );
  const outlineMarkers = useMemo(() => {
    const markerCount = Math.min(messages.length, MAX_OUTLINE_MARKERS);

    return Array.from({ length: markerCount }, (_, markerIndex) => {
      const startIndex = Math.floor(
        (markerIndex * messages.length) / markerCount,
      );
      const endIndex = Math.floor(
        ((markerIndex + 1) * messages.length) / markerCount,
      );
      const firstMessage = messages[startIndex];
      const lastMessage = messages[endIndex - 1];

      return {
        current:
          currentMessageIndex >= startIndex && currentMessageIndex < endIndex,
        key: `${firstMessage?.id}:${lastMessage?.id}`,
        visible: messages
          .slice(startIndex, endIndex)
          .some((message) => visibleIds.has(message.id)),
      };
    });
  }, [currentMessageIndex, messages, visibleIds]);

  if (messages.length < 2) return null;

  return (
    <details
      className={cn(
        "group/outline invisible absolute top-[calc(50%-0.5rem)] right-2 z-20 -translate-y-1/2 opacity-0 transition-opacity group-hover/message-scroller:visible group-hover/message-scroller:opacity-100",
        className,
      )}
      part="message-outline"
      ref={detailsRef}
    >
      <summary className="flex max-h-52 w-7 cursor-pointer list-none flex-col items-center gap-0.5 overflow-hidden rounded-[calc(var(--pulse-radius)*0.7)] border border-border bg-card/95 px-1.5 py-2 shadow-md backdrop-blur-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
        <span className="sr-only">
          Open conversation outline. Message {currentMessageIndex + 1} of{" "}
          {messages.length}.
        </span>
        {outlineMarkers.map((marker) => (
          <span
            aria-hidden="true"
            className="h-0.5 w-3 shrink-0 rounded-full bg-muted-foreground/25 data-[current=true]:w-4 data-[current=true]:bg-foreground data-[visible=true]:bg-muted-foreground/60"
            data-current={marker.current}
            data-slot="message-outline-marker"
            data-visible={marker.visible}
            key={marker.key}
          />
        ))}
      </summary>

      <div className="scrollbar-none absolute top-1/2 right-full mr-2 hidden max-h-72 w-64 -translate-y-1/2 flex-col gap-1 overflow-y-auto rounded-[var(--pulse-radius)] border border-border bg-card p-1 text-card-foreground shadow-xl group-open/outline:flex">
        <p className="px-2 pt-1 pb-0.5 text-xs font-semibold text-muted-foreground">
          Conversation outline
        </p>
        {messages.map((message) => {
          const isCurrent = message.id === currentMessageId;

          return (
            <button
              aria-current={isCurrent ? "location" : undefined}
              className="flex min-h-11 w-full flex-col rounded-[calc(var(--pulse-radius)*0.7)] px-2 py-1.5 text-left transition-colors outline-none hover:bg-muted focus-visible:bg-muted aria-current:bg-muted"
              key={message.id}
              onClick={() => {
                scrollToMessage(message.id, {
                  align: "start",
                  behavior: "smooth",
                });
                detailsRef.current?.removeAttribute("open");
              }}
              type="button"
            >
              <span className="flex w-full items-center gap-2 text-xs">
                <strong className="min-w-0 flex-1 truncate font-semibold">
                  {message.sender.displayName}
                </strong>
                <time
                  className="shrink-0 text-muted-foreground"
                  dateTime={message.createdAt}
                >
                  {formatTime(message.createdAt)}
                </time>
              </span>
              <span className="line-clamp-1 w-full text-xs text-muted-foreground">
                {message.body}
              </span>
            </button>
          );
        })}
      </div>
    </details>
  );
}
