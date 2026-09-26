import type { CSSProperties } from "react";

import type { ChatWidgetTheme } from "../types";

export type ResolvedTheme = "light" | "dark";

export type ThemeStyle = CSSProperties & Record<`--pulse-${string}`, string>;

const themes = {
  dark: {
    background: "#11131a",
    border: "#303544",
    danger: "#ff8a80",
    muted: "#a4abba",
    primary: "#9292ff",
    primaryForeground: "#11131a",
    surface: "#191c25",
    text: "#f4f5f8",
  },
  light: {
    background: "#f5f7fb",
    border: "#dce1ea",
    danger: "#b42318",
    muted: "#687386",
    primary: "#5b5bd6",
    primaryForeground: "#ffffff",
    surface: "#ffffff",
    text: "#172033",
  },
} satisfies Record<ResolvedTheme, Record<string, string>>;

export function subscribeToSystemTheme(listener: () => void): () => void {
  const query = globalThis.matchMedia?.("(prefers-color-scheme: dark)");
  if (!query) return () => undefined;
  query.addEventListener("change", listener);
  return () => query.removeEventListener("change", listener);
}

export function getSystemTheme(): ResolvedTheme {
  return globalThis.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function resolveTheme(
  preset: ChatWidgetTheme["preset"],
  systemTheme: ResolvedTheme,
): ResolvedTheme {
  if (preset === "dark" || preset === "light") return preset;
  return systemTheme;
}

export function createThemeStyle(
  theme: ChatWidgetTheme,
  resolvedTheme: ResolvedTheme,
): ThemeStyle {
  const defaults = themes[resolvedTheme];
  const colors = theme.colors;

  return {
    "--pulse-background": colors?.background ?? defaults.background,
    "--pulse-border": colors?.border ?? defaults.border,
    "--pulse-danger": colors?.danger ?? defaults.danger,
    "--pulse-font":
      theme.fontFamily ??
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    "--pulse-muted": colors?.muted ?? defaults.muted,
    "--pulse-primary": colors?.primary ?? defaults.primary,
    "--pulse-primary-foreground": defaults.primaryForeground,
    "--pulse-radius": theme.radius ?? "18px",
    "--pulse-surface": colors?.surface ?? defaults.surface,
    "--pulse-text": colors?.text ?? defaults.text,
    colorScheme: resolvedTheme,
  };
}
