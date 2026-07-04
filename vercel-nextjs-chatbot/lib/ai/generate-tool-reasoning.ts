import "server-only";

import { generateText } from "ai";
import { getToolReasoningModel } from "./providers";

type GenerateToolReasoningInput = {
  toolName: string;
  input: unknown;
  userMessage: string;
  modelReasoning?: string;
};

/**
 * Use a fast model to produce a 1–2 sentence plain-English explanation
 * of why a tool was called and which values matter.
 */
export async function generateToolReasoningExplanation({
  toolName,
  input,
  userMessage,
  modelReasoning,
}: GenerateToolReasoningInput): Promise<string> {
  const { text } = await generateText({
    model: getToolReasoningModel(),
    system: `You explain AI tool usage to non-technical users.
Write exactly 1-2 short sentences (max 35 words total).
Say WHY the tool is being used and WHICH input values matter.
Use plain language — no JSON, no code, no tool IDs.
Do not start with "I" every time — vary phrasing naturally.`,
    prompt: `User message: ${userMessage || "N/A"}

Tool: ${toolName}
Tool inputs: ${JSON.stringify(input ?? {})}
Assistant's private thinking (if any): ${modelReasoning || "none"}

Write the brief explanation:`,
    maxOutputTokens: 80,
  });

  return text.trim();
}
