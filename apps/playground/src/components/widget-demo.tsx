import { ChatWidget } from "@pulse/chat-widget";
import { useState } from "react";

import { useDemoSession } from "../hooks/use-demo-session";
import { IdentityForm } from "./identity-form";
import { ThemeSelector, type ThemePreset } from "./theme-selector";
import { Button } from "./ui/button";
import { Card } from "./ui/card";

const roomId = "demo-room";

export function WidgetDemo() {
  const { applyIdentity, displayName, session, setDisplayName } =
    useDemoSession();
  const [theme, setTheme] = useState<ThemePreset>("system");

  const openSecondTab = () => {
    globalThis.open(globalThis.location.href, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="mx-auto w-full max-w-[480px]">
      <div className="mb-3 flex items-center justify-between px-1">
        <div>
          <p className="text-[10px] font-bold tracking-[0.11em] text-[#777b72] uppercase">
            Signed in as
          </p>
          <p className="mt-0.5 text-sm font-semibold">{session.displayName}</p>
        </div>
        <Button
          className="rounded-full"
          onClick={openSecondTab}
          size="sm"
          type="button"
          variant="outline"
        >
          Open second tab
        </Button>
      </div>

      <Card className="rounded-[32px] bg-white/50 p-2.5 shadow-[0_32px_90px_rgba(35,39,29,0.16)] backdrop-blur-xl">
        <ChatWidget
          client={session.client}
          key={session.id}
          roomId={roomId}
          theme={{ preset: theme, radius: "22px" }}
        />
      </Card>

      <Card className="mt-4 grid gap-3 p-4 sm:grid-cols-[1fr_auto]">
        <IdentityForm
          displayName={displayName}
          onDisplayNameChange={setDisplayName}
          onSubmit={applyIdentity}
        />
        <ThemeSelector onChange={setTheme} value={theme} />
      </Card>

      <p className="mt-3 px-2 text-center text-[11px] leading-5 text-[#777b72]">
        Messages are shared across sessions. Open another tab with a different
        identity to test realtime delivery.
      </p>
    </div>
  );
}
