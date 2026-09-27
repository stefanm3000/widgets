import type { ChatWidgetTheme } from "@pulse/chat-widget";

export type ThemePreset = NonNullable<ChatWidgetTheme["preset"]>;

const themeOptions = ["system", "light", "dark"] as const;

interface ThemeSelectorProps {
  onChange: (theme: ThemePreset) => void;
  value: ThemePreset;
}

export function ThemeSelector({ onChange, value }: ThemeSelectorProps) {
  return (
    <div
      aria-label="Widget theme"
      className="grid grid-cols-3 rounded-xl bg-black/5 p-1"
      role="group"
    >
      {themeOptions.map((option) => (
        <button
          aria-pressed={value === option}
          className="rounded-lg px-2.5 py-1.5 text-[11px] font-semibold capitalize text-[#6c7067] transition aria-pressed:bg-white aria-pressed:text-black aria-pressed:shadow-sm"
          key={option}
          onClick={() => onChange(option)}
          type="button"
        >
          {option}
        </button>
      ))}
    </div>
  );
}
