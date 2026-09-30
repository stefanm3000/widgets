import {
  Hash,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  RefreshCw,
} from "lucide-react";
import { useId, useRef, useState, useSyncExternalStore } from "react";

import type { ChannelStore } from "../utils/channel-store";
import { cn } from "../utils/cn";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

export function ChannelSidebar({
  store,
  className,
}: {
  store: ChannelStore;
  className?: string;
}) {
  const snapshot = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot,
  );
  const [collapsed, setCollapsed] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const id = useId();
  const createButton = useRef<HTMLButtonElement>(null);

  return (
    <aside
      className={cn(
        "pulse-channel-sidebar col-start-1 row-span-4 grid min-h-0 grid-rows-subgrid bg-card",
        className,
      )}
      data-collapsed={collapsed}
      part="sidebar"
      aria-label="Channels"
    >
      <div
        className="box-border flex shrink-0 items-center gap-2 px-1.5"
        part="sidebar-header"
      >
        <Button
          variant="ghost"
          size="icon"
          type="button"
          aria-label={collapsed ? "Expand channels" : "Collapse channels"}
          aria-expanded={!collapsed}
          aria-controls={id}
          part="sidebar-toggle"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? (
            <PanelLeftOpen aria-hidden="true" />
          ) : (
            <PanelLeftClose aria-hidden="true" />
          )}
        </Button>
        {!collapsed && <span className="text-sm font-semibold">Channels</span>}
      </div>
      <div id={id} className="row-span-3 flex min-h-0 flex-col gap-2 p-1.5">
        <Button
          ref={createButton}
          variant="ghost"
          className={cn(
            "justify-start px-2.5",
            collapsed && "size-9 justify-center p-0",
          )}
          type="button"
          aria-label="New channel"
          disabled={snapshot.loading && snapshot.rooms.length === 0}
          title={collapsed ? "New channel" : undefined}
          onClick={() => {
            setCollapsed(false);
            setShowForm(true);
          }}
        >
          <Plus aria-hidden="true" />
          {!collapsed && "New channel"}
        </Button>
        {!collapsed && showForm && (
          <form
            className="flex flex-col gap-2 rounded-md border border-border p-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (!name.trim() || snapshot.creating) return;
              void store.create(name.trim()).then((created) => {
                if (created) {
                  setName("");
                  setShowForm(false);
                }
              });
            }}
          >
            <Label htmlFor={`${id}-name`}>Channel name</Label>
            <Input
              autoFocus
              id={`${id}-name`}
              value={name}
              maxLength={120}
              disabled={snapshot.creating}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape" && !snapshot.creating) {
                  event.preventDefault();
                  setShowForm(false);
                  createButton.current?.focus();
                }
              }}
            />
            <Button
              size="sm"
              type="submit"
              disabled={!name.trim() || snapshot.creating}
            >
              {snapshot.creating ? "Creating…" : "Create channel"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              type="button"
              disabled={snapshot.creating}
              onClick={() => {
                setShowForm(false);
                createButton.current?.focus();
              }}
            >
              Cancel
            </Button>
          </form>
        )}
        <nav
          aria-label="Chat channels"
          className="min-h-0 flex-1 overflow-y-auto"
        >
          <ul className="m-0 flex list-none flex-col gap-1 p-0">
            {snapshot.rooms.map((room) => (
              <li key={room.id}>
                <Button
                  variant="ghost"
                  type="button"
                  aria-label={room.name}
                  aria-current={
                    room.id === snapshot.activeRoomId ? "page" : undefined
                  }
                  title={room.name}
                  part="channel-button"
                  className={cn(
                    "w-full justify-start px-2.5 text-muted-foreground",
                    room.id === snapshot.activeRoomId &&
                      "bg-muted text-foreground",
                    collapsed && "size-9 justify-center p-0",
                  )}
                  onClick={() => store.select(room.id)}
                >
                  <Hash aria-hidden="true" />
                  {!collapsed && <span className="truncate">{room.name}</span>}
                </Button>
              </li>
            ))}
          </ul>
          {!collapsed && snapshot.loading && (
            <p className="px-2 text-xs text-muted-foreground" role="status">
              Loading channels…
            </p>
          )}
        </nav>
        {snapshot.error && (
          <p
            role="alert"
            className={cn(
              "m-0 break-words px-2 text-xs text-destructive",
              collapsed && "sr-only",
            )}
          >
            {snapshot.error}
          </p>
        )}
        <Button
          variant="ghost"
          type="button"
          aria-label="Refresh channels"
          title="Refresh channels"
          disabled={snapshot.loading}
          className={cn(
            "justify-start px-2.5",
            collapsed && "size-9 justify-center p-0",
          )}
          onClick={() => void store.refresh()}
        >
          <RefreshCw aria-hidden="true" />
          {!collapsed && <span className="truncate">Refresh channels</span>}
        </Button>
      </div>
    </aside>
  );
}
