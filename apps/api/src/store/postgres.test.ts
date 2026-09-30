import { randomUUID } from "node:crypto";

import { newDb, type IMemoryDb } from "pg-mem";
import type { Pool } from "pg";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createDatabase } from "../database/client.js";
import { migrateDatabase } from "../database/migrations.js";
import { seedDatabase } from "../database/seeding.js";
import { PostgresChatStore } from "./postgres.js";

const sender = {
  id: "f3c5ff5e-6469-4973-bd33-359a56def99c",
  displayName: "Persistent Tester",
  source: "playground" as const,
};

function createPool(memory: IMemoryDb): Pool {
  const adapter = memory.adapters.createPg();
  const pool = new adapter.Pool() as unknown as Pool;
  const query = pool.query.bind(pool);
  pool.query = (async (config: unknown, ...arguments_: unknown[]) => {
    let arrayMode = false;
    if (typeof config === "object" && config !== null && "types" in config) {
      const supportedConfig = { ...config } as Record<string, unknown>;
      arrayMode = supportedConfig.rowMode === "array";
      delete supportedConfig.types;
      delete supportedConfig.rowMode;
      config = supportedConfig;
    }
    const result = (await Reflect.apply(query, pool, [
      config,
      ...arguments_,
    ])) as { rows: Record<string, unknown>[] };
    return arrayMode
      ? { ...result, rows: result.rows.map((row) => Object.values(row)) }
      : result;
  }) as Pool["query"];
  return pool;
}

describe("postgres chat store", () => {
  let memory: IMemoryDb;
  let store: PostgresChatStore | undefined;

  beforeEach(async () => {
    memory = newDb();
    const pool = createPool(memory);
    const database = createDatabase(pool);
    await migrateDatabase(database);
    await seedDatabase(database);
    store = new PostgresChatStore(pool);
  });

  afterEach(async () => {
    await store?.close();
  });

  it("persists idempotent messages and replays their committed events", async () => {
    if (!store) throw new Error("Expected a PostgreSQL store");
    const listener = vi.fn();
    const stop = store.subscribe("demo-room", listener);
    const cursor = await store.getCurrentCursor("demo-room");
    const clientMessageId = randomUUID();

    const first = await store.addMessage("demo-room", sender, {
      clientMessageId,
      body: "Stored after restart",
    });
    const duplicate = await store.addMessage("demo-room", sender, {
      clientMessageId,
      body: "Stored after restart",
    });

    expect(first?.created).toBe(true);
    expect(duplicate?.created).toBe(false);
    expect(duplicate?.message.id).toBe(first?.message.id);
    expect(listener).toHaveBeenCalledTimes(1);
    stop();

    await store.close();
    store = new PostgresChatStore(createPool(memory));

    const history = await store.getMessages("demo-room", { limit: 50 });
    expect(history?.items.at(-1)?.body).toBe("Stored after restart");

    expect(cursor).not.toBeNull();
    const replay = await store.getEventsAfter("demo-room", cursor!);
    expect(replay.expired).toBe(false);
    expect(replay.events.map((event) => event.payload.body)).toEqual([
      "Stored after restart",
    ]);
  });

  it("persists channel membership and isolated messages across store restarts", async () => {
    if (!store) throw new Error("Expected a PostgreSQL store");
    const channel = await store.createChannel("demo-room", "Design");
    expect(await store.getMessages(channel.id, { limit: 50 })).toEqual({
      items: [],
      nextCursor: null,
    });
    await store.addMessage(channel.id, sender, {
      clientMessageId: randomUUID(),
      body: "Channel message",
    });
    await store.close();
    store = new PostgresChatStore(createPool(memory));
    expect(await store.listChannels("demo-room")).toEqual([channel]);
    expect(await store.getParentRoomId(channel.id)).toBe("demo-room");
    expect(
      (await store.getMessages(channel.id, { limit: 50 }))?.items[0]?.body,
    ).toBe("Channel message");
    expect(
      (await store.getMessages("demo-room", { limit: 50 }))?.items,
    ).toHaveLength(2);
  });

  it("seeds rooms and paginates history", async () => {
    if (!store) throw new Error("Expected a PostgreSQL store");
    const room = await store.getRoom("demo-room");
    const page = await store.getMessages("demo-room", { limit: 1 });

    expect(room?.name).toBe("Live chat demo");
    expect(page?.items).toHaveLength(1);
    expect(page?.nextCursor).toBe("1");
  });
});
