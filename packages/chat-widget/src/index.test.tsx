import type { ConnectionState, Message, RealtimeEvent, Room } from "@pulse/sdk";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ChatWidget, type ChatWidgetClient } from "./index";

const room: Room = {
  id: "demo-room",
  name: "Live chat demo",
  description: null,
  createdAt: "2026-01-01T00:00:00.000Z",
};

const message: Message = {
  id: "017e106e-e16b-4af7-be34-bcdedd50d1a1",
  clientMessageId: "ea81cc51-bf45-4802-8ca8-9df196821694",
  roomId: room.id,
  sender: {
    id: "7bb92b54-0593-471e-819a-f85ab7089279",
    displayName: "Pulse Demo",
    source: "system",
  },
  body: "Welcome to the live chat demo.",
  createdAt: "2026-01-01T00:00:01.000Z",
};

const sentMessage: Message = {
  ...message,
  id: "1b20342a-c712-4e07-9dc2-e9bb56199ad3",
  clientMessageId: "c95edff5-5ec0-453f-a871-495414adb80e",
  sender: {
    id: "da09b773-5ad2-4d24-8fb5-0dbeb67f5b29",
    displayName: "Charismatic Lizard",
    source: "playground",
  },
  body: "Hello from the widget",
  createdAt: "2026-01-01T00:00:02.000Z",
};

function getMessageBody(body: string): HTMLElement {
  const element = screen
    .getAllByText(body)
    .find((match) => match.getAttribute("data-slot") === "bubble-content");

  if (!element) throw new Error(`Could not find message body: ${body}`);
  return element;
}

