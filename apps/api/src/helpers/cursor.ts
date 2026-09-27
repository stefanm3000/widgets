export function parseCursor(
  cursor: string | undefined,
  messageCount: number,
): number | null {
  if (!cursor) return messageCount;
  const value = Number(cursor);
  if (!Number.isSafeInteger(value) || value < 0 || value > messageCount) {
    return null;
  }
  return value;
}
