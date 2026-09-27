import { themeOptions, type ThemePreset } from "../helpers/theme";
import { ToggleGroup, ToggleGroupItem } from "./ui/toggle-group";

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
