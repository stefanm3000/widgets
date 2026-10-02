import type { ChatWidgetTheme, PulseChatElement } from "@pulse/embed";
import type { PulseClient } from "@pulse/sdk";
import type { Attachment } from "svelte/attachments";

interface ChatAttachmentOptions {
  createClient: () => PulseClient;
  theme: ChatWidgetTheme;
  onError: () => void;
}

export function createChatAttachment({
  createClient,
  theme,
  onError,
}: ChatAttachmentOptions): Attachment<PulseChatElement> {
  return (chat) => {
    let disposed = false;
    let client: PulseClient | undefined;

    // Attachments run in the browser; keep the DOM-dependent embed out of SSR.
    void import("@pulse/embed")
      .then(() => {
        if (disposed) return;
        client = createClient();
        chat.theme = theme;
        chat.client = client;
      })
      .catch(() => {
        if (!disposed) onError();
      });

    return () => {
      disposed = true;
      if (client) chat.client = null;
      client?.dispose();
    };
  };
}
