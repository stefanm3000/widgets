import type {
  HistoryQuery,
  Message,
  MessagePage,
  Participant,
  RealtimeEvent,
  Room,
  SendMessageRequest,
} from "@pulse/protocol";

export interface EventReplay {
  events: RealtimeEvent[];
  expired: boolean;
}

export interface AddMessageResult {
  created: boolean;
  message: Message;
}

export interface ChatStore {
  addMessage(
    roomId: string,
    sender: Participant,
    input: SendMessageRequest,
  ): Promise<AddMessageResult | null>;
  close?(): Promise<void>;
  getCurrentCursor(roomId: string): Promise<string | null>;
  getEventsAfter(roomId: string, cursor: string): Promise<EventReplay>;
  getMessages(roomId: string, query: HistoryQuery): Promise<MessagePage | null>;
  getRoom(roomId: string): Promise<Room | undefined>;
  subscribe(
    roomId: string,
    listener: (event: RealtimeEvent) => void,
  ): () => void;
}
