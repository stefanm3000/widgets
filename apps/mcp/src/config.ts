export interface McpConfig {
  apiUrl: string;
  accessToken: string;
}

export function readConfig(environment: NodeJS.ProcessEnv): McpConfig {
  const accessToken = environment.PULSE_ACCESS_TOKEN?.trim();
  if (!accessToken || /\s/.test(accessToken)) {
    throw new Error("PULSE_ACCESS_TOKEN must contain a Pulse bearer token");
  }

  let url: URL;
  try {
    url = new URL(environment.PULSE_API_URL ?? "http://127.0.0.1:4000");
  } catch {
    throw new Error("PULSE_API_URL must be a valid API URL");
  }
  const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (
    (url.protocol !== "https:" && !(url.protocol === "http:" && loopback)) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new Error(
      "PULSE_API_URL requires HTTPS or loopback HTTP, without credentials, query, or fragment",
    );
  }
  return { apiUrl: url.href, accessToken };
}
