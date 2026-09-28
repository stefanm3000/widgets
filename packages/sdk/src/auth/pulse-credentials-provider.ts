import type { Participant } from "@pulse/protocol";

import type { PulseToken, PulseTokenProvider } from "../types.js";

interface ResolvedCredentials {
  accessToken: string;
  user: Participant | null;
}

export class PulseCredentialsProvider {
  private currentUser: Participant | null = null;
  private pending: Promise<ResolvedCredentials> | null = null;

  constructor(private readonly getToken: PulseTokenProvider) {}

  getAccessToken = async (): Promise<string> => {
    return (await this.resolve()).accessToken;
  };

  getCurrentUser = async (): Promise<Participant | null> => {
    const credentials = await this.resolve();
    return credentials.user ?? this.currentUser;
  };

  private resolve(): Promise<ResolvedCredentials> {
    if (this.pending) return this.pending;

    this.pending = Promise.resolve(this.getToken())
      .then((token) => this.normalize(token))
      .finally(() => {
        this.pending = null;
      });
    return this.pending;
  }

  private normalize(token: PulseToken): ResolvedCredentials {
    if (typeof token === "string") {
      return { accessToken: token, user: null };
    }

    this.currentUser = token.user;
    return token;
  }
}
