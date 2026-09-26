import type {
  ConnectionState,
  Message as ChatMessage,
  PulseClient,
  RealtimeEvent,
  Room,
} from "@pulse/sdk";
import {
  type CSSProperties,
  type FormEvent,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";

import { cn } from "./lib/cn.js";
import { Bubble, BubbleContent } from "./ui/bubble.js";
import { Marker, MarkerContent, MarkerIcon } from "./ui/marker.js";
import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageHeader,
} from "./ui/message.js";
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "./ui/message-scroller.js";
import "./styles.css";

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

interface ChatWidgetSnapshot {
  connectionState: ConnectionState;
  error: string | null;
  loading: boolean;
  messages: ChatMessage[];
  room: Room | null;
  sending: boolean;
}

type ThemeStyle = CSSProperties & Record<`--pulse-${string}`, string>;

const stateLabels: Record<ConnectionState, string> = {
  connected: "Connected",
  connecting: "Connecting",
  offline: "Offline",
  reconnecting: "Reconnecting",
};

const lightTheme = {
  background: "#f5f7fb",
  border: "#dce1ea",
  danger: "#b42318",
  muted: "#687386",
  primary: "#5b5bd6",
  primaryForeground: "#ffffff",
  surface: "#ffffff",
  text: "#172033",
};

const darkTheme = {
  background: "#11131a",
  border: "#303544",
  danger: "#ff8a80",
  muted: "#a4abba",
  primary: "#9292ff",
  primaryForeground: "#11131a",
  surface: "#191c25",
  text: "#f4f5f8",
};

function mergeMessages(
  current: ChatMessage[],
  incoming: ChatMessage[],
): ChatMessage[] {
  const messages = new Map(current.map((message) => [message.id, message]));
  for (const message of incoming) messages.set(message.id, message);
  return [...messages.values()].sort(
    (left, right) =>
      left.createdAt.localeCompare(right.createdAt) ||
      left.id.localeCompare(right.id),
  );
}

function messageFor(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

class ChatWidgetStore {
  private generation = 0;
  private listeners = new Set<() => void>();
  private snapshot: ChatWidgetSnapshot = {
    connectionState: "offline",
    error: null,
    loading: true,
    messages: [],
    room: null,
    sending: false,
  };
  private started = false;
  private stopCallbacks: Array<() => void> = [];

  constructor(
    private readonly client: ChatWidgetClient,
    private readonly roomId: string,
  ) {}

  getSnapshot = () => this.snapshot;

  getServerSnapshot = () => this.snapshot;

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    if (!this.started) this.start();

    return () => {
      this.listeners.delete(listener);
      if (this.listeners.size === 0) this.stop();
    };
  };

  send = async (body: string): Promise<boolean> => {
    if (this.snapshot.sending || this.snapshot.connectionState !== "connected")
      return false;

    this.update({ error: null, sending: true });
    try {
      await this.client.sendMessage(this.roomId, body);
      return true;
    } catch (error) {
      this.update({ error: messageFor(error, "Could not send message") });
      return false;
    } finally {
      this.update({ sending: false });
    }
  };

  private start() {
    this.started = true;
    const generation = ++this.generation;
    this.update({ error: null, loading: true });

    this.stopCallbacks = [
      this.client.onConnectionState((connectionState) => {
        if (this.isActive(generation)) this.update({ connectionState });
      }),
      this.client.onError((error) => {
        if (this.isActive(generation)) this.update({ error: error.message });
      }),
      this.client.onRefetchRequired((requestedRoomId) => {
        if (this.isActive(generation) && requestedRoomId === this.roomId) {
          void this.load(generation, "Could not reload chat");
        }
      }),
      this.client.subscribe(this.roomId, (event: RealtimeEvent) => {
        if (this.isActive(generation)) {
          this.update({
            messages: mergeMessages(this.snapshot.messages, [event.payload]),
          });
        }
      }),
    ];

    void this.load(generation, "Could not load chat", true);
  }

  private stop() {
    this.started = false;
    this.generation += 1;
    for (const stop of this.stopCallbacks.splice(0)) stop();
  }

  private isActive(generation: number): boolean {
    return this.started && this.generation === generation;
  }

  private async load(
    generation: number,
    fallback: string,
    finishLoading = false,
  ) {
    try {
      const [room, history] = await Promise.all([
        this.client.getRoom(this.roomId),
        this.client.getMessages(this.roomId, { limit: 50 }),
      ]);
      if (!this.isActive(generation)) return;
      this.update({
        messages: mergeMessages(this.snapshot.messages, history.items),
        room,
      });
    } catch (error) {
      if (this.isActive(generation)) {
        this.update({ error: messageFor(error, fallback) });
      }
    } finally {
      if (finishLoading && this.isActive(generation)) {
        this.update({ loading: false });
      }
    }
  }

  private update(next: Partial<ChatWidgetSnapshot>) {
    this.snapshot = { ...this.snapshot, ...next };
    for (const listener of this.listeners) listener();
  }
}

