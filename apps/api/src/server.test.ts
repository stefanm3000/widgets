import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { expect, it } from "vitest";

const run = promisify(execFile);

it("loads the server when Vercel captures listen before opening its port", async () => {
  const environment: NodeJS.ProcessEnv = { ...process.env, NODE_ENV: "test" };
  delete environment.DATABASE_URL;
  delete environment.DATABASE_URL_UNPOOLED;
  const entrypoint = new URL("./server.ts", import.meta.url).href;
  const { stdout } = await run(
    process.execPath,
    [
      "--import",
      "tsx",
      "--input-type=module",
      "--eval",
      `
        import assert from "node:assert/strict";
        import { randomUUID } from "node:crypto";
        import { Server } from "node:http";

        const originalListen = Server.prototype.listen;
        let captured;
        let resolveCapture;
        const capturedReady = new Promise(resolve => { resolveCapture = resolve; });
        Server.prototype.listen = function () {
          captured = this;
          Server.prototype.listen = originalListen;
          resolveCapture();
          return this;
        };

        // Vercel awaits the module import before opening the captured server.
        await import(${JSON.stringify(entrypoint)});
        await capturedReady;
        assert.ok(captured, "Vercel must discover a listening server");
        await new Promise((resolve, reject) => {
          captured.once("error", reject);
          originalListen.call(captured, { host: "127.0.0.1", port: 0 }, resolve);
        });
        const base = "http://127.0.0.1:" + captured.address().port;
        const health = await fetch(base + "/health");
        assert.equal(health.status, 200);
        assert.deepEqual(await health.json(), { status: "ok" });
        const token = await fetch(base + "/auth/demo-token", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ sessionId: randomUUID(), source: "playground" }),
        });
        assert.equal(token.status, 200);
        assert.equal(typeof (await token.json()).accessToken, "string");
        console.log("vercel startup health and demo token passed");
        process.kill(process.pid, "SIGTERM");
      `,
    ],
    {
      cwd: fileURLToPath(new URL("..", import.meta.url)),
      env: environment,
      timeout: 5_000,
    },
  );
  expect(stdout).toContain("vercel startup health and demo token passed");
}, 10_000);
