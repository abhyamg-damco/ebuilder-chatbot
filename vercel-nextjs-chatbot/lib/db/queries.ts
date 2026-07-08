import "server-only";

import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  gte,
  inArray,
  isNull,
  lt,
  sql,
  type SQL,
} from "drizzle-orm";
import type { ArtifactKind } from "@/components/chat/artifact";
import type { VisibilityType } from "@/components/chat/visibility-selector";
import { ChatbotError } from "../errors";
import { generateUUID } from "../utils";
import {
  type Chat,
  chat,
  type ChatBrowserSession,
  type ChatBrowserSessionMetadata,
  chatBrowserSession,
  type ChatUpload,
  type ChatUploadMetadata,
  chatUpload,
  type DBMessage,
  document,
  message,
  type Suggestion,
  stream,
  suggestion,
  type User,
  user,
  vote,
  mcpServer,
  type McpServer,
} from "./schema";
import { generateHashedPassword, normalizeAuthEmail } from "./utils";
import type { McpServerScope } from "../mcp/scope";
import { getDb } from "./client";

let drizzleDb: ReturnType<typeof getDb> | undefined;

/** Lazy Drizzle instance so production builds without POSTGRES_URL still succeed. */
function useDb() {
  if (!drizzleDb) {
    drizzleDb = getDb();
  }
  return drizzleDb;
}

/** Builds a WHERE clause that matches MCP servers for the given access scope. */
function mcpServerScopeWhere(scope: McpServerScope): SQL {
  if (scope.kind === "global") {
    return isNull(mcpServer.userId);
  }

  return eq(mcpServer.userId, scope.userId);
}

export async function getUser(email: string): Promise<User[]> {
  const normalizedEmail = normalizeAuthEmail(email);

  try {
    return await useDb()
      .select()
      .from(user)
      .where(sql`lower(${user.email}) = ${normalizedEmail}`);
  } catch (error) {
    const detail =
      error instanceof Error ? error.message : "Unknown database error";
    throw new ChatbotError(
      "bad_request:database",
      `Failed to get user by email: ${detail}`
    );
  }
}

export async function createUser(email: string, password: string) {
  const normalizedEmail = normalizeAuthEmail(email);
  const hashedPassword = generateHashedPassword(password);

  try {
    return await useDb()
      .insert(user)
      .values({
        email: normalizedEmail,
        password: hashedPassword,
        isAnonymous: false,
      })
      .returning({
        id: user.id,
        email: user.email,
      });
  } catch (_error) {
    throw new ChatbotError("bad_request:database", "Failed to create user");
  }
}

export async function createGuestUser() {
  const email = `guest-${Date.now()}`;
  const password = generateHashedPassword(generateUUID());

  try {
    return await useDb()
      .insert(user)
      .values({ email, password, isAnonymous: true })
      .returning({
        id: user.id,
        email: user.email,
      });
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to create guest user"
    );
  }
}

export async function saveChat({
  id,
  userId,
  title,
  visibility,
}: {
  id: string;
  userId: string;
  title: string;
  visibility: VisibilityType;
}) {
  try {
    return await useDb().insert(chat).values({
      id,
      createdAt: new Date(),
      userId,
      title,
      visibility,
    });
  } catch (_error) {
    throw new ChatbotError("bad_request:database", "Failed to save chat");
  }
}

export async function deleteChatById({ id }: { id: string }) {
  try {
    await useDb().delete(vote).where(eq(vote.chatId, id));
    await useDb().delete(message).where(eq(message.chatId, id));
    await useDb().delete(stream).where(eq(stream.chatId, id));

    const [chatsDeleted] = await useDb()
      .delete(chat)
      .where(eq(chat.id, id))
      .returning();
    return chatsDeleted;
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to delete chat by id"
    );
  }
}

export async function deleteAllChatsByUserId({ userId }: { userId: string }) {
  try {
    const userChats = await useDb()
      .select({ id: chat.id })
      .from(chat)
      .where(eq(chat.userId, userId));

    if (userChats.length === 0) {
      return { deletedCount: 0 };
    }

    const chatIds = userChats.map((c) => c.id);

    await useDb().delete(vote).where(inArray(vote.chatId, chatIds));
    await useDb().delete(message).where(inArray(message.chatId, chatIds));
    await useDb().delete(stream).where(inArray(stream.chatId, chatIds));

    const deletedChats = await useDb()
      .delete(chat)
      .where(eq(chat.userId, userId))
      .returning();

    return { deletedCount: deletedChats.length };
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to delete all chats by user id"
    );
  }
}

