import type { Message } from "@pulse/sdk";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { startTransition, useOptimistic } from "react";

import type { ChatWidgetClient, OptimisticMessage } from "../types";
import { mergeMessages } from "../utils/messages";
import { useWidgetQueryKey } from "./use-widget-query-client";
import { useChatSubscription } from "./use-chat-subscription";
import { useSendMessage, type PendingSend } from "./use-send-message";

export function useChatConversation(client: ChatWidgetClient, roomId: string) {
  const queryClient = useQueryClient();
  const queryKey = useWidgetQueryKey("messages", roomId);
  const live = useChatSubscription(client, roomId);
  const roomKey = useWidgetQueryKey("room", roomId);
  const userKey = useWidgetQueryKey("current-user");
  const room = useQuery({
    queryKey: roomKey,
    queryFn: () => client.getRoom(roomId),
  });
  const currentUser = useQuery({
    queryKey: userKey,
    queryFn: () => client.getCurrentUser(),
    staleTime: Infinity,
  });
  const history = useQuery({
    queryKey,
    queryFn: async ({ signal }) => {
      const history = await client.getMessages(roomId, { limit: 50 });
      signal.throwIfAborted();
      return mergeMessages(
        queryClient.getQueryData<Message[]>(queryKey) ?? [],
        history.items,
      );
    },
  });
  const [messages, addPendingMessage] = useOptimistic<
    OptimisticMessage[],
    PendingSend
  >(history.data ?? [], (messages, pending) => {
    const message = pending.message;
    if (
      pending.queryKey[0] !== queryKey[0] ||
      message.roomId !== roomId ||
      messages.some((item) => item.clientMessageId === message.clientMessageId)
    ) {
      return messages;
    }
    return mergeMessages(messages, [message]);
  });
  const sendMessage = useSendMessage(roomId);

  function send(body: string): Promise<boolean> {
    if (live.connectionState !== "connected") return Promise.resolve(false);
    const clientMessageId = globalThis.crypto.randomUUID();
    const message: OptimisticMessage = {
      body,
      clientMessageId,
      createdAt: new Date().toISOString(),
      id: `optimistic:${clientMessageId}`,
      optimistic: true,
      roomId,
      sender: currentUser.data ?? {
        displayName: "You",
        id: `optimistic:${clientMessageId}`,
        source: "system",
      },
    };
    const pending = { message, client, queryKey, userKey };
    return new Promise((resolve) => {
      startTransition(async () => {
        addPendingMessage(pending);
        try {
          await sendMessage.mutateAsync(pending);
          resolve(true);
        } catch {
          resolve(false);
        }
      });
    });
  }

  return {
    attach: live.attach,
    connectionState: live.connectionState,
    currentUserId: currentUser.data?.id ?? null,
    error:
      (sendMessage.variables?.queryKey[0] === queryKey[0] &&
      sendMessage.variables?.message.roomId === roomId
        ? sendMessage.error?.message
        : null) ??
      history.error?.message ??
      room.error?.message ??
      currentUser.error?.message ??
      live.error,
    loading: history.isPending,
    messages,
    roomName: room.data?.name,
    send,
  };
}
