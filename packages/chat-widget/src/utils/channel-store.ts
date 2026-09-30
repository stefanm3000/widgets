import type { Room } from "@pulse/sdk";

import type { ChatWidgetClient } from "../types";

interface ChannelSnapshot {
  activeRoomId: string;
  rooms: Room[];
  loading: boolean;
  creating: boolean;
  error: string | null;
}

export class ChannelStore {
  private snapshot: ChannelSnapshot;
  private listeners = new Set<() => void>();
  private generation = 0;
  private request = 0;

  constructor(
    private client: ChatWidgetClient,
    private roomId: string,
  ) {
    this.snapshot = {
      activeRoomId: roomId,
      rooms: [],
      loading: true,
      creating: false,
      error: null,
    };
  }

  getSnapshot = () => this.snapshot;

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    if (this.listeners.size === 1) {
      void this.refresh();
      globalThis.addEventListener?.("focus", this.refreshOnFocus);
    }
    return () => {
      this.listeners.delete(listener);
      if (!this.listeners.size) {
        this.generation += 1;
        globalThis.removeEventListener?.("focus", this.refreshOnFocus);
      }
    };
  };

  private refreshOnFocus = () => {
    void this.refresh();
  };

  select = (activeRoomId: string) => {
    if (this.snapshot.rooms.some((room) => room.id === activeRoomId))
      this.update({ activeRoomId });
  };

  refresh = async () => {
    const generation = this.generation;
    const request = ++this.request;
    this.update({ loading: true, error: null });
    try {
      const [room, channels] = await Promise.all([
        this.client.getRoom(this.roomId),
        this.client.getChannels(this.roomId),
      ]);
      if (generation !== this.generation || request !== this.request) return;
      this.update({ rooms: [room, ...channels] });
    } catch (error) {
      if (generation === this.generation && request === this.request)
        this.update({
          error:
            error instanceof Error ? error.message : "Could not load channels",
        });
    } finally {
      if (generation === this.generation && request === this.request)
        this.update({ loading: false });
    }
  };

  create = async (name: string): Promise<boolean> => {
    if (this.snapshot.creating) return false;
    const generation = this.generation;
    this.update({ creating: true, error: null });
    try {
      const room = await this.client.createChannel(this.roomId, name);
      if (generation !== this.generation) return false;
      // Invalidate older list requests that could overwrite this new channel.
      this.request += 1;
      this.update({
        rooms: [
          ...this.snapshot.rooms.filter((item) => item.id !== room.id),
          room,
        ],
        activeRoomId: room.id,
        loading: false,
      });
      return true;
    } catch (error) {
      if (generation === this.generation)
        this.update({
          error:
            error instanceof Error ? error.message : "Could not create channel",
        });
      return false;
    } finally {
      if (generation === this.generation) this.update({ creating: false });
    }
  };

  private update(next: Partial<ChannelSnapshot>) {
    this.snapshot = { ...this.snapshot, ...next };
    for (const listener of this.listeners) listener();
  }
}
