const integrationCode = `import { ChatWidget } from "@pulse/chat-widget"
import { createPulseClient } from "@pulse/sdk"

const client = createPulseClient({
  baseUrl: "https://chat.example.com/",
  getToken: () => fetchChatToken(),
})

<ChatWidget client={client} roomId="support-room" />`;

export function IntegrationExample() {
  return (
    <div className="mt-10 rounded-3xl border border-black/10 bg-[#191b17] p-1.5 shadow-[0_22px_70px_rgba(22,24,19,0.16)]">
      <div className="flex items-center justify-between px-4 py-2.5 text-[10px] font-semibold tracking-[0.08em] text-white/45 uppercase">
        <span>Partner integration</span>
        <span>React</span>
      </div>
      <pre className="overflow-x-auto rounded-[18px] bg-[#10120f] p-5 text-[12px] leading-6 text-[#d5d9cc]">
        <code>{integrationCode}</code>
      </pre>
    </div>
  );
}
