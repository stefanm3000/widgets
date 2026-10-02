export function getApiUrl(): string {
  return new URL(
    import.meta.env.VITE_PULSE_API_URL ?? "/api/",
    globalThis.location.href,
  ).toString();
}