export async function getChatsByUserId({
  id,
  limit,
  startingAfter,
  endingBefore,
}: {
  id: string;
  limit: number;
  startingAfter: string | null;
  endingBefore: string | null;
}) {
  try {
    const extendedLimit = limit + 1;

    const query = (whereCondition?: SQL<unknown>) =>
      useDb()
        .select()
        .from(chat)
        .where(
          whereCondition
            ? and(whereCondition, eq(chat.userId, id))
            : eq(chat.userId, id)
        )
        .orderBy(desc(chat.createdAt))
        .limit(extendedLimit);

    let filteredChats: Chat[] = [];

    if (startingAfter) {
      const [selectedChat] = await useDb()
        .select()
        .from(chat)
        .where(eq(chat.id, startingAfter))
        .limit(1);

      if (!selectedChat) {
        throw new ChatbotError(
          "not_found:database",
          `Chat with id ${startingAfter} not found`
        );
      }

      filteredChats = await query(gt(chat.createdAt, selectedChat.createdAt));
    } else if (endingBefore) {
      const [selectedChat] = await useDb()
        .select()
        .from(chat)
        .where(eq(chat.id, endingBefore))
        .limit(1);

      if (!selectedChat) {
        throw new ChatbotError(
          "not_found:database",
          `Chat with id ${endingBefore} not found`
        );
      }

      filteredChats = await query(lt(chat.createdAt, selectedChat.createdAt));
    } else {
      filteredChats = await query();
    }

    const hasMore = filteredChats.length > limit;

    return {
      chats: hasMore ? filteredChats.slice(0, limit) : filteredChats,
      hasMore,
    };
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to get chats by user id"
    );
  }
}

export async function getChatById({ id }: { id: string }) {
  try {
    const [selectedChat] = await useDb().select().from(chat).where(eq(chat.id, id));
    if (!selectedChat) {
      return null;
    }

    return selectedChat;
  } catch (_error) {
    throw new ChatbotError("bad_request:database", "Failed to get chat by id");
  }
}

export async function saveMessages({ messages }: { messages: DBMessage[] }) {
  try {
    return await useDb().insert(message).values(messages);
  } catch (_error) {
    throw new ChatbotError("bad_request:database", "Failed to save messages");
  }
}

export async function updateMessage({
  id,
  parts,
}: {
  id: string;
  parts: DBMessage["parts"];
}) {
  try {
    return await useDb().update(message).set({ parts }).where(eq(message.id, id));
  } catch (_error) {
    throw new ChatbotError("bad_request:database", "Failed to update message");
  }
}

export async function getMessagesByChatId({ id }: { id: string }) {
  try {
    return await useDb()
      .select()
      .from(message)
      .where(eq(message.chatId, id))
      .orderBy(asc(message.createdAt));
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to get messages by chat id"
    );
  }
}

export async function voteMessage({
  chatId,
  messageId,
  type,
}: {
  chatId: string;
  messageId: string;
  type: "up" | "down";
}) {
  try {
    const [existingVote] = await useDb()
      .select()
      .from(vote)
      .where(and(eq(vote.messageId, messageId)));

    if (existingVote) {
      return await useDb()
        .update(vote)
        .set({ isUpvoted: type === "up" })
        .where(and(eq(vote.messageId, messageId), eq(vote.chatId, chatId)));
    }
    return await useDb().insert(vote).values({
      chatId,
      messageId,
      isUpvoted: type === "up",
    });
  } catch (_error) {
    throw new ChatbotError("bad_request:database", "Failed to vote message");
  }
}

export async function getVotesByChatId({ id }: { id: string }) {
  try {
    return await useDb().select().from(vote).where(eq(vote.chatId, id));
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to get votes by chat id"
    );
  }
}

