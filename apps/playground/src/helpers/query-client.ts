import { QueryClient } from "@tanstack/react-query";

export const demoQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 15 * 60 * 1000,
      retry: false,
    },
  },
});
