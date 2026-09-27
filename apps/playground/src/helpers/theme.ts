import type { ChatWidgetTheme } from "@pulse/chat-widget";

export type ThemePreset = NonNullable<ChatWidgetTheme["preset"]>;

export const themeOptions = [
  "system",
  "light",
  "dark",
] as const satisfies readonly ThemePreset[];
