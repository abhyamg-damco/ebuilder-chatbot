import { z } from "zod";

import { ALLOWED_MIME_TYPES } from "@/lib/storage/mime";

const allowedMediaTypes = z.enum(
  ALLOWED_MIME_TYPES as unknown as [string, ...string[]]
);

const textPartSchema = z.object({
  type: z.enum(["text"]),
  text: z.string().max(2000),
});

const filePartSchema = z.object({
  type: z.enum(["file"]),
  mediaType: allowedMediaTypes,
  name: z.string().min(1).max(200).optional(),
  filename: z.string().min(1).max(200).optional(),
  url: z.string().url(),
  uploadId: z.string().uuid().optional(),
  useInBrowser: z.boolean().optional(),
});

const partSchema = z.union([textPartSchema, filePartSchema]);

const userMessageSchema = z
  .object({
    id: z.string().uuid(),
    role: z.enum(["user"]),
    parts: z.array(partSchema).min(1),
  })
  .refine(
    (message) => {
      const hasText = message.parts.some(
        (part) => part.type === "text" && part.text.trim().length > 0
      );
      const hasFile = message.parts.some((part) => part.type === "file");
      return hasText || hasFile;
    },
    { message: "Message must include text or at least one file" }
  );

const toolApprovalMessageSchema = z.object({
  id: z.string(),
  role: z.enum(["user", "assistant"]),
  parts: z.array(z.record(z.unknown())),
});

export const postRequestBodySchema = z.object({
  id: z.string().uuid(),
  message: userMessageSchema.optional(),
  messages: z.array(toolApprovalMessageSchema).optional(),
  selectedChatModel: z.string(),
  selectedVisibilityType: z.enum(["public", "private"]),
  referencedSkillIds: z.array(z.string().uuid()).max(5).optional(),
  referencedSecretIds: z.array(z.string().uuid()).max(10).optional(),
  sessionType: z.enum(["general", "trimble_automation"]).optional(),
});

export type PostRequestBody = z.infer<typeof postRequestBodySchema>;
