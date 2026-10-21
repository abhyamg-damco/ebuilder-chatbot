import axios, { type AxiosError, type AxiosRequestConfig, type Method } from "axios";
import type { AppConfig } from "./config.js";

interface TokenCache { value: string; expiresAt: number }

/** Minimal authenticated API client; a single retry handles expired password-grant tokens. */
export class EBuilderClient {
  private tokenCache: TokenCache | undefined;
  constructor(private readonly config: AppConfig) {}

  async request<T>(method: Method, path: string, options: {
    data?: unknown;
    params?: Record<string, string | number | boolean | undefined>;
    retry?: boolean;
  } = {}): Promise<T> {
    try {
      const response = await axios.request<T>({
        method,
        url: `${this.config.baseUrl}${path}`,
        data: options.data,
        params: cleanParams(options.params),
        headers: {
          Authorization: `Bearer ${await this.accessToken()}`,
          Accept: "application/json",
          ...(options.data === undefined ? {} : { "Content-Type": "application/json" }),
        },
      } satisfies AxiosRequestConfig);
      return response.data;
    } catch (error) {
      const apiError = error as AxiosError;
      if (apiError.response?.status === 401 && !this.config.accessToken && options.retry !== false) {
        this.tokenCache = undefined;
        return this.request<T>(method, path, { ...options, retry: false });
      }
      throw apiErrorMessage(apiError);
    }
  }

  get<T>(path: string, params?: Record<string, string | number | boolean | undefined>) {
    return this.request<T>("GET", path, { params });
  }
  post<T>(path: string, data?: unknown, params?: Record<string, string | number | boolean | undefined>) {
    return this.request<T>("POST", path, { data, params });
  }

  private async accessToken(): Promise<string> {
    if (this.config.accessToken) return this.config.accessToken;
    if (this.tokenCache && this.tokenCache.expiresAt > Date.now() + 60_000) return this.tokenCache.value;
    const body = new URLSearchParams({
      grant_type: "password", username: this.config.username!, password: this.config.password!,
    });
    const result = await axios.post<{ access_token: string; expires_in: number }>(
      `${this.config.baseUrl}/api/v2/Authenticate`, body.toString(),
      { headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" } },
    );
    this.tokenCache = { value: result.data.access_token, expiresAt: Date.now() + result.data.expires_in * 1000 };
    return this.tokenCache.value;
  }
}

function cleanParams(input: Record<string, string | number | boolean | undefined> | undefined) {
  if (!input) return undefined;
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined));
}
function apiErrorMessage(error: AxiosError): Error {
  const detail = typeof error.response?.data === "string" ? error.response.data : JSON.stringify(error.response?.data ?? error.message);
  return new Error(`e-Builder API error${error.response?.status ? ` (${error.response.status})` : ""}: ${detail}`);
}