export async function saveDocument({
  id,
  title,
  kind,
  content,
  userId,
}: {
  id: string;
  title: string;
  kind: ArtifactKind;
  content: string;
  userId: string;
}) {
  try {
    return await useDb()
      .insert(document)
      .values({
        id,
        title,
        kind,
        content,
        userId,
        createdAt: new Date(),
      })
      .returning();
  } catch (_error) {
    throw new ChatbotError("bad_request:database", "Failed to save document");
  }
}

export async function updateDocumentContent({
  id,
  content,
}: {
  id: string;
  content: string;
}) {
  try {
    const docs = await useDb()
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(desc(document.createdAt))
      .limit(1);

    const latest = docs[0];
    if (!latest) {
      throw new ChatbotError("not_found:database", "Document not found");
    }

    return await useDb()
      .update(document)
      .set({ content })
      .where(and(eq(document.id, id), eq(document.createdAt, latest.createdAt)))
      .returning();
  } catch (_error) {
    if (_error instanceof ChatbotError) {
      throw _error;
    }
    throw new ChatbotError(
      "bad_request:database",
      "Failed to update document content"
    );
  }
}

export async function getDocumentsById({ id }: { id: string }) {
  try {
    const documents = await useDb()
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(asc(document.createdAt));

    return documents;
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to get documents by id"
    );
  }
}

export async function getDocumentById({ id }: { id: string }) {
  try {
    const [selectedDocument] = await useDb()
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(desc(document.createdAt));

    return selectedDocument;
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to get document by id"
    );
  }
}

export async function deleteDocumentsByIdAfterTimestamp({
  id,
  timestamp,
}: {
  id: string;
  timestamp: Date;
}) {
  try {
    await useDb()
      .delete(suggestion)
      .where(
        and(
          eq(suggestion.documentId, id),
          gt(suggestion.documentCreatedAt, timestamp)
        )
      );

    return await useDb()
      .delete(document)
      .where(and(eq(document.id, id), gt(document.createdAt, timestamp)))
      .returning();
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to delete documents by id after timestamp"
    );
  }
}

export async function saveSuggestions({
  suggestions,
}: {
  suggestions: Suggestion[];
}) {
  try {
    return await useDb().insert(suggestion).values(suggestions);
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to save suggestions"
    );
  }
}

export async function getSuggestionsByDocumentId({
  documentId,
}: {
  documentId: string;
}) {
  try {
    return await useDb()
      .select()
      .from(suggestion)
      .where(eq(suggestion.documentId, documentId));
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to get suggestions by document id"
    );
  }
}

export async function getMessageById({ id }: { id: string }) {
  try {
    return await useDb().select().from(message).where(eq(message.id, id));
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to get message by id"
    );
  }
}

export async function deleteMessagesByChatIdAfterTimestamp({
  chatId,
  timestamp,
}: {
  chatId: string;
  timestamp: Date;
}) {
  try {
    const messagesToDelete = await useDb()
      .select({ id: message.id })
      .from(message)
      .where(
        and(eq(message.chatId, chatId), gte(message.createdAt, timestamp))
      );

    const messageIds = messagesToDelete.map(
      (currentMessage) => currentMessage.id
    );

    if (messageIds.length > 0) {
      await useDb()
        .delete(vote)
        .where(
          and(eq(vote.chatId, chatId), inArray(vote.messageId, messageIds))
        );

      return await useDb()
        .delete(message)
        .where(
          and(eq(message.chatId, chatId), inArray(message.id, messageIds))
        );
    }
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to delete messages by chat id after timestamp"
    );
  }
}

export async function updateChatVisibilityById({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: "private" | "public";
}) {
  try {
    return await useDb().update(chat).set({ visibility }).where(eq(chat.id, chatId));
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to update chat visibility by id"
    );
  }
}

export async function updateChatTitleById({
  chatId,
  title,
}: {
  chatId: string;
  title: string;
}) {
  try {
    return await useDb().update(chat).set({ title }).where(eq(chat.id, chatId));
  } catch (_error) {
    return;
  }
}

export async function getMessageCountByUserId({
  id,
  differenceInHours,
}: {
  id: string;
  differenceInHours: number;
}) {
  try {
    const cutoffTime = new Date(
      Date.now() - differenceInHours * 60 * 60 * 1000
    );

    const [stats] = await useDb()
      .select({ count: count(message.id) })
      .from(message)
      .innerJoin(chat, eq(message.chatId, chat.id))
      .where(
        and(
          eq(chat.userId, id),
          gte(message.createdAt, cutoffTime),
          eq(message.role, "user")
        )
      )
      .execute();

    return stats?.count ?? 0;
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to get message count by user id"
    );
  }
}

