import axios from "axios";
import type { AppConfig } from "../config.js";

interface TokenCache {
  accessToken: string;
  expiresAt: number;
}

/** Manages e-Builder password-grant tokens with in-memory caching. */
export class TokenManager {
  private cache: TokenCache | null = null;

  constructor(private readonly config: AppConfig) {}

  /** Return a valid bearer token, refreshing when near expiry. */
  async getAccessToken(): Promise<string> {
    if (this.config.accessToken) {
      return this.config.accessToken;
    }

    const now = Date.now();
    if (this.cache && now < this.cache.expiresAt - 60_000) {
      return this.cache.accessToken;
    }

    return this.authenticate();
  }

  /** Force-clear cached token (e.g. after 401). */
  invalidate(): void {
    this.cache = null;
  }

  private async authenticate(): Promise<string> {
    if (!this.config.username || !this.config.password) {
      throw new Error("EBUILDER_USERNAME and EBUILDER_PASSWORD are required");
    }

    const body = new URLSearchParams({
      grant_type: "password",
      username: this.config.username,
      password: this.config.password,
    });

    const response = await axios.post<{
      access_token: string;
      token_type: string;
      expires_in: number;
    }>(`${this.config.baseUrl}/api/v2/Authenticate`, body.toString(), {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
    });

    const { access_token, expires_in } = response.data;
    this.cache = {
      accessToken: access_token,
      expiresAt: Date.now() + expires_in * 1000,
    };

    return access_token;
  }
}
