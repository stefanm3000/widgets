export const integrationCode = `import { ChatWidget } from "@pulse/chat-widget"
import { createPulseClient } from "@pulse/sdk"

const client = createPulseClient({
  baseUrl: "https://chat.example.com/",
  getToken: () => fetchChatToken(),
})

<ChatWidget client={client} roomId="support-room" />`;