export async function createStreamId({
  streamId,
  chatId,
}: {
  streamId: string;
  chatId: string;
}) {
  try {
    await useDb()
      .insert(stream)
      .values({ id: streamId, chatId, createdAt: new Date() });
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to create stream id"
    );
  }
}

export async function getStreamIdsByChatId({ chatId }: { chatId: string }) {
  try {
    const streamIds = await useDb()
      .select({ id: stream.id })
      .from(stream)
      .where(eq(stream.chatId, chatId))
      .orderBy(asc(stream.createdAt))
      .execute();

    return streamIds.map(({ id }) => id);
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to get stream ids by chat id"
    );
  }
}

export async function getMcpServers({ scope }: { scope: McpServerScope }) {
  try {
    return await useDb()
      .select()
      .from(mcpServer)
      .where(mcpServerScopeWhere(scope))
      .orderBy(desc(mcpServer.createdAt));
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to get MCP servers"
    );
  }
}

export async function getEnabledMcpServers({ scope }: { scope: McpServerScope }) {
  try {
    return await useDb()
      .select()
      .from(mcpServer)
      .where(and(mcpServerScopeWhere(scope), eq(mcpServer.enabled, true)))
      .orderBy(asc(mcpServer.createdAt));
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to get enabled MCP servers"
    );
  }
}

export async function getMcpServerById({
  id,
  scope,
}: {
  id: string;
  scope: McpServerScope;
}) {
  try {
    const [server] = await useDb()
      .select()
      .from(mcpServer)
      .where(and(eq(mcpServer.id, id), mcpServerScopeWhere(scope)))
      .limit(1);

    return server ?? null;
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to get MCP server by id"
    );
  }
}

export async function createMcpServer({
  scope,
  data,
}: {
  scope: McpServerScope;
  data: Omit<McpServer, "id" | "userId" | "createdAt" | "updatedAt">;
}) {
  try {
    const [created] = await useDb()
      .insert(mcpServer)
      .values({
        userId: scope.kind === "user" ? scope.userId : null,
        ...data,
        updatedAt: new Date(),
      })
      .returning();

    return created;
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to create MCP server"
    );
  }
}

export async function updateMcpServer({
  id,
  scope,
  data,
}: {
  id: string;
  scope: McpServerScope;
  data: Partial<
    Omit<McpServer, "id" | "userId" | "createdAt" | "updatedAt">
  >;
}) {
  try {
    const [updated] = await useDb()
      .update(mcpServer)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(mcpServer.id, id), mcpServerScopeWhere(scope)))
      .returning();

    return updated ?? null;
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to update MCP server"
    );
  }
}

export async function deleteMcpServer({
  id,
  scope,
}: {
  id: string;
  scope: McpServerScope;
}) {
  try {
    const [deleted] = await useDb()
      .delete(mcpServer)
      .where(and(eq(mcpServer.id, id), mcpServerScopeWhere(scope)))
      .returning();

    return deleted ?? null;
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to delete MCP server"
    );
  }
}

// ---------------------------------------------------------------------------
// Chat uploads (GCS metadata)
// ---------------------------------------------------------------------------

/** Inserts a new chat upload metadata row. */
export async function createChatUpload({
  id,
  chatId,
  userId,
  originalFilename,
  mimeType,
  sizeBytes,
  bucket,
  objectPath,
  isPublic = false,
  category,
  status = "uploading",
  checksumSha256,
  metadata = {},
}: {
  id?: string;
  chatId: string;
  userId: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  bucket: string;
  objectPath: string;
  isPublic?: boolean;
  category: "image" | "document";
  status?: "uploading" | "ready" | "failed" | "deleted";
  checksumSha256?: string;
  metadata?: ChatUploadMetadata;
}): Promise<ChatUpload> {
  try {
    const [row] = await useDb()
      .insert(chatUpload)
      .values({
        ...(id ? { id } : {}),
        chatId,
        userId,
        originalFilename,
        mimeType,
        sizeBytes,
        bucket,
        objectPath,
        isPublic,
        category,
        status,
        checksumSha256,
        metadata,
        uploadedAt: new Date(),
      })
      .returning();
    return row;
  } catch (_error) {
    throw new ChatbotError("bad_request:database", "Failed to create chat upload");
  }
}

