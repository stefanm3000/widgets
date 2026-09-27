import { lazy, Suspense, useState } from "react";

import {
  integrationSnippets,
  type IntegrationFramework,
} from "../helpers/integration-code";
import { CopyCodeButton } from "./copy-code-button";
import { IntegrationFrameworkSelector } from "./integration-framework-selector";
import { Card, CardContent, CardHeader } from "./ui/card";

const HighlightedIntegrationCode = lazy(
  () => import("./highlighted-integration-code"),
);

export function IntegrationExample() {
  const [framework, setFramework] = useState<IntegrationFramework>("react");
  const snippet = integrationSnippets[framework];

  return (
    <Card className="mt-10 gap-0 bg-[#191b17] p-1.5 shadow-[0_22px_70px_rgba(22,24,19,0.16)] backdrop-blur-none">
      <CardHeader className="flex-col items-stretch gap-2 text-[10px] font-semibold tracking-[0.08em] text-white/45 uppercase">
        <div className="flex items-center justify-between">
          <span>Partner integration</span>
          <CopyCodeButton code={snippet.code} key={framework} />
        </div>
        <IntegrationFrameworkSelector
          onChange={setFramework}
          value={framework}
        />
      </CardHeader>
      <CardContent className="p-0 [&_.shiki]:m-0 [&_.shiki]:h-72 [&_.shiki]:overflow-auto [&_.shiki]:rounded-[18px] [&_.shiki]:bg-[#10120f]! [&_.shiki]:p-5 [&_.shiki]:text-[12px] [&_.shiki]:leading-6">
        <Suspense
          fallback={
            <pre className="m-0 h-72 overflow-auto rounded-[18px] bg-[#10120f] p-5 text-[12px] leading-6 text-[#d5d9cc]">
              <code>{snippet.code}</code>
            </pre>
          }
        >
          <HighlightedIntegrationCode
            code={snippet.code}
            language={snippet.language}
          />
        </Suspense>
      </CardContent>
    </Card>
  );
}
