import { demoClientSourceSchema, type DemoClientSource } from "@pulse/protocol";
import { jwtVerify, SignJWT } from "jose";
import { z } from "zod";

import { createAnonymousParticipant } from "./helpers/anonymous-identity.js";
import type { DemoIdentity } from "./types.js";

const tokenPayloadSchema = z.object({
  sub: z.uuid(),
  displayName: z.string().min(1).max(80),
  source: demoClientSourceSchema,
  rooms: z.array(z.string()).min(1),
  exp: z.number().int().positive(),
});

type TokenPayload = z.infer<typeof tokenPayloadSchema>;

export class TokenService {
  private readonly key: Uint8Array;

  constructor(
    secret: string,
    private readonly lifetimeSeconds = 15 * 60,
  ) {
    this.key = new TextEncoder().encode(secret);
  }

  async issue(
    source: DemoClientSource,
    sessionId: string,
    rooms: string[],
  ): Promise<{ identity: DemoIdentity; token: string }> {
    const expiresAtSeconds =
      Math.floor(Date.now() / 1000) + this.lifetimeSeconds;
    const participant = createAnonymousParticipant(source, sessionId, this.key);
    const payload: TokenPayload = {
      sub: participant.id,
      displayName: participant.displayName,
      source: participant.source,
      rooms,
      exp: expiresAtSeconds,
    };
    const token = await new SignJWT({
      displayName: payload.displayName,
      source: payload.source,
      rooms: payload.rooms,
    })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setSubject(payload.sub)
      .setIssuedAt()
      .setExpirationTime(payload.exp)
      .setIssuer("pulse-demo")
      .setAudience("pulse-widget")
      .sign(this.key);

    return {
      token,
      identity: {
        user: {
          id: payload.sub,
          displayName: payload.displayName,
          source: payload.source,
        },
        rooms: payload.rooms,
        expiresAt: new Date(payload.exp * 1000).toISOString(),
      },
    };
  }

  async verify(token: string): Promise<DemoIdentity | null> {
    try {
      const result = await jwtVerify(token, this.key, {
        algorithms: ["HS256"],
        issuer: "pulse-demo",
        audience: "pulse-widget",
      });
      const payload = tokenPayloadSchema.parse(result.payload);

      return {
        user: {
          id: payload.sub,
          displayName: payload.displayName,
          source: payload.source,
        },
        rooms: payload.rooms,
        expiresAt: new Date(payload.exp * 1000).toISOString(),
      };
    } catch {
      return null;
    }
  }
}
