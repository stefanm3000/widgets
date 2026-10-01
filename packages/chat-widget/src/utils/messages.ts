import type { Message } from "@pulse/sdk";

export function messageKey(message: Message): string {
  return `${message.roomId}:${message.sender.id}:${message.clientMessageId}`;
}

export function mergeMessages<T extends Message>(
  current: T[],
  incoming: T[],
): T[] {
  const messages = new Map(
    current.map((message) => [messageKey(message), message]),
  );
  for (const message of incoming) messages.set(messageKey(message), message);

  return [...messages.values()].sort(
    (left, right) =>
      left.createdAt.localeCompare(right.createdAt) ||
      left.id.localeCompare(right.id),
  );
}

export function formatTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}
