import { useMemo, useSyncExternalStore } from "react";

import type { ChatWidgetProps } from "../types";
import { ChannelStore } from "../utils/channel-store";
import { ChannelSidebar } from "./channel-sidebar";
import { cn } from "../utils/cn";
import { createThemeStyle } from "../utils/theme";
import { ChatConversation } from "./chat-conversation";

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

  const resolvedTheme = theme.preset ?? "light";
  const style = createThemeStyle(theme);

  return (
    <section
      className={cn(
        "pulse-channel-layout relative grid grid-cols-[auto_minmax(0,1fr)] grid-rows-[auto_minmax(0,1fr)_auto_auto] h-[min(680px,80vh)] w-full min-w-65 max-w-170 overflow-hidden border border-border bg-background text-foreground shadow-xl rounded-(--pulse-radius) [font-family:var(--pulse-font)]",
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
