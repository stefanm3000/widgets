import { useMemo, useSyncExternalStore } from "react";

import type { ChatWidgetProps } from "../types";
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
  const store = useMemo(
    () => new ChatWidgetStore(client, roomId),
    [client, roomId],
  );

  const snapshot = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot,
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
        "grid h-[min(680px,80vh)] w-full min-w-65 max-w-110 grid-rows-[auto_minmax(0,1fr)_auto_auto] overflow-hidden border border-border bg-background text-foreground shadow-[0_22px_60px_rgb(26_35_52/14%)] rounded-(--pulse-radius) [font-family:var(--pulse-font)]",
        classNames.root,
        className,
      )}
      data-theme={resolvedTheme}
      part="root"
      style={style}
    >
      <ChatHeader
        className={classNames.header}
        connectionState={snapshot.connectionState}
        roomName={snapshot.room?.name}
        statusClassName={classNames.connectionStatus}
      />

      <ChatTranscript
        className={classNames.messageList}
        currentUserId={snapshot.currentUserId}
        loading={snapshot.loading}
        messageClassName={classNames.message}
        messages={snapshot.messages}
        outlineClassName={classNames.messageOutline}
      />

      <ChatError message={snapshot.error} />

      <ChatComposer
        buttonClassName={classNames.sendButton}
        className={classNames.composer}
        connectionState={snapshot.connectionState}
        inputClassName={classNames.input}
        onSend={store.send}
        roomId={roomId}
        sending={snapshot.sending}
      />
    </section>
  );
}
