import { useMessageScroll } from "../hooks/use-message-scroll";
import { useInfiniteScroll } from "../hooks/use-infinite-scroll";

import type { OptimisticMessage } from "../types";
import { cn } from "../utils/cn";
import { formatTime, initials, messageKey } from "../utils/messages";
import { Button } from "./ui/button";
import { Bubble, BubbleContent } from "./ui/bubble";
import { Marker, MarkerContent } from "./ui/marker";
import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageHeader,
} from "./ui/message";
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "./ui/message-scroller";
import { TranscriptOutline } from "./transcript-outline";

interface ChatTranscriptProps {
  className?: string;
  currentUserId: string | null;
  loading: boolean;
  hasEarlierMessages: boolean;
  autoLoadEarlierMessages: boolean;
  loadingEarlierMessages: boolean;
  onLoadEarlier: () => Promise<void>;
  messageClassName?: string;
  messages: OptimisticMessage[];
  outlineClassName?: string;
}

const sourceLabels = {
  playground: "Playground",
  system: "Pulse",
  vanilla: "Vanilla",
  vue: "Vue",
} as const;

export function ChatTranscript(props: ChatTranscriptProps) {
  return (
    <MessageScrollerProvider autoScroll defaultScrollPosition="end">
      <TranscriptContent {...props} />
    </MessageScrollerProvider>
  );
}

function TranscriptContent({
  className,
  currentUserId,
  loading,
  hasEarlierMessages,
  autoLoadEarlierMessages,
  loadingEarlierMessages,
  onLoadEarlier,
  messageClassName,
  messages,
  outlineClassName,
}: ChatTranscriptProps) {
  const scrollRef = useMessageScroll(messages.at(-1)?.id);
  const { rootRef, sentinelRef } = useInfiniteScroll({
    enabled: autoLoadEarlierMessages,
    onLoadMore: onLoadEarlier,
  });
  return (
    <MessageScroller
      className={cn("row-start-2 bg-background", className)}
      part="message-list"
    >
      <MessageScrollerViewport ref={rootRef} aria-label="Chat messages">
        {hasEarlierMessages && (
          <Button
            ref={sentinelRef}
            className="mx-auto my-2 shrink-0"
            variant="outline"
            disabled={loadingEarlierMessages}
            onClick={() => void onLoadEarlier()}
          >
            {loadingEarlierMessages
              ? "Loading earlier messages…"
              : "Load earlier messages"}
          </Button>
        )}
        <MessageScrollerContent
          ref={scrollRef}
          aria-busy={loading}
          className="p-4"
          role="log"
        >
          {loading && messages.length === 0 ? (
            <TranscriptStatus>Loading conversation…</TranscriptStatus>
          ) : messages.length === 0 ? (
            <TranscriptStatus>
              No messages yet. Start the conversation.
            </TranscriptStatus>
          ) : (
            messages.map((message) => {
              const isOwnMessage =
                message.optimistic || message.sender.id === currentUserId;

              return (
                <MessageScrollerItem
                  key={messageKey(message)}
                  messageId={message.id}
                >
                  <Message
                    align={isOwnMessage ? "end" : "start"}
                    aria-busy={message.optimistic || undefined}
                    className={cn(
                      "opacity-100 transition-opacity duration-200 motion-reduce:transition-none",
                      message.optimistic && "opacity-50",
                      messageClassName,
                    )}
                    data-pending={message.optimistic || undefined}
                    part="message"
                  >
                    <MessageAvatar>
                      {initials(message.sender.displayName)}
                    </MessageAvatar>
                    <MessageContent>
                      <MessageHeader>
                        <strong className="min-w-0 truncate font-semibold text-foreground">
                          {message.sender.displayName}
                          {isOwnMessage ? " (you)" : ""}
                        </strong>
                        <span
                          className="shrink-0 rounded-full border border-border px-1.5 py-0.5 text-[9px] font-bold tracking-wide uppercase"
                          data-slot="message-source"
                        >
                          {sourceLabels[message.sender.source]}
                        </span>
                        <time className="shrink-0" dateTime={message.createdAt}>
                          {formatTime(message.createdAt)}
                        </time>
                      </MessageHeader>
                      <Bubble
                        source={message.sender.source}
                        variant={isOwnMessage ? "default" : "secondary"}
                      >
                        <BubbleContent>{message.body}</BubbleContent>
                      </Bubble>
                    </MessageContent>
                  </Message>
                </MessageScrollerItem>
              );
            })
          )}
        </MessageScrollerContent>
      </MessageScrollerViewport>
      <TranscriptOutline className={outlineClassName} messages={messages} />
      <MessageScrollerButton />
    </MessageScroller>
  );
}

function TranscriptStatus({ children }: { children: string }) {
  return (
    <Marker className="my-auto justify-center" variant="separator">
      <MarkerContent>{children}</MarkerContent>
    </Marker>
  );
}
