import type { ConnectionState, Message, RealtimeEvent, Room } from "@pulse/sdk";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { createElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

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
    displayName: "Widget visitor",
  },
  body: "Hello from the widget",
  createdAt: "2026-01-01T00:00:02.000Z",
};

function createClient() {
  let eventListener: ((event: RealtimeEvent) => void) | undefined;
  let stateListener: ((state: ConnectionState) => void) | undefined;
  const unsubscribe = vi.fn();
  const stopState = vi.fn();
  const sendMessage = vi.fn(async () => sentMessage);

  const client: ChatWidgetClient = {
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

describe("ChatWidget", () => {
  it("loads history, sends only while connected, and cleans up", async () => {
    const fixture = createClient();
    const view = render(
      createElement(ChatWidget, {
        client: fixture.client,
        roomId: room.id,
        theme: { preset: "light" },
      }),
    );

    expect(await screen.findByText(message.body)).toBeDefined();
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
      );
    });

    const ownMessage = await screen.findByText(sentMessage.body);
    const ownMessageRow = ownMessage.closest('[data-slot="message"]');
    const ownBubble = ownMessage.closest('[data-slot="bubble"]');
    expect(ownMessageRow?.getAttribute("data-align")).toBe("end");
    expect(ownBubble?.getAttribute("data-variant")).toBe("default");
    expect(screen.getByText("You")).toBeDefined();

    const receivedMessage = screen.getByText(message.body);
    expect(
      receivedMessage
        .closest('[data-slot="message"]')
        ?.getAttribute("data-align"),
    ).toBe("start");

    const liveMessage = {
      ...message,
      id: "70831012-904f-4098-a080-f76e89392cdb",
      body: "Live",
    };
    act(() =>
      fixture.emitEvent({
        eventId: "3",
        roomId: room.id,
        type: "message.created",
        payload: liveMessage,
      }),
    );
    expect(screen.getByText("Live")).toBeDefined();

    view.unmount();
    expect(fixture.unsubscribe).toHaveBeenCalledOnce();
    expect(fixture.stopState).toHaveBeenCalledOnce();
  });
});
