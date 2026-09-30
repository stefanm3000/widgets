import type { Message, PulseClient } from "@pulse/sdk";

export interface ChatWidgetTheme {
  colors?: Partial<{
    background: string;
    border: string;
    danger: string;
    muted: string;
    primary: string;
    surface: string;
    text: string;
  }>;
  fontFamily?: string;
  preset?: "light" | "dark";
  radius?: string;
}

export interface ChatWidgetClassNames {
  composer?: string;
  connectionStatus?: string;
  header?: string;
  input?: string;
  message?: string;
  messageList?: string;
  messageOutline?: string;
  root?: string;
  sendButton?: string;
  sidebar?: string;
}

export type ChatWidgetClient = Pick<
  PulseClient,
  | "createChannel"
  | "getChannels"
  | "getCurrentUser"
  | "getMessages"
  | "getRoom"
  | "onConnectionState"
  | "onError"
  | "onRefetchRequired"
  | "sendMessage"
  | "subscribe"
>;

export interface ChatWidgetProps {
  className?: string;
  classNames?: ChatWidgetClassNames;
  client: ChatWidgetClient;
  roomId: string;
  theme?: ChatWidgetTheme;
}

export type OptimisticMessage = Message & { optimistic?: true };
