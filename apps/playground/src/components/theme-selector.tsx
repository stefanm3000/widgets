import type { ChatWidgetTheme } from "@pulse/chat-widget";

import { ToggleGroup, ToggleGroupItem } from "./ui/toggle-group";

export type ThemePreset = NonNullable<ChatWidgetTheme["preset"]>;

const themeOptions = ["system", "light", "dark"] as const;

interface ThemeSelectorProps {
  onChange: (theme: ThemePreset) => void;
  value: ThemePreset;
}

export function ThemeSelector({ onChange, value }: ThemeSelectorProps) {
  return (
    <ToggleGroup
      aria-label="Widget theme"
      className="grid grid-cols-3"
      onValueChange={(theme) => {
        if (theme) onChange(theme as ThemePreset);
      }}
      type="single"
      value={value}
    >
      {themeOptions.map((option) => (
        <ToggleGroupItem
          aria-label={`${option} theme`}
          key={option}
          value={option}
        >
          {option}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
