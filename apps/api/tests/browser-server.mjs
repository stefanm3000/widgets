import { randomUUID } from "node:crypto";
import { setTimeout } from "node:timers/promises";

import { buildApp } from "../dist/app.js";
import { readConfig } from "../dist/config.js";
import { MemoryChatStore } from "../dist/store.js";

const config = readConfig(process.env);
const store = new MemoryChatStore();
const historyRoom = await store.createChannel(
  "demo-room",
  "History pagination fixture",
);
const sender = {
  id: randomUUID(),
  displayName: "History Tester",
  source: "system",
};
for (let index = 0; index < 101; index += 1) {
  const added = await store.addMessage(historyRoom.id, sender, {
    clientMessageId: randomUUID(),
    body: `History row ${index}`,
  });
  // Distinct timestamps keep the fixture chronological under the DTO's ID tie-breaker.
  if (!added) throw new Error("History fixture room missing");
  while (Date.now() <= Date.parse(added.message.createdAt)) await setTimeout(1);
}
const app = await buildApp({
  allowedOrigins: config.allowedOrigins,
  tokenSecret: config.tokenSecret,
  store,
});
const close = async () => {
  await app.close();
  process.exit(0);
};
process.once("SIGINT", close);
process.once("SIGTERM", close);
await app.listen({ host: config.host, port: config.port });
