import { randomUUID } from "node:crypto";

import { describe, expect, it, vi } from "vitest";

import { MemoryChatStore } from "./store.js";

const sender = {
  id: "f3c5ff5e-6469-4973-bd33-359a56def99c",
  displayName: "Replay Tester",
};

describe("memory chat store events", () => {
  it("emits new messages once and replays events after a cursor", () => {
    const store = new MemoryChatStore();
    const listener = vi.fn();
    const stop = store.subscribe("demo-room", listener);
    const clientMessageId = randomUUID();

    const first = store.addMessage("demo-room", sender, {
      clientMessageId,
      body: "First event",
    });
    const duplicate = store.addMessage("demo-room", sender, {
      clientMessageId,
      body: "First event",
    });
    const second = store.addMessage("demo-room", sender, {
      clientMessageId: randomUUID(),
      body: "Second event",
    });

    expect(first?.created).toBe(true);
    expect(duplicate?.created).toBe(false);
    expect(duplicate?.message.id).toBe(first?.message.id);
    expect(second?.created).toBe(true);
    expect(listener).toHaveBeenCalledTimes(2);

    const replay = store.getEventsAfter("demo-room", "3");
    expect(replay.expired).toBe(false);
    expect(replay.events.map((event) => event.payload.body)).toEqual([
      "Second event",
    ]);
    expect(store.getEventsAfter("demo-room", "999").expired).toBe(true);

    stop();
  });
});