/** Updates bucket and checksum after GCS upload completes. */
export async function finalizeChatUpload({
  id,
  bucket,
  checksumSha256,
  metadata,
}: {
  id: string;
  bucket: string;
  checksumSha256: string;
  metadata?: ChatUploadMetadata;
}): Promise<ChatUpload | null> {
  try {
    const [row] = await useDb()
      .update(chatUpload)
      .set({
        bucket,
        checksumSha256,
        status: "ready",
        ...(metadata ? { metadata } : {}),
      })
      .where(eq(chatUpload.id, id))
      .returning();
    return row ?? null;
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to finalize chat upload"
    );
  }
}

/** Updates upload status and optional metadata. */
export async function updateChatUploadStatus({
  id,
  status,
  metadata,
}: {
  id: string;
  status: "uploading" | "ready" | "failed" | "deleted";
  metadata?: ChatUploadMetadata;
}): Promise<ChatUpload | null> {
  try {
    const [row] = await useDb()
      .update(chatUpload)
      .set({
        status,
        ...(metadata ? { metadata } : {}),
        ...(status === "deleted" ? { deletedAt: new Date() } : {}),
      })
      .where(eq(chatUpload.id, id))
      .returning();
    return row ?? null;
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to update chat upload status"
    );
  }
}

/** Links uploaded files to the message that sent them. */
export async function linkUploadsToMessage({
  uploadIds,
  messageId,
}: {
  uploadIds: string[];
  messageId: string;
}): Promise<void> {
  if (uploadIds.length === 0) {
    return;
  }
  try {
    await useDb()
      .update(chatUpload)
      .set({ messageId })
      .where(inArray(chatUpload.id, uploadIds));
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to link uploads to message"
    );
  }
}

/** Returns ready uploads for a chat, newest first. */
export async function getChatUploadsByChatId({
  chatId,
  includeDeleted = false,
}: {
  chatId: string;
  includeDeleted?: boolean;
}): Promise<ChatUpload[]> {
  try {
    return await useDb()
      .select()
      .from(chatUpload)
      .where(
        includeDeleted
          ? eq(chatUpload.chatId, chatId)
          : and(
              eq(chatUpload.chatId, chatId),
              eq(chatUpload.status, "ready")
            )
      )
      .orderBy(desc(chatUpload.uploadedAt));
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to get chat uploads"
    );
  }
}

/** Fetches a single upload by ID. */
export async function getChatUploadById({
  id,
}: {
  id: string;
}): Promise<ChatUpload | null> {
  try {
    const [row] = await useDb()
      .select()
      .from(chatUpload)
      .where(eq(chatUpload.id, id))
      .limit(1);
    return row ?? null;
  } catch (_error) {
    throw new ChatbotError("bad_request:database", "Failed to get chat upload");
  }
}

/** Soft-deletes an upload record. */
export async function softDeleteChatUpload({
  id,
}: {
  id: string;
}): Promise<ChatUpload | null> {
  return updateChatUploadStatus({ id, status: "deleted" });
}

// ---------------------------------------------------------------------------
// Browser session metadata
// ---------------------------------------------------------------------------

/** Creates a durable browser session record when a cloud browser starts. */
export async function createBrowserSessionRecord({
  chatId,
  userId,
  browserbaseSessionId,
  status = "starting",
  title,
  startedUrl,
  liveViewUrl,
  messageId,
  toolCallId,
}: {
  chatId: string;
  userId: string;
  browserbaseSessionId: string;
  status?: "starting" | "running" | "ended" | "error";
  title?: string;
  startedUrl?: string;
  liveViewUrl?: string;
  messageId?: string;
  toolCallId?: string;
}): Promise<ChatBrowserSession> {
  const now = new Date();
  const replayUrl = `https://www.browserbase.com/sessions/${browserbaseSessionId}`;

  try {
    const [row] = await useDb()
      .insert(chatBrowserSession)
      .values({
        chatId,
        userId,
        browserbaseSessionId,
        status,
        title,
        startedUrl,
        lastKnownUrl: startedUrl,
        liveViewUrl,
        replayUrl,
        messageId,
        toolCallId,
        startedAt: now,
        lastActivityAt: now,
      })
      .returning();
    return row;
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to create browser session record"
    );
  }
}

