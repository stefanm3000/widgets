import type { Message } from "@pulse/sdk";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { ChatWidgetClient, OptimisticMessage } from "../types";
import { mergeMessages } from "../utils/messages";
import { useWidgetQueryKey } from "./use-widget-query-client";

export interface PendingSend {
  client: ChatWidgetClient;
  message: OptimisticMessage;
  queryKey: (string | number)[];
  userKey: (string | number)[];
}

export function useSendMessage(roomId: string) {
  const queryClient = useQueryClient();
  const mutationKey = useWidgetQueryKey("send-message", roomId);
  return useMutation({
    mutationKey,
    mutationFn: ({ client, message }: PendingSend) =>
      client.sendMessage(
        message.roomId,
        message.body,
        message.clientMessageId as ReturnType<Crypto["randomUUID"]>,
      ),
    onSuccess: (message, pending) => {
      queryClient.setQueryData<Message[]>(pending.queryKey, (messages = []) =>
        mergeMessages(messages, [message]),
      );
      queryClient.setQueryData(pending.userKey, message.sender);
    },
  });
}
