import { Card, CardContent, CardHeader } from "./ui/card";

const integrationCode = `import { ChatWidget } from "@pulse/chat-widget"
import { createPulseClient } from "@pulse/sdk"

const client = createPulseClient({
  baseUrl: "https://chat.example.com/",
  getToken: () => fetchChatToken(),
})

<ChatWidget client={client} roomId="support-room" />`;

export function IntegrationExample() {
  return (
    <Card className="mt-10 gap-0 bg-[#191b17] p-1.5 shadow-[0_22px_70px_rgba(22,24,19,0.16)] backdrop-blur-none">
      <CardHeader className="text-[10px] font-semibold tracking-[0.08em] text-white/45 uppercase">
        <span>Partner integration</span>
        <span>React</span>
      </CardHeader>
      <CardContent className="p-0">
        <pre className="overflow-x-auto rounded-[18px] bg-[#10120f] p-5 text-[12px] leading-6 text-[#d5d9cc]">
          <code>{integrationCode}</code>
        </pre>
      </CardContent>
    </Card>
  );
}
