import {
  startTransition,
  useMemo,
  useOptimistic,
  useSyncExternalStore,
} from "react";

import type { ChatWidgetProps, OptimisticMessage } from "../types";
import { ChatWidgetStore } from "../utils/chat-widget-store";
import { ChatComposer } from "./chat-composer";
import { ChatError } from "./chat-error";
import { ChatHeader } from "./chat-header";
import { ChatTranscript } from "./chat-transcript";

export function ChatConversation({
  client,
  roomId,
  classNames = {},
}: Pick<ChatWidgetProps, "client" | "roomId" | "classNames">) {
  const store = useMemo(
    () => new ChatWidgetStore(client, roomId),
    [client, roomId],
  );

  const snapshot = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot,
  );

  const [optimisticMessages, addOptimisticMessage] = useOptimistic<
    OptimisticMessage[],
    OptimisticMessage
  >(snapshot.messages, (messages, pendingMessage) => {
    if (
      messages.some(
        (message) => message.clientMessageId === pendingMessage.clientMessageId,
      )
    ) {
      return messages;
    }

    return [...messages, pendingMessage].sort(
      (left, right) =>
        left.createdAt.localeCompare(right.createdAt) ||
        left.id.localeCompare(right.id),
    );
  });

  return (
    <div
      className="pulse-conversation col-start-2 row-span-4 grid min-h-0 min-w-0 grid-cols-[minmax(0,1fr)] grid-rows-subgrid"
      part="conversation"
    >
      <ChatHeader
        className={classNames.header}
        connectionState={snapshot.connectionState}
        roomName={snapshot.room?.name}
        statusClassName={classNames.connectionStatus}
      />

      <ChatTranscript
        className={classNames.messageList}
        currentUserId={snapshot.currentUser?.id ?? null}
        loading={snapshot.loading}
        messageClassName={classNames.message}
        messages={optimisticMessages}
        outlineClassName={classNames.messageOutline}
      />

      <ChatError message={snapshot.error} />

      <ChatComposer
        buttonClassName={classNames.sendButton}
        className={classNames.composer}
        connectionState={snapshot.connectionState}
        inputClassName={classNames.input}
        onSend={(body) => {
          const clientMessageId = globalThis.crypto.randomUUID();
          const pendingMessage: OptimisticMessage = {
            body,
            clientMessageId,
            createdAt: new Date().toISOString(),
            id: `optimistic:${clientMessageId}`,
            optimistic: true,
            roomId,
            sender: {
              displayName: snapshot.currentUser?.displayName ?? "You",
              id: snapshot.currentUser?.id ?? `optimistic:${clientMessageId}`,
              source: snapshot.currentUser?.source ?? "system",
            },
          };

          return new Promise<boolean>((resolve) => {
            startTransition(async () => {
              addOptimisticMessage(pendingMessage);
              resolve(await store.send(body, clientMessageId));
            });
          });
        }}
        roomId={roomId}
      />
    </div>
  );
}
