import type { Message as ChatMessage } from "@pulse/sdk";

import { cn } from "../utils/cn.js";
import { formatTime, initials } from "../utils/messages.js";
import { Bubble, BubbleContent } from "./ui/bubble.js";
import { Marker, MarkerContent } from "./ui/marker.js";
import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageHeader,
} from "./ui/message.js";
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "./ui/message-scroller.js";

interface ChatTranscriptProps {
  className?: string;
  loading: boolean;
  messageClassName?: string;
  messages: ChatMessage[];
}

export function ChatTranscript({
  className,
  loading,
  messageClassName,
  messages,
}: ChatTranscriptProps) {
  return (
    <MessageScrollerProvider defaultScrollPosition="end">
      <MessageScroller
        className={cn("bg-background", className)}
        part="message-list"
      >
        <MessageScrollerViewport aria-label="Chat messages">
          <MessageScrollerContent
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
              messages.map((message) => (
                <MessageScrollerItem key={message.id} messageId={message.id}>
                  <Message className={messageClassName} part="message">
                    <MessageAvatar>
                      {initials(message.sender.displayName)}
                    </MessageAvatar>
                    <MessageContent>
                      <MessageHeader>
                        <strong className="min-w-0 truncate font-semibold text-foreground">
                          {message.sender.displayName}
                        </strong>
                        <time className="shrink-0" dateTime={message.createdAt}>
                          {formatTime(message.createdAt)}
                        </time>
                      </MessageHeader>
                      <Bubble variant="secondary">
                        <BubbleContent>{message.body}</BubbleContent>
                      </Bubble>
                    </MessageContent>
                  </Message>
                </MessageScrollerItem>
              ))
            )}
          </MessageScrollerContent>
        </MessageScrollerViewport>
        <MessageScrollerButton />
      </MessageScroller>
    </MessageScrollerProvider>
  );
}

function TranscriptStatus({ children }: { children: string }) {
  return (
    <Marker className="my-auto justify-center" variant="separator">
      <MarkerContent>{children}</MarkerContent>
    </Marker>
  );
}
