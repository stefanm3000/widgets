import {
  demoTokenRequestSchema,
  demoTokenResponseSchema,
} from "@pulse/protocol";
import type { FastifyInstance } from "fastify";

import { sendApiError } from "../helpers/http.js";
import type { TokenService } from "../token.js";

export function registerAuthRoutes(
  app: FastifyInstance,
  tokenService: TokenService,
): void {
  app.post(
    "/auth/demo-token",
    { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } },
    async (request, reply) => {
      const parsed = demoTokenRequestSchema.safeParse(request.body);
      if (!parsed.success) {
        return sendApiError(
          reply,
          400,
          "invalid_request",
          "A valid demo source and session ID are required",
        );
      }

      const { identity, token } = await tokenService.issue(
        parsed.data.source,
        parsed.data.sessionId,
        ["demo-room"],
      );
      return reply.send(
        demoTokenResponseSchema.parse({
          accessToken: token,
          expiresAt: identity.expiresAt,
          user: identity.user,
          rooms: identity.rooms,
        }),
      );
    },
  );
}
