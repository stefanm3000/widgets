import { randomUUID } from "node:crypto";

import type { Participant } from "@pulse/protocol";
import { jwtVerify, SignJWT } from "jose";
import { z } from "zod";

const tokenPayloadSchema = z.object({
  sub: z.uuid(),
  displayName: z.string().min(1).max(80),
  rooms: z.array(z.string()).min(1),
  exp: z.number().int().positive(),
});

type TokenPayload = z.infer<typeof tokenPayloadSchema>;

export interface DemoIdentity {
  user: Participant;
  rooms: string[];
  expiresAt: string;
}

export class TokenService {
  private readonly key: Uint8Array;

  constructor(
    secret: string,
    private readonly lifetimeSeconds = 15 * 60,
  ) {
    this.key = new TextEncoder().encode(secret);
  }

  async issue(
    displayName: string,
    rooms: string[],
  ): Promise<{ identity: DemoIdentity; token: string }> {
    const expiresAtSeconds =
      Math.floor(Date.now() / 1000) + this.lifetimeSeconds;
    const payload: TokenPayload = {
      sub: randomUUID(),
      displayName,
      rooms,
      exp: expiresAtSeconds,
    };
    const token = await new SignJWT({
      displayName: payload.displayName,
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
        user: { id: payload.sub, displayName: payload.displayName },
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
        user: { id: payload.sub, displayName: payload.displayName },
        rooms: payload.rooms,
        expiresAt: new Date(payload.exp * 1000).toISOString(),
      };
    } catch {
      return null;
    }
  }
}
