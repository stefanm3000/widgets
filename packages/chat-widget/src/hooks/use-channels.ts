import type { Room } from "@pulse/sdk";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { parseAsString, useQueryState } from "nuqs";

import type { ChatWidgetClient } from "../types";
import { useWidgetQueryKey } from "./use-widget-query-client";

export function useChannels(client: ChatWidgetClient, roomId: string) {
  const queryClient = useQueryClient();
  const queryKey = useWidgetQueryKey("channels", roomId);
  const [selectedRoomId, setSelectedRoomId] = useQueryState(
    `pulse-channel:${roomId}`,
    parseAsString.withDefault(roomId).withOptions({ history: "push" }),
  );
  const channels = useQuery({
    queryKey,
    queryFn: async ({ signal }) => {
      const [room, children] = await Promise.all([
        client.getRoom(roomId),
        client.getChannels(roomId),
      ]);
      signal.throwIfAborted();
      return [room, ...children];
    },
  });
  const mutationKey = useWidgetQueryKey("create-channel", roomId);
  const createChannel = useMutation({
    mutationKey,
    mutationFn: (name: string) => client.createChannel(roomId, name),
    onSuccess: async (channel) => {
      await queryClient.cancelQueries({ queryKey });
      queryClient.setQueryData<Room[]>(queryKey, (rooms = []) => [
        ...rooms.filter((room) => room.id !== channel.id),
        channel,
      ]);
      await setSelectedRoomId(channel.id);
    },
  });

  return {
    activeRoomId: channels.data?.some((room) => room.id === selectedRoomId)
      ? selectedRoomId
      : roomId,
    channels,
    createChannel,
    selectChannel: (id: string) => {
      if (channels.data?.some((room) => room.id === id)) {
        void setSelectedRoomId(id);
      }
    },
  };
}
