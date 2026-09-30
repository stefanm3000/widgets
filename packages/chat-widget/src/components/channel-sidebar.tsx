import { Hash, RefreshCw } from "lucide-react";

import type { useChannels } from "../hooks/use-channels";
import { NewChannelPopover } from "./new-channel-popover";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "./ui/sidebar";

export function ChannelSidebar({
  activeRoomId,
  channels,
  createChannel,
  selectChannel,
  className,
  popoverContainer,
}: ReturnType<typeof useChannels> & {
  className?: string;
  popoverContainer: HTMLElement | null;
}) {
  return (
    <SidebarProvider>
      <Sidebar className={className} aria-label="Channels">
        <SidebarHeader>
          <SidebarTrigger />
          <span className="text-sm font-semibold group-data-[state=collapsed]/sidebar:hidden">
            Channels
          </span>
        </SidebarHeader>
        <SidebarContent>
          <NewChannelPopover
            mutation={createChannel}
            container={popoverContainer}
          />
          <nav
            aria-label="Chat channels"
            className="min-h-0 flex-1 overflow-y-auto"
          >
            <SidebarMenu>
              {channels.data?.map((room) => (
                <SidebarMenuItem key={room.id}>
                  <SidebarMenuButton
                    aria-label={room.name}
                    aria-current={room.id === activeRoomId ? "page" : undefined}
                    title={room.name}
                    part="channel-button"
                    isActive={room.id === activeRoomId}
                    onClick={() => selectChannel(room.id)}
                  >
                    <Hash aria-hidden="true" />
                    <span className="truncate group-data-[state=collapsed]/sidebar:hidden">
                      {room.name}
                    </span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
            {channels.isPending && (
              <p
                className="px-2 text-xs text-muted-foreground group-data-[state=collapsed]/sidebar:sr-only"
                role="status"
              >
                Loading channels…
              </p>
            )}
          </nav>
          {channels.error && (
            <p
              role="alert"
              className="m-0 break-words px-2 text-xs text-destructive group-data-[state=collapsed]/sidebar:sr-only"
            >
              {channels.error.message}
            </p>
          )}
          <SidebarMenuButton
            aria-label="Refresh channels"
            title="Refresh channels"
            disabled={channels.isFetching}
            onClick={() => void channels.refetch()}
          >
            <RefreshCw aria-hidden="true" />
            <span className="truncate group-data-[state=collapsed]/sidebar:hidden">
              Refresh channels
            </span>
          </SidebarMenuButton>
        </SidebarContent>
      </Sidebar>
    </SidebarProvider>
  );
}