function subscribeToSystemTheme(listener: () => void): () => void {
  const query = globalThis.matchMedia?.("(prefers-color-scheme: dark)");
  if (!query) return () => undefined;
  query.addEventListener("change", listener);
  return () => query.removeEventListener("change", listener);
}

function getSystemTheme(): "light" | "dark" {
  return globalThis.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function formatTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function ChatWidget({
  className,
  classNames = {},
  client,
  roomId,
  theme = {},
}: ChatWidgetProps) {
  const store = useMemo(
    () => new ChatWidgetStore(client, roomId),
    [client, roomId],
  );
  const snapshot = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot,
  );
  const systemTheme = useSyncExternalStore(
    subscribeToSystemTheme,
    getSystemTheme,
    () => "light",
  );
  const [draft, setDraft] = useState("");
  const resolvedTheme =
    theme.preset === "dark"
      ? "dark"
      : theme.preset === "light"
        ? "light"
        : systemTheme;
  const defaults = resolvedTheme === "dark" ? darkTheme : lightTheme;
  const colors = theme.colors;
  const style = useMemo<ThemeStyle>(
    () => ({
      "--pulse-background": colors?.background ?? defaults.background,
      "--pulse-border": colors?.border ?? defaults.border,
      "--pulse-danger": colors?.danger ?? defaults.danger,
      "--pulse-font":
        theme.fontFamily ??
        'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      "--pulse-muted": colors?.muted ?? defaults.muted,
      "--pulse-primary": colors?.primary ?? defaults.primary,
      "--pulse-primary-foreground": defaults.primaryForeground,
      "--pulse-radius": theme.radius ?? "18px",
      "--pulse-surface": colors?.surface ?? defaults.surface,
      "--pulse-text": colors?.text ?? defaults.text,
      colorScheme: resolvedTheme,
    }),
    [colors, defaults, resolvedTheme, theme.fontFamily, theme.radius],
  );

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const body = draft.trim();
    if (!body) return;
    void store.send(body).then((sent) => {
      if (sent) setDraft("");
    });
  };

  const canSend =
    snapshot.connectionState === "connected" &&
    draft.trim().length > 0 &&
    !snapshot.sending;
  const statusIsPending =
    snapshot.connectionState === "connecting" ||
    snapshot.connectionState === "reconnecting";

  return (
    <section
      className={cn(
        "grid h-[min(680px,80vh)] w-full min-w-[260px] max-w-[440px] grid-rows-[auto_minmax(260px,1fr)_auto_auto] overflow-hidden border border-border bg-background text-foreground shadow-[0_22px_60px_rgb(26_35_52/14%)] [border-radius:var(--pulse-radius)] [font-family:var(--pulse-font)]",
        classNames.root,
        className,
      )}
      data-theme={resolvedTheme}
      part="root"
      style={style}
    >
      <header
        className={cn(
          "flex items-center justify-between gap-4 border-b border-border bg-card px-5 py-4",
          classNames.header,
        )}
        part="header"
      >
        <div className="min-w-0">
          <p className="m-0 text-[10px] font-bold tracking-[0.13em] text-muted-foreground uppercase">
            Live chat
          </p>
          <h2 className="m-0 truncate text-[17px] font-semibold tracking-[-0.02em]">
            {snapshot.room?.name ?? "Chat"}
          </h2>
        </div>
        <Marker
          aria-live="polite"
          className={cn(
            "w-auto shrink-0 rounded-full border border-border bg-muted px-2.5 py-1.5 font-semibold",
            snapshot.connectionState === "connected" && "text-emerald-600",
            classNames.connectionStatus,
          )}
          part="connection-status"
          role="status"
        >
          <MarkerIcon
            className={cn(
              "size-1.5 rounded-full bg-current",
              statusIsPending && "animate-pulse motion-reduce:animate-none",
            )}
          />
          <MarkerContent>{stateLabels[snapshot.connectionState]}</MarkerContent>
        </Marker>
      </header>

      <MessageScrollerProvider defaultScrollPosition="end">
        <MessageScroller
          className={cn("bg-background", classNames.messageList)}
          part="message-list"
        >
          <MessageScrollerViewport aria-label="Chat messages">
            <MessageScrollerContent
              aria-busy={snapshot.loading}
              className="p-4"
              role="log"
            >
              {snapshot.loading && snapshot.messages.length === 0 ? (
                <Marker className="my-auto justify-center" variant="separator">
                  <MarkerContent>Loading conversation…</MarkerContent>
                </Marker>
              ) : snapshot.messages.length === 0 ? (
                <Marker className="my-auto justify-center" variant="separator">
                  <MarkerContent>
                    No messages yet. Start the conversation.
                  </MarkerContent>
                </Marker>
              ) : (
                snapshot.messages.map((message) => (
                  <MessageScrollerItem key={message.id} messageId={message.id}>
                    <Message className={classNames.message} part="message">
                      <MessageAvatar>
                        {initials(message.sender.displayName)}
                      </MessageAvatar>
                      <MessageContent>
                        <MessageHeader>
                          <strong className="min-w-0 truncate font-semibold text-foreground">
                            {message.sender.displayName}
                          </strong>
                          <time
                            className="shrink-0"
                            dateTime={message.createdAt}
                          >
                            {formatTime(message.createdAt)}
                          </time>
                        </MessageHeader>
                        <Bubble variant="secondary">
                          <BubbleContent>{message.body}</BubbleContent>
                        </Bubble>
                      </MessageContent>
                    </Message>
                  </MessageScrollerItem>
                ))
              )}
            </MessageScrollerContent>
          </MessageScrollerViewport>
          <MessageScrollerButton />
        </MessageScroller>
      </MessageScrollerProvider>

      {snapshot.error ? (
        <Marker
          className="border-t border-destructive/25 bg-destructive/10 px-4 py-2 text-destructive"
          part="error"
          role="alert"
        >
          <MarkerContent>{snapshot.error}</MarkerContent>
        </Marker>
      ) : null}

      <form
        className={cn(
          "grid grid-cols-[minmax(0,1fr)_auto] gap-2 border-t border-border bg-card p-3.5",
          classNames.composer,
        )}
        onSubmit={submit}
        part="composer"
      >
        <label className="sr-only" htmlFor={`pulse-message-${roomId}`}>
          Message
        </label>
        <input
          autoComplete="off"
          className={cn(
            "min-h-10 min-w-0 rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-55",
            classNames.input,
          )}
          disabled={
            snapshot.connectionState !== "connected" || snapshot.sending
          }
          id={`pulse-message-${roomId}`}
          maxLength={500}
          onChange={(event) => setDraft(event.target.value)}
          part="input"
          placeholder={
            snapshot.connectionState === "connected"
              ? "Write a message…"
              : "Waiting for connection…"
          }
          type="text"
          value={draft}
        />
        <button
          className={cn(
            "min-h-10 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground outline-none hover:brightness-95 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-55",
            classNames.sendButton,
          )}
          disabled={!canSend}
          part="send-button"
          type="submit"
        >
          {snapshot.sending ? "Sending…" : "Send"}
        </button>
      </form>
    </section>
  );
}
