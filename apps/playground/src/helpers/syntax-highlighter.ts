import tsx from "@shikijs/langs/tsx";
import vitesseDark from "@shikijs/themes/vitesse-dark";
import { createHighlighterCoreSync } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";

const highlighter = createHighlighterCoreSync({
  engine: createJavaScriptRegexEngine(),
  langs: [tsx],
  themes: [vitesseDark],
});

export function highlightTsx(code: string): string {
  return highlighter.codeToHtml(code, {
    lang: "tsx",
    theme: "vitesse-dark",
  });
}