function createClient() {
  let eventListener: ((event: RealtimeEvent) => void) | undefined;
  let stateListener: ((state: ConnectionState) => void) | undefined;
  const unsubscribe = vi.fn();
  const stopState = vi.fn();
  const sendMessage = vi.fn(
    async (
      _roomId: string,
      _body: string,
      clientMessageId?: ReturnType<Crypto["randomUUID"]>,
    ) => ({
      ...sentMessage,
      clientMessageId: clientMessageId ?? sentMessage.clientMessageId,
    }),
  );

  const client: ChatWidgetClient = {
    getChannels: vi.fn(async () => []),
    createChannel: vi.fn(async () => ({
      ...room,
      id: "new-channel",
      name: "New channel",
    })),
    getCurrentUser: vi.fn(async () => sentMessage.sender),
    getMessages: vi.fn(async () => ({ items: [message], nextCursor: null })),
    getRoom: vi.fn(async () => room),
    onConnectionState(listener) {
      stateListener = listener;
      listener("offline");
      return stopState;
    },
    onError: () => vi.fn(),
    onRefetchRequired: () => vi.fn(),
    sendMessage,
    subscribe(_roomId, listener) {
      eventListener = listener;
      return unsubscribe;
    },
  };

  return {
    client,
    emitEvent: (event: RealtimeEvent) => eventListener?.(event),
    sendMessage,
    setState: (state: ConnectionState) => stateListener?.(state),
    stopState,
    unsubscribe,
  };
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

beforeEach(() => {
  Object.defineProperty(HTMLElement.prototype, "scrollTo", {
    configurable: true,
    value: vi.fn(),
  });
});

describe("ChatWidget", () => {
  it("creates and switches channels, collapses the sidebar, and isolates late history", async () => {
    const fixture = createClient();
    const channel = { ...room, id: "design", name: "Design" };
    vi.mocked(fixture.client.createChannel).mockResolvedValue(channel);
    vi.mocked(fixture.client.getRoom).mockImplementation(async (id) =>
      id === channel.id ? channel : room,
    );
    let resolveHistory:
      ((value: { items: Message[]; nextCursor: null }) => void) | undefined;
    vi.mocked(fixture.client.getMessages).mockImplementation(async (id) =>
      id === channel.id
        ? { items: [], nextCursor: null }
        : new Promise((resolve) => {
            resolveHistory = resolve;
          }),
    );
    render(
      createElement(ChatWidget, { client: fixture.client, roomId: room.id }),
    );
    await screen.findByRole("button", { name: room.name });
    fireEvent.click(screen.getByRole("button", { name: "New channel" }));
    fireEvent.change(screen.getByLabelText("Channel name"), {
      target: { value: "Design" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create channel" }));
    await screen.findByRole("heading", { name: "Design" });
    expect(fixture.client.createChannel).toHaveBeenCalledWith(
      room.id,
      "Design",
    );
    expect(fixture.unsubscribe).toHaveBeenCalledOnce();
    await act(async () =>
      resolveHistory?.({ items: [message], nextCursor: null }),
    );
    expect(screen.queryByText(message.body)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Collapse channels" }));
    expect(
      screen
        .getByRole("button", { name: "Expand channels" })
        .getAttribute("aria-expanded"),
    ).toBe("false");
    expect(
      screen
        .getByRole("button", { name: "Design" })
        .getAttribute("aria-current"),
    ).toBe("page");
    vi.mocked(fixture.client.getMessages).mockResolvedValue({
      items: [message],
      nextCursor: null,
    });
    fireEvent.click(screen.getByRole("button", { name: room.name }));
    await screen.findByText(message.body);
    expect(fixture.unsubscribe).toHaveBeenCalledTimes(2);
  });

  it("keeps a failed channel name for retry without leaving the current conversation", async () => {
    const fixture = createClient();
    vi.mocked(fixture.client.createChannel).mockRejectedValueOnce(
      new Error("Could not create channel"),
    );
    render(
      createElement(ChatWidget, { client: fixture.client, roomId: room.id }),
    );
    await screen.findByText(message.body);
    fireEvent.click(screen.getByRole("button", { name: "New channel" }));
    fireEvent.change(screen.getByLabelText("Channel name"), {
      target: { value: "Design" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create channel" }));
    await screen.findByRole("alert");
    expect(
      (screen.getByLabelText("Channel name") as HTMLInputElement).value,
    ).toBe("Design");
    expect(screen.getByRole("heading", { name: room.name })).toBeDefined();
    expect(fixture.unsubscribe).not.toHaveBeenCalled();
  });

  it("marks messages from the current user on the first load", async () => {
    const fixture = createClient();
    vi.mocked(fixture.client.getMessages).mockResolvedValueOnce({
      items: [sentMessage],
      nextCursor: null,
    });

    const view = render(
      createElement(ChatWidget, {
        client: fixture.client,
        roomId: room.id,
      }),
    );

    await screen.findByText(sentMessage.body);
    const ownMessage = getMessageBody(sentMessage.body);
    await waitFor(() => {
      expect(
        ownMessage.closest('[data-slot="message"]')?.getAttribute("data-align"),
      ).toBe("end");
    });
    expect(
      ownMessage.closest('[data-slot="bubble"]')?.getAttribute("data-variant"),
    ).toBe("default");
    expect(screen.getByText("Charismatic Lizard (you)")).toBeDefined();
    expect(fixture.sendMessage).not.toHaveBeenCalled();
    view.unmount();
  });

  it("loads history, sends only while connected, and cleans up", async () => {
    const fixture = createClient();
    const view = render(
      createElement(ChatWidget, {
        classNames: { messageOutline: "custom-outline" },
        client: fixture.client,
        roomId: room.id,
        theme: { preset: "light" },
      }),
    );

    expect(await screen.findByText(message.body)).toBeDefined();
    expect(
      document
        .querySelector('[data-slot="message-scroller-viewport"]')
        ?.classList.contains("scroll-fade-y"),
    ).toBe(true);
    expect(
      document
        .querySelector('[data-slot="message-scroller-viewport"]')
        ?.classList.contains("scrollbar-none"),
    ).toBe(true);
    expect(
      document
        .querySelector('[data-slot="message-scroller-viewport"]')
        ?.classList.contains(["scroll", "smooth"].join("-")),
    ).toBe(false);
    const input = screen.getByLabelText("Message") as HTMLInputElement;
    const button = screen.getByRole("button", {
      name: "Send",
    }) as HTMLButtonElement;
    expect(input.disabled).toBe(true);
    expect(button.disabled).toBe(true);

    act(() => fixture.setState("connected"));
    fireEvent.change(input, { target: { value: "Hello from the widget" } });
    expect(button.disabled).toBe(false);
    fireEvent.click(button);

    await waitFor(() => {
      expect(fixture.sendMessage).toHaveBeenCalledWith(
        room.id,
        "Hello from the widget",
        expect.any(String),
      );
    });

    await screen.findAllByText(sentMessage.body);
    const ownMessage = getMessageBody(sentMessage.body);
    const ownMessageRow = ownMessage.closest('[data-slot="message"]');
    const ownBubble = ownMessage.closest('[data-slot="bubble"]');
    expect(ownMessageRow?.getAttribute("data-align")).toBe("end");
    expect(ownBubble?.getAttribute("data-source")).toBe("playground");
    expect(ownBubble?.getAttribute("data-variant")).toBe("default");
    expect(ownBubble?.className).toContain("border-[#c2410c]");
    expect(screen.getByText("Charismatic Lizard (you)")).toBeDefined();
    expect(screen.getByText("Playground")).toBeDefined();

    const outline = document.querySelector('[part="message-outline"]');
    expect(outline?.classList.contains("custom-outline")).toBe(true);
    expect(outline?.classList.contains("top-[calc(50%-0.5rem)]")).toBe(true);
    expect(outline?.classList.contains("invisible")).toBe(true);
    expect(
      outline?.classList.contains("group-hover/message-scroller:visible"),
    ).toBe(true);
    expect(outline?.querySelectorAll("button")).toHaveLength(2);
    expect(
      outline
        ?.querySelector("button[aria-current='location']")
        ?.textContent?.includes(sentMessage.body),
    ).toBe(true);

    const receivedMessage = getMessageBody(message.body);
    expect(
      receivedMessage
        .closest('[data-slot="message"]')
        ?.getAttribute("data-align"),
    ).toBe("start");
    expect(
      receivedMessage
        .closest('[data-slot="bubble"]')
        ?.getAttribute("data-source"),
    ).toBe("system");

    const liveMessage = {
      ...message,
      clientMessageId: "3ed94d98-d009-4d8f-bf31-aad58cee38fe",
      id: "70831012-904f-4098-a080-f76e89392cdb",
      body: "Live",
      sender: {
        ...message.sender,
        source: "vue" as const,
      },
    };
    act(() =>
      fixture.emitEvent({
        eventId: "3",
        roomId: room.id,
        type: "message.created",
        payload: liveMessage,
      }),
    );
    const liveBubble = getMessageBody("Live").closest('[data-slot="bubble"]');
    expect(liveBubble?.getAttribute("data-source")).toBe("vue");
    expect(liveBubble?.getAttribute("data-variant")).toBe("secondary");
    expect(liveBubble?.className).toContain("border-[#168447]");

    view.unmount();
    expect(fixture.unsubscribe).toHaveBeenCalledOnce();
    expect(fixture.stopState).toHaveBeenCalledOnce();
  });

  it("keeps a growing conversation outline within its marker limit", async () => {
    const fixture = createClient();
    const initialMessages = Array.from({ length: 50 }, (_, index) => ({
      ...message,
      body: `History message ${index + 1}`,
      clientMessageId: `history-client-${index + 1}`,
      id: `history-${index + 1}`,
    }));
    vi.mocked(fixture.client.getMessages).mockResolvedValueOnce({
      items: initialMessages,
      nextCursor: null,
    });

    render(
      createElement(ChatWidget, {
        client: fixture.client,
        roomId: room.id,
      }),
    );

    await waitFor(() =>
      expect(getMessageBody("History message 50")).toBeDefined(),
    );
    const outline = document.querySelector('[part="message-outline"]');
    expect(
      outline?.querySelectorAll('[data-slot="message-outline-marker"]'),
    ).toHaveLength(40);
    expect(outline?.querySelectorAll("button")).toHaveLength(50);

    act(() =>
      fixture.emitEvent({
        eventId: "51",
        roomId: room.id,
        type: "message.created",
        payload: {
          ...message,
          body: "Newest live message",
          clientMessageId: "newest-live-client",
          id: "newest-live",
        },
      }),
    );

    expect(getMessageBody("Newest live message")).toBeDefined();
    expect(
      outline?.querySelectorAll('[data-slot="message-outline-marker"]'),
    ).toHaveLength(40);
    expect(outline?.querySelectorAll("button")).toHaveLength(51);
  });

  it("keeps the composer focused and scrolls to an optimistic message", async () => {
    const fixture = createClient();
    let finishSend: (() => void) | undefined;

    fixture.sendMessage.mockImplementationOnce(
      async (_roomId, _body, clientMessageId) =>
        new Promise((resolve) => {
          finishSend = () =>
            resolve({
              ...sentMessage,
              clientMessageId: clientMessageId ?? sentMessage.clientMessageId,
            });
        }),
    );

    render(
      createElement(ChatWidget, {
        client: fixture.client,
        roomId: room.id,
      }),
    );

    expect(await screen.findByText(message.body)).toBeDefined();
    act(() => fixture.setState("connected"));

    const viewport = document.querySelector<HTMLElement>(
      '[data-slot="message-scroller-viewport"]',
    );
    if (!viewport) throw new Error("Could not find the message viewport");

    Object.defineProperty(viewport, "clientHeight", {
      configurable: true,
      value: 100,
    });
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
      function (this: HTMLElement) {
        const top =
          this.getAttribute("data-message-id")?.startsWith("optimistic:") ===
          true
            ? 500
            : 0;
        const height = this === viewport ? 100 : 40;

        return {
          bottom: top + height,
          height,
          left: 0,
          right: 100,
          toJSON: () => ({}),
          top,
          width: 100,
          x: 0,
          y: top,
        };
      },
    );

    fireEvent.wheel(viewport);
    fireEvent.scroll(viewport, { target: { scrollTop: 12 } });
    const scrollTo = vi.mocked(HTMLElement.prototype.scrollTo);
    scrollTo.mockClear();

    const input = screen.getByLabelText("Message") as HTMLInputElement;
    const button = screen.getByRole("button", { name: "Send" });
    input.focus();
    fireEvent.change(input, { target: { value: sentMessage.body } });
    fireEvent.click(button);

    expect(input.value).toBe("");
    expect(document.activeElement).toBe(input);
    const pendingMessage = getMessageBody(sentMessage.body).closest(
      '[data-slot="message"]',
    );
    expect(pendingMessage?.className).toContain("opacity-50");
    expect(pendingMessage?.getAttribute("aria-busy")).toBe("true");
    expect(screen.queryByText("Sending…")).toBeNull();
    expect(screen.getByText("Charismatic Lizard (you)")).toBeDefined();
    expect(screen.getByText("Playground")).toBeDefined();
    await waitFor(() => expect(scrollTo).toHaveBeenCalled());

    await act(async () => finishSend?.());

    await waitFor(() => {
      expect(
        screen
          .getAllByText(sentMessage.body)
          .filter(
            (element) => element.getAttribute("data-slot") === "bubble-content",
          ),
      ).toHaveLength(1);
    });
    const confirmedMessage = getMessageBody(sentMessage.body).closest(
      '[data-slot="message"]',
    );
    expect(confirmedMessage).toBe(pendingMessage);
    expect(confirmedMessage?.className).toContain("opacity-100");
    expect(confirmedMessage?.className).not.toContain("opacity-50");
    expect(confirmedMessage?.getAttribute("aria-busy")).toBeNull();
  });

  it("submits more messages while earlier sends are still pending", async () => {
    const fixture = createClient();
    const finishSend = new Map<string, () => void>();
    const messageIds = {
      First: "28d7a5f9-339d-4b49-aabc-dd1d6e1222a1",
      Second: "a5c5810a-211d-4ad8-963a-242d216e77f2",
    } as const;

    fixture.sendMessage.mockImplementation(
      async (_roomId, body, clientMessageId) =>
        new Promise((resolve) => {
          finishSend.set(body, () =>
            resolve({
              ...sentMessage,
              body,
              clientMessageId: clientMessageId ?? sentMessage.clientMessageId,
              id: messageIds[body as keyof typeof messageIds],
            }),
          );
        }),
    );

    render(
      createElement(ChatWidget, {
        client: fixture.client,
        roomId: room.id,
      }),
    );

    expect(await screen.findByText(message.body)).toBeDefined();
    act(() => fixture.setState("connected"));

    const input = screen.getByLabelText("Message") as HTMLInputElement;
    const button = screen.getByRole("button", { name: "Send" });
    const form = input.closest("form");
    if (!form) throw new Error("Could not find the message form");

    fireEvent.change(input, { target: { value: "First" } });
    fireEvent.submit(form);
    expect(getMessageBody("First")).toBeDefined();

    fireEvent.change(input, { target: { value: "Second" } });
    expect(button.getAttribute("disabled")).toBeNull();
    fireEvent.submit(form);

    expect(input.value).toBe("");
    expect(document.activeElement).toBe(input);
    expect(fixture.sendMessage).toHaveBeenCalledTimes(2);
    expect(
      getMessageBody("First").closest('[data-slot="message"]')?.className,
    ).toContain("opacity-50");
    expect(
      getMessageBody("Second").closest('[data-slot="message"]')?.className,
    ).toContain("opacity-50");

    await act(async () => finishSend.get("Second")?.());

    await waitFor(() => {
      expect(
        getMessageBody("Second").closest('[data-slot="message"]')?.className,
      ).toContain("opacity-100");
    });
    expect(
      getMessageBody("First").closest('[data-slot="message"]')?.className,
    ).toContain("opacity-50");

    await act(async () => finishSend.get("First")?.());

    await waitFor(() => {
      expect(
        getMessageBody("First").closest('[data-slot="message"]')?.className,
      ).toContain("opacity-100");
    });
    expect(fixture.sendMessage).toHaveBeenNthCalledWith(
      1,
      room.id,
      "First",
      expect.any(String),
    );
    expect(fixture.sendMessage).toHaveBeenNthCalledWith(
      2,
      room.id,
      "Second",
      expect.any(String),
    );
  });
});
