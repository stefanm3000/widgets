import type { ConnectionState } from "@pulse/sdk";

import { cn } from "../utils/cn";
import { Marker, MarkerContent, MarkerIcon } from "./ui/marker";

const stateLabels: Record<ConnectionState, string> = {
  connected: "Connected",
  connecting: "Connecting",
  offline: "Offline",
  reconnecting: "Reconnecting",
};

interface ChatHeaderProps {
  className?: string;
  connectionState: ConnectionState;
  roomName?: string;
  statusClassName?: string;
}

export function ChatHeader({
  className,
  connectionState,
  roomName,
  statusClassName,
}: ChatHeaderProps) {
  const pending =
    connectionState === "connecting" || connectionState === "reconnecting";

  return (
    <header
      className={cn(
        "flex items-center justify-between gap-4 border-b border-border bg-card px-5 py-4",
        className,
      )}
      part="header"
    >
      <div className="min-w-0">
        <p className="m-0 text-[10px] font-bold tracking-[0.13em] text-muted-foreground uppercase">
          Live chat
        </p>
        <h2 className="m-0 truncate text-[17px] font-semibold tracking-[-0.02em]">
          {roomName ?? "Chat"}
        </h2>
      </div>
      <Marker
        aria-live="polite"
        className={cn(
          "w-auto shrink-0 rounded-[calc(var(--pulse-radius)*0.7)] border border-border bg-muted px-2.5 py-1.5 font-semibold",
          connectionState === "connected" && "text-emerald-600",
          statusClassName,
        )}
        part="connection-status"
        role="status"
      >
        <MarkerIcon
          className={cn(
            "size-1.5 rounded-full bg-current",
            pending && "animate-pulse motion-reduce:animate-none",
          )}
        />
        <MarkerContent>{stateLabels[connectionState]}</MarkerContent>
      </Marker>
    </header>
  );
}
