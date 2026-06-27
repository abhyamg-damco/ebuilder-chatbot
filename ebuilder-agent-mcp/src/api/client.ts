import axios, {
  type AxiosError,
  type AxiosRequestConfig,
  type Method,
} from "axios";
import type { AppConfig } from "../config.js";
import { TokenManager } from "../auth/token-manager.js";

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

/** HTTP client for e-Builder API with automatic bearer auth and 401 retry. */
export class EBuilderClient {
  readonly tokenManager: TokenManager;

  constructor(private readonly config: AppConfig) {
    this.tokenManager = new TokenManager(config);
  }

  /** Execute an authenticated API request. */
  async request<T = unknown>(
    method: Method,
    path: string,
    options: {
      params?: Record<string, string | number | boolean | undefined>;
      data?: unknown;
      retryOn401?: boolean;
    } = {}
  ): Promise<T> {
    const { params, data, retryOn401 = true } = options;
    const token = await this.tokenManager.getAccessToken();

    const axiosConfig: AxiosRequestConfig = {
      method,
      url: `${this.config.baseUrl}${path}`,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        ...(data !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      params: sanitizeParams(params),
      data,
    };

    try {
      const response = await axios.request<T>(axiosConfig);
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;
      if (
        retryOn401 &&
        axiosError.response?.status === 401 &&
        !this.config.accessToken
      ) {
        this.tokenManager.invalidate();
        return this.request<T>(method, path, { ...options, retryOn401: false });
      }
      throw formatApiError(axiosError);
    }
  }

  async get<T = unknown>(
    path: string,
    params?: Record<string, string | number | boolean | undefined>
  ): Promise<T> {
    return this.request<T>("GET", path, { params });
  }

  async post<T = unknown>(
    path: string,
    data?: unknown,
    params?: Record<string, string | number | boolean | undefined>
  ): Promise<T> {
    return this.request<T>("POST", path, { data, params });
  }
}

function sanitizeParams(
  params?: Record<string, string | number | boolean | undefined>
): Record<string, string | number | boolean> | undefined {
  if (!params) {
    return undefined;
  }

  const result: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}

function formatApiError(error: AxiosError): Error {
  const status = error.response?.status;
  const data = error.response?.data;
  let detail = error.message;

  if (typeof data === "string") {
    detail = data;
  } else if (typeof data === "object" && data !== null) {
    detail = JSON.stringify(data);
  }

  return new Error(
    `e-Builder API error${status ? ` (${status})` : ""}: ${detail}`
  );
}

/** Format tool output as MCP text content. */
export function toToolResult(
  data: unknown,
  options?: { isError?: boolean }
): {
  content: Array<{ type: "text"; text: string }>;
  isError?: true;
} {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(data, null, 2),
      },
    ],
    ...(options?.isError ? { isError: true as const } : {}),
  };
}

/** Agent-aware tool result with standard continuation fields. */
export function toAgentToolResult(payload: {
  status: "complete" | "partial" | "incomplete" | "found" | "not_found";
  data?: unknown;
  nextSteps?: string[];
  agentDirective?: string;
  [key: string]: unknown;
}): ReturnType<typeof toToolResult> {
  return toToolResult({
    ...payload,
    agentDirective:
      payload.agentDirective ??
      (payload.status === "complete"
        ? "You may now answer the user with the data above."
        : "DO NOT stop. Execute nextSteps before responding to the user."),
  });
}

/** Format tool errors for MCP clients. */
export function toToolError(message: string): {
  content: Array<{ type: "text"; text: string }>;
  isError: true;
} {
  return {
    content: [{ type: "text", text: message }],
    isError: true,
  };
}
