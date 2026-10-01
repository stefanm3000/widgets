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
  reason?: "cursor_expired" | "replay_limit";
}

export const MAX_REPLAY_EVENTS = 500;

export interface AddMessageResult {
  created: boolean;
  message: Message;
}

export interface ChatStore {
  createChannel(parentRoomId: string, name: string): Promise<Room>;
  listChannels(parentRoomId: string): Promise<Room[]>;
  getParentRoomId(roomId: string): Promise<string | undefined>;
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
