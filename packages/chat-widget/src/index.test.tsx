import type { ConnectionState, Message, RealtimeEvent, Room } from "@pulse/sdk";
import {
  act,
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
  vi.restoreAllMocks();
});

beforeEach(() => {
  Object.defineProperty(HTMLElement.prototype, "scrollTo", {
    configurable: true,
    value: vi.fn(),
  });
});

describe("ChatWidget", () => {
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
    expect(getMessageBody(sentMessage.body)).toBeDefined();
    expect(screen.getByText("Sending…")).toBeDefined();
    await waitFor(() => expect(scrollTo).toHaveBeenCalled());

    await act(async () => finishSend?.());

    await waitFor(() => {
      expect(screen.queryByText("Sending…")).toBeNull();
      expect(
        screen
          .getAllByText(sentMessage.body)
          .filter(
            (element) => element.getAttribute("data-slot") === "bubble-content",
          ),
      ).toHaveLength(1);
    });
  });
});
