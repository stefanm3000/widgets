import { useMemo, useSyncExternalStore } from "react";

import type { ChatWidgetProps } from "../types.js";
import { ChatWidgetStore } from "../utils/chat-widget-store.js";
import { cn } from "../utils/cn.js";
import {
  createThemeStyle,
  getSystemTheme,
  type ResolvedTheme,
  resolveTheme,
  subscribeToSystemTheme,
} from "../utils/theme.js";
import { ChatComposer } from "./chat-composer.js";
import { ChatError } from "./chat-error.js";
import { ChatHeader } from "./chat-header.js";
import { ChatTranscript } from "./chat-transcript.js";

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
        "grid h-[min(680px,80vh)] w-full min-w-[260px] max-w-[440px] grid-rows-[auto_minmax(260px,1fr)_auto_auto] overflow-hidden border border-border bg-background text-foreground shadow-[0_22px_60px_rgb(26_35_52/14%)] [border-radius:var(--pulse-radius)] [font-family:var(--pulse-font)]",
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
        loading={snapshot.loading}
        messageClassName={classNames.message}
        messages={snapshot.messages}
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
