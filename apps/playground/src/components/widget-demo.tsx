import { ChatWidget } from "@pulse/chat-widget";

import { useDemoSession } from "../hooks/use-demo-session";

const roomId = "demo-room";

export function WidgetDemo() {
  const { session } = useDemoSession();

  return (
    <div className="w-full">
      <ChatWidget
        className="playground-chat-widget max-w-none shadow-xl"
        client={session.client}
        roomId={roomId}
        theme={{ preset: "dark", radius: "22px" }}
      />
    </div>
  );
}
