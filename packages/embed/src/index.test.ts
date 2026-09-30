import { act, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  mountPulseChat,
  type ChatWidgetClient,
  type PulseChatElement,
} from "./index";

const room = {
  createdAt: "2026-01-01T00:00:00.000Z",
  description: null,
  id: "demo-room",
  name: "Live chat demo",
};

const message = {
  body: "Welcome through the custom element.",
  clientMessageId: "ea81cc51-bf45-4802-8ca8-9df196821694",
  createdAt: "2026-01-01T00:00:01.000Z",
  id: "017e106e-e16b-4af7-be34-bcdedd50d1a1",
  roomId: room.id,
  sender: {
    displayName: "Pulse Demo",
    id: "7bb92b54-0593-471e-819a-f85ab7089279",
    source: "system",
  },
} as const;

function createClient() {
  const unsubscribe = vi.fn();
  const stopConnectionState = vi.fn();
  const stopError = vi.fn();
  const stopRefetch = vi.fn();

  const client = {
    getChannels: vi.fn(async () => []),
    createChannel: vi.fn(async () => ({
      ...room,
      id: "new-channel",
      name: "New channel",
    })),
    getCurrentUser: vi.fn(async () => null),
    getMessages: vi.fn(async () => ({ items: [message], nextCursor: null })),
    getRoom: vi.fn(async () => room),
    onConnectionState(listener) {
      listener("connected");
      return stopConnectionState;
    },
    onError: () => stopError,
    onRefetchRequired: () => stopRefetch,
    sendMessage: vi.fn(async () => message),
    subscribe: vi.fn(() => unsubscribe),
  } satisfies ChatWidgetClient;

  return {
    client,
    stopConnectionState,
    stopError,
    stopRefetch,
    unsubscribe,
  };
}

afterEach(() => {
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

describe("pulse-chat", () => {
  it("mounts in Shadow DOM, updates without reconnecting, and remounts cleanly", async () => {
    const fixture = createClient();
    let handle: ReturnType<typeof mountPulseChat>;

    await act(async () => {
      handle = mountPulseChat(document.body, {
        client: fixture.client,
        roomId: room.id,
        theme: { preset: "light" },
      });
    });

    const element = document.querySelector("pulse-chat") as PulseChatElement;
    expect(element).toBe(handle!.element);
    expect(element.shadowRoot?.querySelector("style")?.textContent).toContain(
      ":host{display:block",
    );

    await waitFor(() => {
      expect(element.shadowRoot?.textContent).toContain(message.body);
    });
    expect(fixture.client.subscribe).toHaveBeenCalledOnce();

    await act(async () => {
      handle!.update({ theme: { preset: "dark" } });
    });

    await waitFor(() => {
      const widget =
        element.shadowRoot?.querySelector<HTMLElement>('[part="root"]');
      expect(widget?.getAttribute("data-theme")).toBe("dark");
    });
    expect(fixture.client.subscribe).toHaveBeenCalledOnce();

    await act(async () => {
      handle!.destroy();
    });
    expect(fixture.unsubscribe).toHaveBeenCalledOnce();
    expect(fixture.stopConnectionState).toHaveBeenCalledOnce();
    expect(fixture.stopError).toHaveBeenCalledOnce();
    expect(fixture.stopRefetch).toHaveBeenCalledOnce();

    await act(async () => {
      document.body.append(element);
    });
    await waitFor(() => {
      expect(fixture.client.subscribe).toHaveBeenCalledTimes(2);
      expect(element.shadowRoot?.textContent).toContain(message.body);
    });
  });
});
