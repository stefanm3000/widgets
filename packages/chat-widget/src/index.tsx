import type {
  ConnectionState,
  Message,
  PulseClient,
  RealtimeEvent,
  Room,
} from "@pulse/sdk";
import {
  type CSSProperties,
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

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

type ThemeStyle = CSSProperties &
  Record<`--pulse-${string}`, string | undefined>;

const stateLabels: Record<ConnectionState, string> = {
  connected: "Connected",
  connecting: "Connecting",
  offline: "Offline",
  reconnecting: "Reconnecting",
};

function classes(...values: Array<string | undefined | false>): string {
  return values.filter(Boolean).join(" ");
}

function mergeMessages(current: Message[], incoming: Message[]): Message[] {
  const messages = new Map(current.map((message) => [message.id, message]));
  for (const message of incoming) messages.set(message.id, message);
  return [...messages.values()].sort(
    (left, right) =>
      left.createdAt.localeCompare(right.createdAt) ||
      left.id.localeCompare(right.id),
  );
}

function formatTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function useResolvedTheme(preset: ChatWidgetTheme["preset"]): "light" | "dark" {
  const getSystemTheme = () =>
    globalThis.matchMedia?.("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  const [systemTheme, setSystemTheme] = useState<"light" | "dark">(
    getSystemTheme,
  );

  useEffect(() => {
    if (preset !== "system") return;
    const query = globalThis.matchMedia?.("(prefers-color-scheme: dark)");
    if (!query) return;
    const update = () => setSystemTheme(query.matches ? "dark" : "light");
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, [preset]);

  if (preset === "dark") return "dark";
  if (preset === "light") return "light";
  return systemTheme;
}

export function ChatWidget({
  className,
  classNames = {},
  client,
  roomId,
  theme = {},
}: ChatWidgetProps) {
  const [room, setRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [connectionState, setConnectionState] =
    useState<ConnectionState>("offline");
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messageListRef = useRef<HTMLDivElement>(null);
  const resolvedTheme = useResolvedTheme(theme.preset ?? "system");

  const loadRoom = useCallback(async () => {
    const [nextRoom, history] = await Promise.all([
      client.getRoom(roomId),
      client.getMessages(roomId, { limit: 50 }),
    ]);
    setRoom(nextRoom);
    setMessages((current) => mergeMessages(current, history.items));
  }, [client, roomId]);

  useEffect(() => {
    let active = true;
    setRoom(null);
    setMessages([]);
    setLoading(true);
    setError(null);

    const stopState = client.onConnectionState(setConnectionState);
    const stopErrors = client.onError((nextError) => {
      if (active) setError(nextError.message);
    });
    const stopRefetch = client.onRefetchRequired((requestedRoomId) => {
      if (active && requestedRoomId === roomId) {
        void loadRoom().catch((nextError: unknown) => {
          if (active)
            setError(
              nextError instanceof Error
                ? nextError.message
                : "Could not reload chat",
            );
        });
      }
    });
    const stopSubscription = client.subscribe(
      roomId,
      (event: RealtimeEvent) => {
        if (active)
          setMessages((current) => mergeMessages(current, [event.payload]));
      },
    );

    void loadRoom()
      .catch((nextError: unknown) => {
        if (active)
          setError(
            nextError instanceof Error
              ? nextError.message
              : "Could not load chat",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      stopSubscription();
      stopRefetch();
      stopErrors();
      stopState();
    };
  }, [client, loadRoom, roomId]);

  useEffect(() => {
    const list = messageListRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [messages]);

  const style = useMemo<ThemeStyle>(
    () => ({
      "--pulse-background": theme.colors?.background,
      "--pulse-border": theme.colors?.border,
      "--pulse-danger": theme.colors?.danger,
      "--pulse-font": theme.fontFamily,
      "--pulse-muted": theme.colors?.muted,
      "--pulse-primary": theme.colors?.primary,
      "--pulse-radius": theme.radius,
      "--pulse-surface": theme.colors?.surface,
      "--pulse-text": theme.colors?.text,
    }),
    [theme],
  );

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const body = draft.trim();
    if (!body || sending || connectionState !== "connected") return;

    setSending(true);
    setError(null);
    try {
      await client.sendMessage(roomId, body);
      setDraft("");
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Could not send message",
      );
    } finally {
      setSending(false);
    }
  };

  const canSend =
    connectionState === "connected" && draft.trim().length > 0 && !sending;

  return (
    <section
      className={classes(
        "pulse-widget",
        `pulse-theme-${resolvedTheme}`,
        classNames.root,
        className,
      )}
      part="root"
      style={style}
    >
      <header
        className={classes("pulse-header", classNames.header)}
        part="header"
      >
        <div>
          <p className="pulse-eyebrow">Live chat</p>
          <h2>{room?.name ?? "Chat"}</h2>
        </div>
        <div
          aria-live="polite"
          className={classes(
            "pulse-status",
            `pulse-status-${connectionState}`,
            classNames.connectionStatus,
          )}
          part="connection-status"
          role="status"
        >
          <span aria-hidden="true" className="pulse-status-dot" />
          {stateLabels[connectionState]}
        </div>
      </header>

      <div
        aria-busy={loading}
        aria-label="Chat messages"
        className={classes("pulse-messages", classNames.messageList)}
        part="message-list"
        ref={messageListRef}
        role="log"
      >
        {loading && messages.length === 0 ? (
          <p className="pulse-empty">Loading conversation…</p>
        ) : messages.length === 0 ? (
          <p className="pulse-empty">
            No messages yet. Start the conversation.
          </p>
        ) : (
          messages.map((message) => (
            <article
              className={classes("pulse-message", classNames.message)}
              key={message.id}
              part="message"
            >
              <div className="pulse-message-meta">
                <strong>{message.sender.displayName}</strong>
                <time dateTime={message.createdAt}>
                  {formatTime(message.createdAt)}
                </time>
              </div>
              <p>{message.body}</p>
            </article>
          ))
        )}
      </div>

      {error ? (
        <p className="pulse-error" part="error" role="alert">
          {error}
        </p>
      ) : null}

      <form
        className={classes("pulse-composer", classNames.composer)}
        onSubmit={submit}
        part="composer"
      >
        <label className="pulse-sr-only" htmlFor={`pulse-message-${roomId}`}>
          Message
        </label>
        <input
          autoComplete="off"
          className={classes("pulse-input", classNames.input)}
          disabled={connectionState !== "connected" || sending}
          id={`pulse-message-${roomId}`}
          maxLength={500}
          onChange={(event) => setDraft(event.target.value)}
          part="input"
          placeholder={
            connectionState === "connected"
              ? "Write a message…"
              : "Waiting for connection…"
          }
          type="text"
          value={draft}
        />
        <button
          className={classes("pulse-send", classNames.sendButton)}
          disabled={!canSend}
          part="send-button"
          type="submit"
        >
          {sending ? "Sending…" : "Send"}
        </button>
      </form>
    </section>
  );
}
