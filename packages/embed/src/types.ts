import type {
  ChatWidgetClient,
  ChatWidgetTheme,
} from "@pulse/chat-widget/unstyled";

import type { PulseChatElement } from "./components/pulse-chat-element";

export interface PulseChatOptions {
  client: ChatWidgetClient;
  roomId: string;
  theme?: ChatWidgetTheme;
}

export interface PulseChatHandle {
  destroy(): void;
  readonly element: PulseChatElement;
  update(options: Partial<PulseChatOptions>): void;
}

export type { ChatWidgetClient, ChatWidgetTheme };
