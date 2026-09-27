import githubDarkHighContrast from "@shikijs/themes/github-dark-high-contrast";
import { createHighlighterCoreSync } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";

import type { IntegrationLanguage } from "./integration-code";

const languageLoaders = {
  javascript: () => import("@shikijs/langs/javascript"),
  svelte: () => import("@shikijs/langs/svelte"),
  tsx: () => import("@shikijs/langs/tsx"),
  vue: () => import("@shikijs/langs/vue"),
};

type SyntaxHighlighter = ReturnType<typeof createHighlighterCoreSync>;

const highlighters = new Map<IntegrationLanguage, Promise<SyntaxHighlighter>>();

export function loadSyntaxHighlighter(
  language: IntegrationLanguage,
): Promise<SyntaxHighlighter> {
  const cachedHighlighter = highlighters.get(language);
  if (cachedHighlighter) return cachedHighlighter;

  const highlighter = languageLoaders[language]().then(
    ({ default: grammar }) => {
      return createHighlighterCoreSync({
        engine: createJavaScriptRegexEngine(),
        langs: [grammar],
        themes: [githubDarkHighContrast],
      });
    },
  );

  highlighters.set(language, highlighter);
  return highlighter;
}
