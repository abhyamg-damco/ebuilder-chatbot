export const DEFAULT_CHAT_MODEL = "gpt-4o";

export const titleModel = {
  id: "gpt-4o-mini",
  name: "GPT-4o Mini",
  provider: "openai",
  description: "Fast model for title generation",
};

export type ModelCapabilities = {
  tools: boolean;
  vision: boolean;
  reasoning: boolean;
};

export type ChatModel = {
  id: string;
  name: string;
  provider: string;
  description: string;
  reasoningEffort?: "none" | "minimal" | "low" | "medium" | "high";
};

/** Static capability map for OpenAI models (no gateway lookup required). */
const openaiCapabilities: Record<string, ModelCapabilities> = {
  "gpt-5.2-chat-latest": { tools: true, vision: true, reasoning: true },
  "gpt-4o": { tools: true, vision: true, reasoning: false },
  "gpt-4o-mini": { tools: true, vision: true, reasoning: false },
  "gpt-4-turbo": { tools: true, vision: true, reasoning: false },
  "o3-mini": { tools: true, vision: false, reasoning: true },
};

export const chatModels: ChatModel[] = [
  {
    id: "gpt-5.2-chat-latest",
    name: "GPT-5.2 Chat",
    provider: "openai",
    description: "Latest GPT-5.2 chat model with tools and vision",
    reasoningEffort: "medium",
  },
  {
    id: "gpt-4o",
    name: "GPT-4o",
    provider: "openai",
    description: "Most capable multimodal model with tool use",
  },
  {
    id: "gpt-4o-mini",
    name: "GPT-4o Mini",
    provider: "openai",
    description: "Fast and cost-effective with tool use",
  },
  {
    id: "gpt-4-turbo",
    name: "GPT-4 Turbo",
    provider: "openai",
    description: "High-performance model with vision",
  },
  {
    id: "o3-mini",
    name: "o3-mini",
    provider: "openai",
    description: "Reasoning model for complex tasks",
    reasoningEffort: "low",
  },
];

export async function getCapabilities(): Promise<
  Record<string, ModelCapabilities>
> {
  return openaiCapabilities;
}

export const isDemo = process.env.IS_DEMO === "1";

export type GatewayModelWithCapabilities = ChatModel & {
  capabilities: ModelCapabilities;
};

/** Returns curated OpenAI models with capabilities (used in demo mode). */
export async function getAllGatewayModels(): Promise<
  GatewayModelWithCapabilities[]
> {
  return chatModels.map((model) => ({
    ...model,
    capabilities: openaiCapabilities[model.id] ?? {
      tools: false,
      vision: false,
      reasoning: false,
    },
  }));
}

export function getActiveModels(): ChatModel[] {
  return chatModels;
}

export const allowedModelIds = new Set(chatModels.map((m) => m.id));

export const modelsByProvider = chatModels.reduce(
  (acc, model) => {
    if (!acc[model.provider]) {
      acc[model.provider] = [];
    }
    acc[model.provider].push(model);
    return acc;
  },
  {} as Record<string, ChatModel[]>
);
