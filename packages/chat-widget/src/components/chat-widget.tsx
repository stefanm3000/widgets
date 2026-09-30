import {
  startTransition,
  useMemo,
  useOptimistic,
  useSyncExternalStore,
} from "react";

import type { ChatWidgetProps, OptimisticMessage } from "../types";
import { ChannelStore } from "../utils/channel-store";
import { ChannelSidebar } from "./channel-sidebar";
import { ChatWidgetStore } from "../utils/chat-widget-store";
import { cn } from "../utils/cn";
import {
  createThemeStyle,
  getSystemTheme,
  type ResolvedTheme,
  resolveTheme,
  subscribeToSystemTheme,
} from "../utils/theme";
import { ChatComposer } from "./chat-composer";
import { ChatError } from "./chat-error";
import { ChatHeader } from "./chat-header";
import { ChatTranscript } from "./chat-transcript";

export function ChatWidget({
  className,
  classNames = {},
  client,
  roomId,
  theme = {},
}: ChatWidgetProps) {
  const channels = useMemo(
    () => new ChannelStore(client, roomId),
    [client, roomId],
  );
  const channelSnapshot = useSyncExternalStore(
    channels.subscribe,
    channels.getSnapshot,
    channels.getSnapshot,
  );

  const systemTheme = useSyncExternalStore<ResolvedTheme>(
    subscribeToSystemTheme,
    getSystemTheme,
    () => "light",
  );
  const resolvedTheme = resolveTheme(theme.preset, systemTheme);
  const style = useMemo(
    () => createThemeStyle(theme, resolvedTheme),
    [resolvedTheme, theme],
  );

  return (
    <section
      className={cn(
        "pulse-channel-layout relative flex h-[min(680px,80vh)] w-full min-w-65 max-w-170 overflow-hidden border border-border bg-background text-foreground shadow-[0_22px_60px_rgb(26_35_52/14%)] rounded-(--pulse-radius) [font-family:var(--pulse-font)]",
        classNames.root,
        className,
      )}
      data-theme={resolvedTheme}
      part="root"
      style={style}
    >
      <ChannelSidebar
        key={`sidebar:${roomId}`}
        store={channels}
        className={classNames.sidebar}
      />
      <ChatConversation
        key={channelSnapshot.activeRoomId}
        client={client}
        roomId={channelSnapshot.activeRoomId}
        classNames={classNames}
      />
    </section>
  );
}

function ChatConversation({
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
      className="pulse-conversation grid min-h-0 min-w-0 flex-1 grid-cols-[minmax(0,1fr)] grid-rows-[auto_minmax(0,1fr)_auto_auto]"
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
