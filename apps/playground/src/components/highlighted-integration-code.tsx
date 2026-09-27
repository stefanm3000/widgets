import { use } from "react";

import type { IntegrationLanguage } from "../helpers/integration-code";
import { loadSyntaxHighlighter } from "../helpers/syntax-highlighter";

interface HighlightedIntegrationCodeProps {
  code: string;
  language: IntegrationLanguage;
}

export default function HighlightedIntegrationCode({
  code,
  language,
}: HighlightedIntegrationCodeProps) {
  const highlighter = use(loadSyntaxHighlighter(language));
  const highlightedCode = highlighter.codeToHtml(code, {
    lang: language,
    theme: "github-dark-high-contrast",
  });

  return <div dangerouslySetInnerHTML={{ __html: highlightedCode }} />;
}
