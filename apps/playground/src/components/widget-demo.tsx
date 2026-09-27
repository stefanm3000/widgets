import { ChatWidget } from "@pulse/chat-widget";
import { useState } from "react";

import { useDemoSession } from "../hooks/use-demo-session";
import { IdentityForm } from "./identity-form";
import { ThemeSelector, type ThemePreset } from "./theme-selector";

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
        <button
          className="rounded-full border border-black/10 bg-white/70 px-3 py-1.5 text-xs font-semibold shadow-sm transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
          onClick={openSecondTab}
          type="button"
        >
          Open second tab
        </button>
      </div>

      <div className="rounded-[32px] border border-black/10 bg-white/50 p-2.5 shadow-[0_32px_90px_rgba(35,39,29,0.16)] backdrop-blur-xl">
        <ChatWidget
          client={session.client}
          key={session.id}
          roomId={roomId}
          theme={{ preset: theme, radius: "22px" }}
        />
      </div>

      <div className="mt-4 grid gap-3 rounded-3xl border border-black/10 bg-white/60 p-4 shadow-sm backdrop-blur sm:grid-cols-[1fr_auto]">
        <IdentityForm
          displayName={displayName}
          onDisplayNameChange={setDisplayName}
          onSubmit={applyIdentity}
        />
        <ThemeSelector onChange={setTheme} value={theme} />
      </div>

      <p className="mt-3 px-2 text-center text-[11px] leading-5 text-[#777b72]">
        Messages are shared across sessions. Open another tab with a different
        identity to test realtime delivery.
      </p>
    </div>
  );
}