/** Updates browser session activity and optional URLs. */
export async function updateBrowserSessionRecord({
  browserbaseSessionId,
  status,
  title,
  lastKnownUrl,
  liveViewUrl,
  metadata,
}: {
  browserbaseSessionId: string;
  status?: "starting" | "running" | "ended" | "error";
  title?: string;
  lastKnownUrl?: string;
  liveViewUrl?: string;
  metadata?: ChatBrowserSessionMetadata;
}): Promise<ChatBrowserSession | null> {
  try {
    const [row] = await useDb()
      .update(chatBrowserSession)
      .set({
        ...(status ? { status } : {}),
        ...(title ? { title } : {}),
        ...(lastKnownUrl ? { lastKnownUrl } : {}),
        ...(liveViewUrl ? { liveViewUrl } : {}),
        ...(metadata ? { metadata } : {}),
        lastActivityAt: new Date(),
      })
      .where(eq(chatBrowserSession.browserbaseSessionId, browserbaseSessionId))
      .returning();
    return row ?? null;
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to update browser session record"
    );
  }
}

/** Marks a browser session as ended and records duration. */
export async function endBrowserSessionRecord({
  browserbaseSessionId,
  status = "ended",
  errorMessage,
}: {
  browserbaseSessionId: string;
  status?: "ended" | "error";
  errorMessage?: string;
}): Promise<ChatBrowserSession | null> {
  try {
    const existing = await useDb()
      .select()
      .from(chatBrowserSession)
      .where(eq(chatBrowserSession.browserbaseSessionId, browserbaseSessionId))
      .limit(1);

    const session = existing.at(0);
    const endedAt = new Date();
    const durationSeconds = session
      ? Math.max(
          0,
          Math.floor(
            (endedAt.getTime() - session.startedAt.getTime()) / 1000
          )
        )
      : undefined;

    const [row] = await useDb()
      .update(chatBrowserSession)
      .set({
        status,
        endedAt,
        durationSeconds,
        errorMessage,
        lastActivityAt: endedAt,
      })
      .where(eq(chatBrowserSession.browserbaseSessionId, browserbaseSessionId))
      .returning();
    return row ?? null;
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to end browser session record"
    );
  }
}

/** Returns browser session history for a chat, newest first. */
export async function getBrowserSessionsByChatId({
  chatId,
  limit = 20,
}: {
  chatId: string;
  limit?: number;
}): Promise<ChatBrowserSession[]> {
  try {
    return await useDb()
      .select()
      .from(chatBrowserSession)
      .where(eq(chatBrowserSession.chatId, chatId))
      .orderBy(desc(chatBrowserSession.startedAt))
      .limit(limit);
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to get browser sessions"
    );
  }
}

/** Returns the most recent non-ended session for a chat, if any. */
export async function getActiveBrowserSessionForChat({
  chatId,
}: {
  chatId: string;
}): Promise<ChatBrowserSession | null> {
  try {
    const [row] = await useDb()
      .select()
      .from(chatBrowserSession)
      .where(
        and(
          eq(chatBrowserSession.chatId, chatId),
          inArray(chatBrowserSession.status, ["starting", "running"])
        )
      )
      .orderBy(desc(chatBrowserSession.startedAt))
      .limit(1);
    return row ?? null;
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to get active browser session"
    );
  }
}

/** Verifies a Browserbase session belongs to the given chat. */
export async function getBrowserSessionByBrowserbaseId({
  browserbaseSessionId,
  chatId,
}: {
  browserbaseSessionId: string;
  chatId?: string;
}): Promise<ChatBrowserSession | null> {
  try {
    const conditions = [eq(chatBrowserSession.browserbaseSessionId, browserbaseSessionId)];
    if (chatId) {
      conditions.push(eq(chatBrowserSession.chatId, chatId));
    }
    const [row] = await useDb()
      .select()
      .from(chatBrowserSession)
      .where(and(...conditions))
      .limit(1);
    return row ?? null;
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to get browser session"
    );
  }
}
