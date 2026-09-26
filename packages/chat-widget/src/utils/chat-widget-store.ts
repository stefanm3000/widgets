import type { RealtimeEvent } from "@pulse/sdk";

import type { ChatWidgetClient, ChatWidgetSnapshot } from "../types.js";
import { mergeMessages } from "./messages.js";

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export class ChatWidgetStore {
  private generation = 0;
  private listeners = new Set<() => void>();
  private snapshot: ChatWidgetSnapshot = {
    connectionState: "offline",
    error: null,
    loading: true,
    messages: [],
    room: null,
    sending: false,
  };
  private started = false;
  private stopCallbacks: Array<() => void> = [];

  constructor(
    private readonly client: ChatWidgetClient,
    private readonly roomId: string,
  ) {}

  getSnapshot = () => this.snapshot;

  getServerSnapshot = () => this.snapshot;

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    if (!this.started) this.start();

    return () => {
      this.listeners.delete(listener);
      if (this.listeners.size === 0) this.stop();
    };
  };

  send = async (body: string): Promise<boolean> => {
    if (this.snapshot.sending || this.snapshot.connectionState !== "connected")
      return false;

    this.update({ error: null, sending: true });
    try {
      await this.client.sendMessage(this.roomId, body);
      return true;
    } catch (error) {
      this.update({ error: errorMessage(error, "Could not send message") });
      return false;
    } finally {
      this.update({ sending: false });
    }
  };

  private start() {
    this.started = true;
    const generation = ++this.generation;
    this.update({ error: null, loading: true });

    this.stopCallbacks = [
      this.client.onConnectionState((connectionState) => {
        if (this.isActive(generation)) this.update({ connectionState });
      }),
      this.client.onError((error) => {
        if (this.isActive(generation)) this.update({ error: error.message });
      }),
      this.client.onRefetchRequired((requestedRoomId) => {
        if (this.isActive(generation) && requestedRoomId === this.roomId) {
          void this.load(generation, "Could not reload chat");
        }
      }),
      this.client.subscribe(this.roomId, (event: RealtimeEvent) => {
        if (this.isActive(generation)) {
          this.update({
            messages: mergeMessages(this.snapshot.messages, [event.payload]),
          });
        }
      }),
    ];

    void this.load(generation, "Could not load chat", true);
  }

  private stop() {
    this.started = false;
    this.generation += 1;
    for (const stop of this.stopCallbacks.splice(0)) stop();
  }

  private isActive(generation: number): boolean {
    return this.started && this.generation === generation;
  }

  private async load(
    generation: number,
    fallback: string,
    finishLoading = false,
  ) {
    try {
      const [room, history] = await Promise.all([
        this.client.getRoom(this.roomId),
        this.client.getMessages(this.roomId, { limit: 50 }),
      ]);
      if (!this.isActive(generation)) return;
      this.update({
        messages: mergeMessages(this.snapshot.messages, history.items),
        room,
      });
    } catch (error) {
      if (this.isActive(generation)) {
        this.update({ error: errorMessage(error, fallback) });
      }
    } finally {
      if (finishLoading && this.isActive(generation)) {
        this.update({ loading: false });
      }
    }
  }

  private update(next: Partial<ChatWidgetSnapshot>) {
    this.snapshot = { ...this.snapshot, ...next };
    for (const listener of this.listeners) listener();
  }
}
