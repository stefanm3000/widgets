import type { CSSProperties } from "react";

import type { ChatWidgetTheme } from "../types";

export function createThemeStyle(theme: ChatWidgetTheme): CSSProperties {
  const style: CSSProperties & Record<`--pulse-${string}`, string> = {};
  for (const [name, color] of Object.entries(theme.colors ?? {})) {
    if (color) style[`--pulse-${name}`] = color;
  }
  if (theme.fontFamily) style["--pulse-font"] = theme.fontFamily;
  if (theme.radius) style["--pulse-radius"] = theme.radius;
  return style;
}
