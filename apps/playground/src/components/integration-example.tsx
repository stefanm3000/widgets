import { lazy, Suspense } from "react";

import { integrationCode } from "../helpers/integration-code";
import { CopyCodeButton } from "./copy-code-button";
import { Card, CardContent, CardHeader } from "./ui/card";

const HighlightedIntegrationCode = lazy(
  () => import("./highlighted-integration-code"),
);

export function IntegrationExample() {
  return (
    <Card className="mt-10 gap-0 bg-[#191b17] p-1.5 shadow-[0_22px_70px_rgba(22,24,19,0.16)] backdrop-blur-none">
      <CardHeader className="text-[10px] font-semibold tracking-[0.08em] text-white/45 uppercase">
        <span>Partner integration</span>
        <div className="flex items-center gap-3">
          <span>React</span>
          <CopyCodeButton code={integrationCode} />
        </div>
      </CardHeader>
      <CardContent className="p-0 [&_.shiki]:m-0 [&_.shiki]:overflow-x-auto [&_.shiki]:rounded-[18px] [&_.shiki]:bg-[#10120f]! [&_.shiki]:p-5 [&_.shiki]:text-[12px] [&_.shiki]:leading-6">
        <Suspense
          fallback={
            <pre className="m-0 overflow-x-auto rounded-[18px] bg-[#10120f] p-5 text-[12px] leading-6 text-[#d5d9cc]">
              <code>{integrationCode}</code>
            </pre>
          }
        >
          <HighlightedIntegrationCode />
        </Suspense>
      </CardContent>
    </Card>
  );
}
