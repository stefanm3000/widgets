import type { ChatStore } from "../store.js";
import type { TokenService } from "../token.js";

export interface RealtimeOptions {
  allowedOrigins: string[];
  store: ChatStore;
  tokenService: TokenService;
}
