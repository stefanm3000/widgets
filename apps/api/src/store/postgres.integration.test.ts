import { randomUUID } from "node:crypto";

import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { createDatabase } from "../database/client.js";
import { migrateDatabase } from "../database/migrations.js";
import { seedDatabase } from "../database/seeding.js";
import { PostgresChatStore } from "./postgres.js";

const databaseUrl = process.env.TEST_DATABASE_URL;
const databaseName = `pulse_test_${randomUUID().replaceAll("-", "")}`;
const sender = {
  id: randomUUID(),
  displayName: "Database Tester",
  source: "vanilla" as const,
};

describe.skipIf(!databaseUrl)("real PostgreSQL transactions", () => {
  let admin: Pool;
  let pool: Pool;
  let store: PostgresChatStore;
  let created = false;

  beforeAll(async () => {
    admin = new Pool({ connectionString: databaseUrl });
    await admin.query(`CREATE DATABASE "${databaseName}"`);
    created = true;
    const url = new URL(databaseUrl!);
    url.pathname = `/${databaseName}`;
    pool = new Pool({ connectionString: url.toString(), max: 10 });
    const database = createDatabase(pool);
    await migrateDatabase(database);
    await seedDatabase(database);
    store = new PostgresChatStore(pool);
  });

  afterAll(async () => {
    await pool?.end();
    if (created) await admin.query(`DROP DATABASE "${databaseName}"`);
    await admin?.end();
  });

  it("creates one message and event for concurrent retries", async () => {
    const room = await store.createChannel("demo-room", "Idempotency");
    const listener = vi.fn();
    const stop = store.subscribe(room.id, listener);
    const input = {
      clientMessageId: randomUUID(),
      body: "One committed message",
    };
    const results = await Promise.all(
      Array.from({ length: 8 }, () => store.addMessage(room.id, sender, input)),
    );
    expect(results.filter((result) => result?.created)).toHaveLength(1);
    expect(new Set(results.map((result) => result?.message.id)).size).toBe(1);
    expect(listener).toHaveBeenCalledOnce();
    expect((await store.getEventsAfter(room.id, "0")).events).toHaveLength(1);
    stop();
  });

  it("serializes room writes and replays concurrently committed messages in order", async () => {
    const room = await store.createChannel("demo-room", "Ordered replay");
    const lock = await pool.connect();
    const observed: bigint[] = [];
    const stop = store.subscribe(room.id, (event) =>
      observed.push(BigInt(event.eventId)),
    );
    let pending: Promise<unknown> | undefined;
    try {
      await lock.query("BEGIN");
      await lock.query("SELECT id FROM rooms WHERE id = $1 FOR UPDATE", [
        room.id,
      ]);
      pending = Promise.all(
        Array.from({ length: 8 }, (_, index) =>
          store.addMessage(
            room.id,
            { ...sender, id: randomUUID() },
            { clientMessageId: randomUUID(), body: `Concurrent ${index}` },
          ),
        ),
      );
      await vi.waitFor(async () => {
        const waiting = await pool.query(
          "SELECT count(*)::int AS count FROM pg_stat_activity WHERE datname = $1 AND wait_event_type = 'Lock'",
          [databaseName],
        );
        expect(waiting.rows[0].count).toBeGreaterThan(0);
      });
      expect(
        (await store.getMessages(room.id, { limit: 50 }))?.items,
      ).toHaveLength(0);
      await lock.query("COMMIT");
      await pending;
      const replay = await store.getEventsAfter(room.id, "0");
      expect(replay.expired).toBe(false);
      expect(replay.events).toHaveLength(8);
      expect(observed).toEqual(
        replay.events.map((event) => BigInt(event.eventId)),
      );
    } finally {
      await lock.query("ROLLBACK");
      lock.release();
      await pending;
      stop();
    }
  });

  it("rolls back messages, participants, and broadcasts when the event insert fails", async () => {
    const room = await store.createChannel("demo-room", "Rollback");
    const rollbackSender = { ...sender, id: randomUUID() };
    const listener = vi.fn();
    const stop = store.subscribe(room.id, listener);
    await pool.query(
      "CREATE FUNCTION reject_test_event() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'forced replay failure'; END $$",
    );
    await pool.query(
      "CREATE TRIGGER reject_test_event BEFORE INSERT ON realtime_events FOR EACH ROW EXECUTE FUNCTION reject_test_event()",
    );
    try {
      await expect(
        store.addMessage(room.id, rollbackSender, {
          clientMessageId: randomUUID(),
          body: "Must roll back",
        }),
      ).rejects.toThrow();
      expect(
        (await store.getMessages(room.id, { limit: 50 }))?.items,
      ).toHaveLength(0);
      expect(await store.getCurrentCursor(room.id)).toBeNull();
      expect(
        (
          await pool.query("SELECT id FROM participants WHERE id = $1", [
            rollbackSender.id,
          ])
        ).rows,
      ).toHaveLength(0);
      expect(listener).not.toHaveBeenCalled();
    } finally {
      await pool.query("DROP TRIGGER reject_test_event ON realtime_events");
      await pool.query("DROP FUNCTION reject_test_event()");
      stop();
    }
  });
});
