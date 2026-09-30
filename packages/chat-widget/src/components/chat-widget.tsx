import { useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { NuqsAdapter } from "nuqs/adapters/react";

import { useChannels } from "../hooks/use-channels";
import {
  useWidgetQueryClient,
  WidgetQueryScope,
} from "../hooks/use-widget-query-client";
import type { ChatWidgetProps } from "../types";
import { cn } from "../utils/cn";
import { createThemeStyle } from "../utils/theme";
import { ChannelSidebar } from "./channel-sidebar";
import { ChatConversation } from "./chat-conversation";

export function ChatWidget(props: ChatWidgetProps) {
  const { queryClient, scope } = useWidgetQueryClient(props.client);
  return (
    <QueryClientProvider client={queryClient}>
      <WidgetQueryScope value={scope}>
        <NuqsAdapter>
          <WidgetLayout {...props} />
        </NuqsAdapter>
      </WidgetQueryScope>
    </QueryClientProvider>
  );
}

function WidgetLayout({
  className,
  classNames = {},
  client,
  roomId,
  theme = {},
}: ChatWidgetProps) {
  const channels = useChannels(client, roomId);
  const [popoverContainer, setPopoverContainer] = useState<HTMLElement | null>(
    null,
  );
  return (
    <section
      ref={setPopoverContainer}
      className={cn(
        "pulse-channel-layout relative grid h-[min(680px,80vh)] w-full min-w-65 max-w-170 grid-cols-[auto_minmax(0,1fr)] grid-rows-[auto_minmax(0,1fr)_auto_auto] overflow-hidden rounded-(--pulse-radius) border border-border bg-background text-foreground shadow-xl [font-family:var(--pulse-font)]",
        classNames.root,
        className,
      )}
      data-theme={theme.preset ?? "light"}
      part="root"
      style={createThemeStyle(theme)}
    >
      <ChannelSidebar
        {...channels}
        className={classNames.sidebar}
        popoverContainer={popoverContainer}
      />
      <ChatConversation
        client={client}
        roomId={channels.activeRoomId}
        classNames={classNames}
      />
    </section>
  );
}
