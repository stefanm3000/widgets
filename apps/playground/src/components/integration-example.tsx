import { Code, FileTree, type Theme } from "@sugar-high/react";
import { ExternalLink } from "lucide-react";
import { useState } from "react";

import {
  integrationFilePaths,
  integrationFiles,
  isIntegrationFilePath,
  type IntegrationFilePath,
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
  background: "#10120f",
  foreground: "#d5d9cc",
  class: "#d2a8ff",
  comment: "#8b949e",
  control: "#8b949e",
  entity: "#ffa657",
  identifier: "#d5d9cc",
  jsxliterals: "#7ee787",
  keyword: "#ff7b72",
  property: "#79c0ff",
  sign: "#8b949e",
  string: "#a5d6ff",
} as const satisfies Theme;

export function IntegrationExample() {
  const [activeFile, setActiveFile] =
    useState<IntegrationFilePath>("README.md");
  const snippet = integrationFiles[activeFile];

  return (
    <Card className="h-full gap-0 rounded-[22px] bg-[#191b17] p-1.5 shadow-[0_22px_70px_rgba(22,24,19,0.16)] backdrop-blur-none">
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
        <CopyCodeButton code={snippet.code} key={activeFile} />
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 p-0">
        <div className="grid h-72 min-h-0 w-full grid-cols-[120px_minmax(0,1fr)] overflow-hidden rounded-2xl bg-[#10120f] sm:grid-cols-[148px_minmax(0,1fr)] md:h-full">
          <FileTree
            activeFile={activeFile}
            aria-label="Partner implementation files"
            className="border-r border-white/10 text-white/65 [--sh-font-size:12px]"
            onActiveFileChange={(path) => {
              if (isIntegrationFilePath(path)) setActiveFile(path);
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
