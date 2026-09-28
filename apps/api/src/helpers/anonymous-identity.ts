import { createHmac } from "node:crypto";

import type { DemoClientSource, Participant } from "@pulse/protocol";

const adjectives = [
  "Amber",
  "Blue",
  "Brave",
  "Bright",
  "Calm",
  "Charismatic",
  "Clever",
  "Cosmic",
  "Curious",
  "Daring",
  "Emerald",
  "Friendly",
  "Gentle",
  "Golden",
  "Happy",
  "Jolly",
  "Kind",
  "Lucky",
  "Merry",
  "Mighty",
  "Nimble",
  "Playful",
  "Quick",
  "Radiant",
  "Silver",
  "Sunny",
  "Swift",
  "Vivid",
] as const;

const animals = [
  "Badger",
  "Bear",
  "Dolphin",
  "Falcon",
  "Fox",
  "Gecko",
  "Heron",
  "Koala",
  "Lemur",
  "Lizard",
  "Lynx",
  "Otter",
  "Owl",
  "Panda",
  "Penguin",
  "Rabbit",
  "Raven",
  "Robin",
  "Seal",
  "Sparrow",
  "Tiger",
  "Turtle",
  "Whale",
  "Wolf",
  "Wombat",
  "Yak",
] as const;

function digestToUuid(digest: Buffer): string {
  const bytes = Buffer.from(digest.subarray(0, 16));
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x50;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  const hex = bytes.toString("hex");

  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join("-");
}

export function createAnonymousParticipant(
  source: DemoClientSource,
  sessionId: string,
  secret: Uint8Array,
): Participant & { source: DemoClientSource } {
  const digest = createHmac("sha256", secret)
    .update(`${source}:${sessionId}`)
    .digest();
  const adjective = adjectives[digest.readUInt16BE(16) % adjectives.length];
  const animal = animals[digest.readUInt16BE(18) % animals.length];

  return {
    id: digestToUuid(digest),
    displayName: `${adjective} ${animal}`,
    source,
  };
}
