import type { Message as ChatMessage } from "@pulse/sdk";

import { cn } from "../utils/cn";
import { formatTime, initials } from "../utils/messages";
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
  messageClassName?: string;
  messages: ChatMessage[];
  outlineClassName?: string;
}

export function ChatTranscript({
  className,
  currentUserId,
  loading,
  messageClassName,
  messages,
  outlineClassName,
}: ChatTranscriptProps) {
  return (
    <MessageScrollerProvider autoScroll defaultScrollPosition="end">
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
              messages.map((message) => {
                const isOwnMessage = message.sender.id === currentUserId;

                return (
                  <MessageScrollerItem key={message.id} messageId={message.id}>
                    <Message
                      align={isOwnMessage ? "end" : "start"}
                      className={messageClassName}
                      part="message"
                    >
                      <MessageAvatar>
                        {initials(message.sender.displayName)}
                      </MessageAvatar>
                      <MessageContent>
                        <MessageHeader>
                          <strong className="min-w-0 truncate font-semibold text-foreground">
                            {isOwnMessage ? "You" : message.sender.displayName}
                          </strong>
                          <time
                            className="shrink-0"
                            dateTime={message.createdAt}
                          >
                            {formatTime(message.createdAt)}
                          </time>
                        </MessageHeader>
                        <Bubble
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
