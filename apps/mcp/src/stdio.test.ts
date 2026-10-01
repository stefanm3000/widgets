import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";

import { expect, it } from "vitest";

it("fails startup without credentials and keeps stdout free of diagnostics", async () => {
  const result = await new Promise<{
    code: number | string | null | undefined;
    stdout: string;
    stderr: string;
  }>((resolve) => {
    execFile(
      process.execPath,
      [fileURLToPath(new URL("../dist/stdio.js", import.meta.url))],
      {
        env: {
          ...process.env,
          PULSE_ACCESS_TOKEN: "",
          PULSE_API_URL: "https://secret@example.com",
        },
        timeout: 5_000,
      },
      (error, stdout, stderr) => resolve({ code: error?.code, stdout, stderr }),
    );
  });
  expect(result.code).toBe(1);
  expect(result.stdout).toBe("");
  expect(result.stderr).toContain("Check PULSE_API_URL and PULSE_ACCESS_TOKEN");
  expect(result.stderr).not.toContain("secret@example.com");
});
