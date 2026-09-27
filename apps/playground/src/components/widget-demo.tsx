import { ChatWidget } from "@pulse/chat-widget";

import { useDemoSession } from "../hooks/use-demo-session";
import { usePlaygroundStore } from "../stores/playground-store";
import { IdentityForm } from "./identity-form";
import { ThemeSelector } from "./theme-selector";
import { Card } from "./ui/card";

const roomId = "demo-room";

export function WidgetDemo() {
  const { applyIdentity, session } = useDemoSession();
  const setTheme = usePlaygroundStore((state) => state.setTheme);
  const theme = usePlaygroundStore((state) => state.theme);

  return (
    <div className="mx-auto w-full max-w-110">
      <ChatWidget
        className="max-w-none rounded-b-none shadow-[0_24px_70px_rgba(35,39,29,0.14)]"
        client={session.client}
        key={session.id}
        roomId={roomId}
        theme={{ preset: theme, radius: "22px" }}
      />

      <Card className="-mt-px grid gap-2 rounded-t-none rounded-b-2xl border-t-0 bg-white/70 p-2.5 sm:grid-cols-[1fr_auto]">
        <IdentityForm
          defaultDisplayName={session.displayName}
          key={session.id}
          onSubmit={applyIdentity}
        />
        <ThemeSelector onChange={setTheme} value={theme} />
      </Card>
    </div>
  );
}
