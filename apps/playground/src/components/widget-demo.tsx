import { ChatWidget } from "@pulse/chat-widget";

import { useDemoSession } from "../hooks/use-demo-session";

const roomId = "demo-room";

export function WidgetDemo() {
  const { session } = useDemoSession();

  return (
    <div className="mx-auto w-full max-w-110">
      <ChatWidget
        className="playground-chat-widget max-w-none shadow-[0_24px_70px_rgba(35,39,29,0.14)]"
        client={session.client}
        key={session.id}
        roomId={roomId}
        theme={{ preset: "system", radius: "22px" }}
      />
    </div>
  );
}
