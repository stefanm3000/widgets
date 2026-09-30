import { Code, FileTree, type Theme } from "@sugar-high/react";
import { ExternalLink } from "lucide-react";
import { parseAsStringLiteral, useQueryState } from "nuqs";

import {
  integrationFilePaths,
  integrationFiles,
  isIntegrationFilePath,
} from "../helpers/integration-code";
import { CopyCodeButton } from "./copy-code-button";
import { Card, CardContent, CardHeader } from "./ui/card";

const partnerDeployments = [
  {
    href: "https://widgets-partner-vue.vercel.app",
    label: "Vue app",
  },
  {
    href: "https://widgets-partner-vanilla.vercel.app",
    label: "Vanilla app",
  },
] as const;

const codeTheme = {
  background: "var(--code-background)",
  foreground: "var(--code-foreground)",
  class: "var(--code-class)",
  comment: "var(--code-comment)",
  control: "var(--code-control)",
  entity: "var(--code-entity)",
  identifier: "var(--code-identifier)",
  jsxliterals: "var(--code-jsxliterals)",
  keyword: "var(--code-keyword)",
  property: "var(--code-property)",
  sign: "var(--code-sign)",
  string: "var(--code-string)",
} as const satisfies Theme;

export function IntegrationExample() {
  const [activeFile, setActiveFile] = useQueryState(
    "file",
    parseAsStringLiteral(integrationFilePaths).withDefault("react/App.tsx"),
  );
  const snippet = integrationFiles[activeFile];

  return (
    <Card className="h-full gap-0 rounded-[22px] bg-code-card p-1.5 shadow-xl backdrop-blur-none">
      <CardHeader className="justify-between gap-1.5">
        <nav aria-label="Partner app deployments" className="flex gap-1.5">
          {partnerDeployments.map(({ href, label }) => (
            <a
              className="inline-flex h-7 items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 text-[10px] font-semibold text-white/70 transition hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              href={href}
              key={href}
              rel="noreferrer"
              target="_blank"
            >
              {label}
              <ExternalLink aria-hidden="true" className="size-3" />
            </a>
          ))}
        </nav>
        <CopyCodeButton code={snippet.code} />
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 p-0">
        <div className="grid h-72 min-h-0 w-full grid-cols-[120px_minmax(0,1fr)] overflow-hidden rounded-2xl bg-code-background sm:grid-cols-[148px_minmax(0,1fr)] md:h-full">
          <FileTree
            activeFile={activeFile}
            aria-label="Partner implementation files"
            className="border-r border-white/10 text-white/65 [--sh-font-size:12px]"
            onActiveFileChange={(path) => {
              if (isIntegrationFilePath(path)) void setActiveFile(path);
            }}
            paths={integrationFilePaths}
            theme={codeTheme}
          />
          <Code
            className="syntax-highlight h-full min-w-0 overflow-auto"
            fontSize={13}
            lang={snippet.language}
            padding="1.25rem"
            theme={codeTheme}
            wrapLongLines={false}
          >
            {snippet.code}
          </Code>
        </div>
      </CardContent>
    </Card>
  );
}
