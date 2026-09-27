import type { ConnectionState, Message, PulseClient, Room } from "@pulse/sdk";

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
  preset?: "light" | "dark" | "system";
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
}

export type ChatWidgetClient = Pick<
  PulseClient,
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

export interface ChatWidgetSnapshot {
  connectionState: ConnectionState;
  currentUserId: string | null;
  error: string | null;
  loading: boolean;
  messages: Message[];
  room: Room | null;
  sending: boolean;
}
