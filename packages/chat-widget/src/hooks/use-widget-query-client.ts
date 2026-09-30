import { QueryClient } from "@tanstack/react-query";
import { createContext, useContext, useState } from "react";

import type { ChatWidgetClient } from "../types";

export const WidgetQueryScope = createContext(0);

export function useWidgetQueryClient(client: ChatWidgetClient) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { retry: false } },
      }),
  );
  const [scope, setScope] = useState({ client, version: 0 });
  if (scope.client !== client) {
    setScope({ client, version: scope.version + 1 });
  }
  return { queryClient, scope: scope.version };
}

export function useWidgetQueryKey(resource: string, roomId?: string) {
  const scope = useContext(WidgetQueryScope);
  return roomId ? [scope, resource, roomId] : [scope, resource];
}
