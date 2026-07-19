import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/app/(auth)/auth";
import {
  createChatUpload,
  finalizeChatUpload,
  getChatById,
  saveChat,
  updateChatUploadStatus,
} from "@/lib/db/queries";
import { isGcsStorageEnabled } from "@/lib/storage/config";
import {
  getPublicErrorMessage,
  logStorageError,
} from "@/lib/storage/logger";
import {
  buildObjectPath,
  extractTextPreview,
  getSignedReadUrl,
  uploadToGcs,
} from "@/lib/storage/upload";
import {
  buildUploadContentUrl,
  getRequestOrigin,
} from "@/lib/storage/urls";
import {
  getMaxUploadBytes,
  getUploadCategory,
  isAllowedMimeType,
} from "@/lib/storage/mime";
import { generateUUID } from "@/lib/utils";

const chatIdSchema = z.string().uuid();
const visibilitySchema = z.enum(["public", "private"]).optional();
const sessionTypeSchema = z
  .enum(["general", "trimble_automation", "invoice_review"])
  .optional();

/**
 * Ensures a chat row exists before uploading (new chats are created on first message or first upload).
 */
async function ensureChatForUpload({
  chatId,
  userId,
  visibility,
  sessionType,
}: {
  chatId: string;
  userId: string;
  visibility?: "public" | "private";
  sessionType?: "general" | "trimble_automation" | "invoice_review";
}) {
  const existing = await getChatById({ id: chatId });

  if (existing) {
    if (existing.userId !== userId) {
      return null;
    }
    return existing;
  }

  await saveChat({
    id: chatId,
    userId,
    title: "New chat",
    visibility: visibility ?? "private",
    sessionType: sessionType ?? "general",
  });

  return getChatById({ id: chatId });
}

/**
 * POST /api/files/upload
 *
 * Uploads a file to GCS and persists metadata in ChatUpload.
 * Requires auth, chatId, and a supported MIME type.
 */
export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isGcsStorageEnabled()) {
    return NextResponse.json(
      { error: "GCS storage is not configured (set GCS_BUCKET_NAME)" },
      { status: 503 }
    );
  }

  if (request.body === null) {
    return new Response("Request body is empty", { status: 400 });
  }

  const origin = getRequestOrigin(request);
  let uploadId: string | undefined;

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const chatIdRaw = formData.get("chatId");

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const chatIdResult = chatIdSchema.safeParse(chatIdRaw);
    if (!chatIdResult.success) {
      return NextResponse.json(
        { error: "Valid chatId is required" },
        { status: 400 }
      );
    }

    const chatId = chatIdResult.data;
    const visibilityResult = visibilitySchema.safeParse(
      formData.get("visibility")
    );
    const sessionTypeResult = sessionTypeSchema.safeParse(
      formData.get("sessionType")
    );

    const chat = await ensureChatForUpload({
      chatId,
      userId: session.user.id,
      visibility: visibilityResult.success ? visibilityResult.data : undefined,
      sessionType: sessionTypeResult.success
        ? sessionTypeResult.data
        : undefined,
    });

    if (!chat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    if (!isAllowedMimeType(file.type)) {
      return NextResponse.json(
        {
          error:
            "Unsupported file type. Allowed: JPEG, PNG, PDF, TXT, CSV, DOCX, XLSX, PPTX",
        },
        { status: 400 }
      );
    }

    const category = getUploadCategory(file.type);
    const maxBytes = getMaxUploadBytes(category);

    if (file.size > maxBytes) {
      return NextResponse.json(
        {
          error: `File size exceeds limit (${Math.floor(maxBytes / (1024 * 1024))}MB)`,
        },
        { status: 400 }
      );
    }

    uploadId = generateUUID();
    const objectPath = buildObjectPath({
      chatId,
      uploadId,
      filename: file.name,
    });

    const buffer = Buffer.from(await file.arrayBuffer());
    const extracted = await extractTextPreview({
      buffer,
      mimeType: file.type,
      category,
    });

    await createChatUpload({
      id: uploadId,
      chatId,
      userId: session.user.id,
      originalFilename: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
      bucket: "",
      objectPath,
      isPublic: false,
      category,
      status: "uploading",
      metadata: extracted,
    });

    const gcsResult = await uploadToGcs({
      buffer,
      objectPath,
      mimeType: file.type,
      isPublic: false,
    });

    await finalizeChatUpload({
      id: uploadId,
      bucket: gcsResult.bucket,
      checksumSha256: gcsResult.checksumSha256,
      metadata: { ...extracted, ...gcsResult.metadata },
    });

    const contentUrl = buildUploadContentUrl({ uploadId, origin });

    let signedUrl: string | undefined;
    let expiresAt = new Date(Date.now() + 3_600_000).toISOString();

    try {
      const signed = await getSignedReadUrl({
        objectPath,
        bucket: gcsResult.bucket,
      });
      signedUrl = signed.url;
      expiresAt = signed.expiresAt;
    } catch (signError) {
      logStorageError("files/upload:signedUrl", signError, {
        uploadId,
        hint: "Using authenticated content proxy URL instead. Set GOOGLE_APPLICATION_CREDENTIALS to a service account JSON for signed URLs.",
      });
    }

    return NextResponse.json({
      id: uploadId,
      url: contentUrl,
      signedUrl,
      pathname: objectPath,
      contentType: file.type,
      isPublic: false,
      expiresAt,
      category,
      originalFilename: file.name,
      sizeBytes: file.size,
    });
  } catch (error) {
    logStorageError("files/upload", error, {
      uploadId,
      userId: session.user.id,
    });

    if (uploadId) {
      try {
        await updateChatUploadStatus({ id: uploadId, status: "failed" });
      } catch (statusError) {
        logStorageError("files/upload:markFailed", statusError, { uploadId });
      }
    }

    return NextResponse.json(
      {
        error: getPublicErrorMessage(error, "Failed to process upload"),
      },
      { status: 500 }
    );
  }
}
