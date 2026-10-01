import { describe, expect, it } from "vitest";

import { readConfig } from "./config.js";

describe("MCP configuration", () => {
  it("requires explicit credentials and defaults to the local API", () => {
    expect(() => readConfig({})).toThrow("PULSE_ACCESS_TOKEN");
    expect(() => readConfig({ PULSE_ACCESS_TOKEN: " " })).toThrow(
      "PULSE_ACCESS_TOKEN",
    );
    expect(readConfig({ PULSE_ACCESS_TOKEN: " token " })).toEqual({
      accessToken: "token",
      apiUrl: "http://127.0.0.1:4000/",
    });
  });

  it.each([
    "http://api.example.com",
    "file:///tmp/pulse",
    "https://user:secret@example.com",
    "https://example.com?token=secret",
    "https://example.com#secret",
    "not-a-url",
  ])("rejects an unsafe API URL without echoing it: %s", (apiUrl) => {
    expect(() =>
      readConfig({ PULSE_ACCESS_TOKEN: "token", PULSE_API_URL: apiUrl }),
    ).toThrow("PULSE_API_URL");
    try {
      readConfig({ PULSE_ACCESS_TOKEN: "token", PULSE_API_URL: apiUrl });
    } catch (error) {
      expect(String(error)).not.toContain(apiUrl);
      expect(String(error)).not.toContain("secret");
    }
  });

  it.each([
    "http://localhost:4000",
    "http://[::1]:4000",
    "https://api.example.com/pulse/",
  ])("accepts %s", (apiUrl) => {
    expect(
      readConfig({ PULSE_ACCESS_TOKEN: "token", PULSE_API_URL: apiUrl }).apiUrl,
    ).toBe(new URL(apiUrl).href);
  });
});
