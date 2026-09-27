import { describe, expect, it } from "vitest";

import { readConfig } from "./config.js";

const productionSecret = "production-token-secret-with-32-characters";

describe("API configuration", () => {
  it("allows the in-memory store outside production", () => {
    expect(readConfig({ NODE_ENV: "test" }).databaseUrl).toBeUndefined();
  });

  it("requires PostgreSQL in production", () => {
    expect(() =>
      readConfig({
        NODE_ENV: "production",
        PULSE_TOKEN_SECRET: productionSecret,
      }),
    ).toThrow("DATABASE_URL is required in production");
  });

  it("reads a production database URL", () => {
    const databaseUrl = "postgresql://pulse:pulse@localhost:5432/pulse";

    expect(
      readConfig({
        DATABASE_URL: databaseUrl,
        NODE_ENV: "production",
        PULSE_TOKEN_SECRET: productionSecret,
      }).databaseUrl,
    ).toBe(databaseUrl);
  });
});
