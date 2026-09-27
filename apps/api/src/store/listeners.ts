import type { RealtimeEvent } from "@pulse/protocol";

export class RoomEventListeners {
  private readonly listeners = new Map<
    string,
    Set<(event: RealtimeEvent) => void>
  >();

  emit(event: RealtimeEvent): void {
    for (const listener of this.listeners.get(event.roomId) ?? []) {
      listener(event);
    }
  }

  subscribe(
    roomId: string,
    listener: (event: RealtimeEvent) => void,
  ): () => void {
    const listeners = this.listeners.get(roomId) ?? new Set();
    listeners.add(listener);
    this.listeners.set(roomId, listeners);

    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) this.listeners.delete(roomId);
    };
  }
}
