import type { MemoryChatStore } from "../store.js";
import type { TokenService } from "../token.js";

export interface RealtimeOptions {
  allowedOrigins: string[];
  store: MemoryChatStore;
  tokenService: TokenService;
}
