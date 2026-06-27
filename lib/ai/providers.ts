import { createOpenAI } from "@ai-sdk/openai";
import { type LanguageModel, customProvider } from "ai";
import { isTestEnvironment } from "../constants";
import { titleModel } from "./models";

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const myProvider = isTestEnvironment
  ? (() => {
      const { chatModel, titleModel } = require("./models.mock");
      return customProvider({
        languageModels: {
          "chat-model": chatModel,
          "title-model": titleModel,
        },
      });
    })()
  : null;

/** Returns an OpenAI language model for chat, tools, and artifacts. */
export function getLanguageModel(modelId: string): LanguageModel {
  if (isTestEnvironment && myProvider) {
    return myProvider.languageModel(modelId);
  }

  return openai.chat(modelId) as unknown as LanguageModel;
}

/** Returns a lightweight OpenAI model for chat title generation. */
export function getTitleModel(): LanguageModel {
  if (isTestEnvironment && myProvider) {
    return myProvider.languageModel("title-model");
  }

  return openai.chat(titleModel.id) as unknown as LanguageModel;
}

/** Fast model for short per-tool reasoning explanations. */
export function getToolReasoningModel(): LanguageModel {
  if (isTestEnvironment && myProvider) {
    return myProvider.languageModel("title-model");
  }

  return openai.chat(titleModel.id) as unknown as LanguageModel;
}
