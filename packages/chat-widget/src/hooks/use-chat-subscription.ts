import type { ConnectionState, Message } from "@pulse/sdk";
import { skipToken, useQuery, useQueryClient } from "@tanstack/react-query";

import { useWidgetQueryKey } from "./use-widget-query-client";
import type { ChatWidgetClient } from "../types";
import { mergeMessages } from "../utils/messages";

interface LiveState {
  connectionState: ConnectionState;
  error: string | null;
}

export function useChatSubscription(client: ChatWidgetClient, roomId: string) {
  const queryClient = useQueryClient();
  const queryKey = useWidgetQueryKey("live", roomId);
  const messagesKey = useWidgetQueryKey("messages", roomId);
  const live = useQuery<LiveState>({
    queryKey,
    queryFn: skipToken,
    initialData: { connectionState: "offline", error: null },
  });

  function attach(element: HTMLDivElement | null) {
    if (!element) return;
    let active = true;
    function update(next: Partial<LiveState>) {
      if (active) {
        queryClient.setQueryData<LiveState>(queryKey, (state) => ({
          connectionState: state?.connectionState ?? "offline",
          error: state?.error ?? null,
          ...next,
        }));
      }
    }
    const stops = [
      client.onConnectionState((connectionState) =>
        update({ connectionState }),
      ),
      client.onError((error) => update({ error: error.message })),
      client.onRefetchRequired((id) => {
        if (active && id === roomId) {
          void queryClient.invalidateQueries({ queryKey: messagesKey });
        }
      }),
      client.subscribe(roomId, (event) => {
        if (active) {
          queryClient.setQueryData<Message[]>(messagesKey, (messages = []) =>
            mergeMessages(messages, [event.payload]),
          );
        }
      }),
    ];
    return () => {
      active = false;
      for (const stop of stops) stop();
    };
  }

  return {
    attach,
    connectionState: live.data?.connectionState ?? "offline",
    error: live.data?.error ?? null,
  };
}
