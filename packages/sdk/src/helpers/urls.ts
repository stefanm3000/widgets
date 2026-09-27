export function normalizeBaseUrl(baseUrl: string): URL {
  const url = new URL(baseUrl);
  url.pathname = `${url.pathname.replace(/\/$/, "")}/`;
  url.search = "";
  url.hash = "";
  return url;
}

export function createRealtimeUrl(baseUrl: URL): string {
  const url = new URL("realtime", baseUrl);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  return url.toString();
}
