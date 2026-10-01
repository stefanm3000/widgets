import { randomUUID } from "node:crypto";
import { isIP } from "node:net";
import { setTimeout } from "node:timers/promises";

import { buildApp } from "../dist/app.js";
import { readConfig } from "../dist/config.js";
import { MemoryChatStore } from "../dist/store.js";
import { TokenService } from "../dist/token.js";

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
// Isolate each history-test browser's rate budget behind the shared local proxy.
app.addHook("onRequest", async (request) => {
  const clientIp = request.headers["x-pulse-test-client-ip"];
  if (typeof clientIp === "string" && isIP(clientIp)) {
    Object.defineProperty(request, "ip", { value: clientIp });
  }
});
// Only this isolated browser fixture exposes test credentials. Issuing them
// directly keeps MCP reload checks out of the demo endpoint's shared rate budget.
const tokenService = new TokenService(config.tokenSecret);
app.get("/test/mcp-credentials", async () => {
  const credentials = {};
  for (const source of ["playground", "vanilla", "vue"]) {
    const { identity, token } = await tokenService.issue(source, randomUUID(), [
      "demo-room",
    ]);
    credentials[source] = { accessToken: token, ...identity };
  }
  return credentials;
});
let browserSession = 0;
// Simulate separate client IPs for browser setup instead of sharing the proxy's
// ten-token quota. Only this test server exposes the setup route.
app.post("/__test__/auth/demo-token", async (request, reply) => {
  const response = await app.inject({
    method: "POST",
    url: "/auth/demo-token",
    payload: request.body,
    remoteAddress: `192.0.2.${++browserSession}`,
  });
  return reply
    .code(response.statusCode)
    .type("application/json")
    .send(response.body);
});
const close = async () => {
  await app.close();
  process.exit(0);
};
process.once("SIGINT", close);
process.once("SIGTERM", close);
await app.listen({ host: config.host, port: config.port });
