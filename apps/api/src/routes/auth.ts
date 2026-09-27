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
          "A valid display name is required",
        );
      }

      const { identity, token } = await tokenService.issue(
        parsed.data.displayName,
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
