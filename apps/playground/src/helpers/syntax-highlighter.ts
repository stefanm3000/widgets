import tsx from "@shikijs/langs/tsx";
import githubDarkHighContrast from "@shikijs/themes/github-dark-high-contrast";
import { createHighlighterCoreSync } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";

const highlighter = createHighlighterCoreSync({
  engine: createJavaScriptRegexEngine(),
  langs: [tsx],
  themes: [githubDarkHighContrast],
});

export function highlightTsx(code: string): string {
  return highlighter.codeToHtml(code, {
    lang: "tsx",
    theme: "github-dark-high-contrast",
  });
}
