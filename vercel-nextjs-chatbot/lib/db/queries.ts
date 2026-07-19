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
  agentSkill,
  type AgentSkill,
  userPlatformSettings,
  type UserPlatformSettingsRow,
  userSecret,
  type UserSecret,
  type ChatSessionType,
  persona,
  type Persona,
} from "./schema";
import { generateHashedPassword, normalizeAuthEmail } from "./utils";
import type { McpServerScope } from "../mcp/scope";
import type { AgentSkillScope } from "../skills/scope";
import type { PersonaScope } from "../personas/scope";
import type { InvoiceReviewConfig } from "../invoice-review/types";
import { SEED_PERSONAS } from "../personas/defaults";
import type { UserSecretScope } from "../secrets/scope";
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

function agentSkillScopeWhere(scope: AgentSkillScope): SQL {
  return eq(agentSkill.userId, scope.userId);
}

function personaScopeWhere(scope: PersonaScope): SQL {
  return eq(persona.userId, scope.userId);
}

function userSecretScopeWhere(scope: UserSecretScope): SQL {
  return eq(userSecret.userId, scope.userId);
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
  sessionType,
  invoiceReviewConfig,
}: {
  id: string;
  userId: string;
  title: string;
  visibility: VisibilityType;
  sessionType?: ChatSessionType | null;
  invoiceReviewConfig?: InvoiceReviewConfig | null;
}) {
  try {
    return await useDb().insert(chat).values({
      id,
      createdAt: new Date(),
      userId,
      title,
      visibility,
      ...(sessionType !== undefined && { sessionType }),
      ...(invoiceReviewConfig !== undefined && { invoiceReviewConfig }),
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
// Agent skills (user-defined instructions)
// ---------------------------------------------------------------------------

/** Lists all skills for a signed-in user. */
export async function getAgentSkills({ scope }: { scope: AgentSkillScope }) {
  try {
    return await useDb()
      .select()
      .from(agentSkill)
      .where(agentSkillScopeWhere(scope))
      .orderBy(desc(agentSkill.createdAt));
  } catch (_error) {
    throw new ChatbotError("bad_request:database", "Failed to get agent skills");
  }
}

/** Returns a single skill by id when it belongs to the user. */
export async function getAgentSkillById({
  id,
  scope,
}: {
  id: string;
  scope: AgentSkillScope;
}) {
  try {
    const [skill] = await useDb()
      .select()
      .from(agentSkill)
      .where(and(eq(agentSkill.id, id), agentSkillScopeWhere(scope)))
      .limit(1);

    return skill ?? null;
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to get agent skill by id"
    );
  }
}

/** Loads enabled skills matching the given slugs for a user. */
export async function getEnabledAgentSkillsBySlugs({
  userId,
  slugs,
}: {
  userId: string;
  slugs: string[];
}) {
  if (slugs.length === 0) {
    return [];
  }

  try {
    return await useDb()
      .select()
      .from(agentSkill)
      .where(
        and(
          eq(agentSkill.userId, userId),
          eq(agentSkill.enabled, true),
          inArray(agentSkill.slug, slugs)
        )
      );
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to get agent skills by slug"
    );
  }
}

/** Loads skills by id for a user (enabled filter applied at resolve time). */
export async function getAgentSkillsByIds({
  userId,
  ids,
}: {
  userId: string;
  ids: string[];
}) {
  if (ids.length === 0) {
    return [];
  }

  try {
    return await useDb()
      .select()
      .from(agentSkill)
      .where(and(eq(agentSkill.userId, userId), inArray(agentSkill.id, ids)));
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to get agent skills by id"
    );
  }
}

/** Creates a new agent skill for the user. */
export async function createAgentSkill({
  scope,
  data,
}: {
  scope: AgentSkillScope;
  data: Omit<AgentSkill, "id" | "userId" | "createdAt" | "updatedAt">;
}) {
  try {
    const [created] = await useDb()
      .insert(agentSkill)
      .values({
        userId: scope.userId,
        ...data,
        updatedAt: new Date(),
      })
      .returning();

    return created;
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to create agent skill"
    );
  }
}

/** Updates an existing agent skill owned by the user. */
export async function updateAgentSkill({
  id,
  scope,
  data,
}: {
  id: string;
  scope: AgentSkillScope;
  data: Partial<
    Omit<AgentSkill, "id" | "userId" | "createdAt" | "updatedAt">
  >;
}) {
  try {
    const [updated] = await useDb()
      .update(agentSkill)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(agentSkill.id, id), agentSkillScopeWhere(scope)))
      .returning();

    return updated ?? null;
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to update agent skill"
    );
  }
}

/** Deletes an agent skill owned by the user. */
export async function deleteAgentSkill({
  id,
  scope,
}: {
  id: string;
  scope: AgentSkillScope;
}) {
  try {
    const [deleted] = await useDb()
      .delete(agentSkill)
      .where(and(eq(agentSkill.id, id), agentSkillScopeWhere(scope)))
      .returning();

    return deleted ?? null;
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to delete agent skill"
    );
  }
}

// ---------------------------------------------------------------------------
// Invoice review personas
// ---------------------------------------------------------------------------

/** Lists personas for a user, seeding defaults when none exist or new seeds were added. */
export async function getPersonas({ scope }: { scope: PersonaScope }) {
  try {
    const existing = await useDb()
      .select()
      .from(persona)
      .where(personaScopeWhere(scope))
      .orderBy(desc(persona.createdAt));

    const existingSlugs = new Set(existing.map((row) => row.slug));
    const missingSeeds = SEED_PERSONAS.filter(
      (seed) => !existingSlugs.has(seed.slug)
    );

    if (existing.length === 0 || missingSeeds.length > 0) {
      await useDb().insert(persona).values(
        (existing.length === 0 ? SEED_PERSONAS : missingSeeds).map((seed) => ({
          userId: scope.userId,
          name: seed.name,
          slug: seed.slug,
          description: seed.description ?? null,
          instructions: seed.instructions,
          defaultTolerances: seed.defaultTolerances,
          defaultEnabledChecks: seed.defaultEnabledChecks,
          enabled: seed.enabled ?? true,
          updatedAt: new Date(),
        }))
      );
    }

    return await useDb()
      .select()
      .from(persona)
      .where(personaScopeWhere(scope))
      .orderBy(desc(persona.createdAt));
  } catch (_error) {
    throw new ChatbotError("bad_request:database", "Failed to get personas");
  }
}

/** Returns a single persona by id for the user. */
export async function getPersonaById({
  id,
  scope,
}: {
  id: string;
  scope: PersonaScope;
}) {
  try {
    const [row] = await useDb()
      .select()
      .from(persona)
      .where(and(eq(persona.id, id), personaScopeWhere(scope)))
      .limit(1);

    return row ?? null;
  } catch (_error) {
    throw new ChatbotError("bad_request:database", "Failed to get persona by id");
  }
}

/** Creates a persona for the user. */
export async function createPersona({
  scope,
  data,
}: {
  scope: PersonaScope;
  data: Omit<Persona, "id" | "userId" | "createdAt" | "updatedAt">;
}) {
  try {
    const [created] = await useDb()
      .insert(persona)
      .values({
        userId: scope.userId,
        ...data,
        updatedAt: new Date(),
      })
      .returning();

    return created;
  } catch (_error) {
    throw new ChatbotError("bad_request:database", "Failed to create persona");
  }
}

/** Updates a persona owned by the user. */
export async function updatePersona({
  id,
  scope,
  data,
}: {
  id: string;
  scope: PersonaScope;
  data: Partial<Omit<Persona, "id" | "userId" | "createdAt" | "updatedAt">>;
}) {
  try {
    const [updated] = await useDb()
      .update(persona)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(persona.id, id), personaScopeWhere(scope)))
      .returning();

    return updated ?? null;
  } catch (_error) {
    throw new ChatbotError("bad_request:database", "Failed to update persona");
  }
}

/** Deletes a persona owned by the user. */
export async function deletePersona({
  id,
  scope,
}: {
  id: string;
  scope: PersonaScope;
}) {
  try {
    const [deleted] = await useDb()
      .delete(persona)
      .where(and(eq(persona.id, id), personaScopeWhere(scope)))
      .returning();

    return deleted ?? null;
  } catch (_error) {
    throw new ChatbotError("bad_request:database", "Failed to delete persona");
  }
}

// ---------------------------------------------------------------------------
// User secrets (vault)
// ---------------------------------------------------------------------------

/** Lists all vault secrets for a signed-in user. */
export async function getUserSecrets({ scope }: { scope: UserSecretScope }) {
  try {
    return await useDb()
      .select()
      .from(userSecret)
      .where(userSecretScopeWhere(scope))
      .orderBy(desc(userSecret.createdAt));
  } catch (_error) {
    throw new ChatbotError("bad_request:database", "Failed to get user secrets");
  }
}

/** Returns a single secret by id when it belongs to the user. */
export async function getUserSecretById({
  id,
  scope,
}: {
  id: string;
  scope: UserSecretScope;
}) {
  try {
    const [secret] = await useDb()
      .select()
      .from(userSecret)
      .where(and(eq(userSecret.id, id), userSecretScopeWhere(scope)))
      .limit(1);

    return secret ?? null;
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to get user secret by id"
    );
  }
}

/** Loads secrets matching the given slugs for a user. */
export async function getUserSecretsBySlugs({
  userId,
  slugs,
}: {
  userId: string;
  slugs: string[];
}) {
  if (slugs.length === 0) {
    return [];
  }

  try {
    return await useDb()
      .select()
      .from(userSecret)
      .where(
        and(eq(userSecret.userId, userId), inArray(userSecret.slug, slugs))
      );
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to get user secrets by slug"
    );
  }
}

/** Loads secrets by id for a user. */
export async function getUserSecretsByIds({
  userId,
  ids,
}: {
  userId: string;
  ids: string[];
}) {
  if (ids.length === 0) {
    return [];
  }

  try {
    return await useDb()
      .select()
      .from(userSecret)
      .where(and(eq(userSecret.userId, userId), inArray(userSecret.id, ids)));
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to get user secrets by id"
    );
  }
}

/** Creates a new vault secret for the user. */
export async function createUserSecret({
  scope,
  data,
}: {
  scope: UserSecretScope;
  data: Omit<UserSecret, "id" | "userId" | "createdAt" | "updatedAt">;
}) {
  try {
    const [created] = await useDb()
      .insert(userSecret)
      .values({
        userId: scope.userId,
        ...data,
        updatedAt: new Date(),
      })
      .returning();

    return created;
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to create user secret"
    );
  }
}

/**
 * Creates or updates a secret by slug for the user.
 * Used by Trimble setup to persist site credentials without duplicates.
 */
export async function upsertUserSecretBySlug({
  scope,
  data,
}: {
  scope: UserSecretScope;
  data: Omit<UserSecret, "id" | "userId" | "createdAt" | "updatedAt">;
}) {
  try {
    const [existing] = await useDb()
      .select()
      .from(userSecret)
      .where(
        and(eq(userSecret.userId, scope.userId), eq(userSecret.slug, data.slug))
      )
      .limit(1);

    if (existing) {
      const [updated] = await useDb()
        .update(userSecret)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(userSecret.id, existing.id))
        .returning();

      return updated;
    }

    const [created] = await useDb()
      .insert(userSecret)
      .values({
        userId: scope.userId,
        ...data,
        updatedAt: new Date(),
      })
      .returning();

    return created;
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to upsert user secret"
    );
  }
}

/** Updates an existing vault secret owned by the user. */
export async function updateUserSecret({
  id,
  scope,
  data,
}: {
  id: string;
  scope: UserSecretScope;
  data: Partial<
    Omit<UserSecret, "id" | "userId" | "createdAt" | "updatedAt">
  >;
}) {
  try {
    const [updated] = await useDb()
      .update(userSecret)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(userSecret.id, id), userSecretScopeWhere(scope)))
      .returning();

    return updated ?? null;
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to update user secret"
    );
  }
}

/** Deletes a vault secret owned by the user. */
export async function deleteUserSecret({
  id,
  scope,
}: {
  id: string;
  scope: UserSecretScope;
}) {
  try {
    const [deleted] = await useDb()
      .delete(userSecret)
      .where(and(eq(userSecret.id, id), userSecretScopeWhere(scope)))
      .returning();

    return deleted ?? null;
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to delete user secret"
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

/**
 * Merges metadata fields into an existing upload without changing status.
 */
export async function mergeChatUploadMetadata({
  id,
  metadata,
}: {
  id: string;
  metadata: Partial<ChatUploadMetadata>;
}): Promise<ChatUpload | null> {
  const upload = await getChatUploadById({ id });
  if (!upload) {
    return null;
  }

  return updateChatUploadStatus({
    id,
    status: upload.status,
    metadata: { ...upload.metadata, ...metadata },
  });
}

/** Marks uploads as intended for Browserbase form use. */
export async function markUploadsUseInBrowser({
  uploadIds,
}: {
  uploadIds: string[];
}): Promise<void> {
  if (uploadIds.length === 0) {
    return;
  }

  const uploads = await Promise.all(
    uploadIds.map((uploadId) => getChatUploadById({ id: uploadId }))
  );

  await Promise.all(
    uploads
      .filter((upload): upload is ChatUpload => upload !== null)
      .map((upload) =>
        updateChatUploadStatus({
          id: upload.id,
          status: upload.status,
          metadata: { ...upload.metadata, useInBrowser: true },
        })
      )
  );
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

// User platform settings

/** Returns persisted platform settings for a user, if any. */
export async function getUserSettingsByUserId({
  userId,
}: {
  userId: string;
}): Promise<UserPlatformSettingsRow | null> {
  try {
    const [row] = await useDb()
      .select()
      .from(userPlatformSettings)
      .where(eq(userPlatformSettings.userId, userId))
      .limit(1);
    return row ?? null;
  } catch (_error) {
    throw new ChatbotError(
      "bad_request:database",
      "Failed to get user platform settings"
    );
  }
}

/** Creates or updates platform settings for a user. */
export async function upsertUserSettings({
  userId,
  browserIdleTimeoutSeconds,
}: {
  userId: string;
  browserIdleTimeoutSeconds: number;
}): Promise<UserPlatformSettingsRow> {
  try {
    const [row] = await useDb()
      .insert(userPlatformSettings)
      .values({
        userId,
        browserIdleTimeoutSeconds,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: userPlatformSettings.userId,
        set: {
          browserIdleTimeoutSeconds,
          updatedAt: new Date(),
        },
      })
      .returning();

    if (!row) {
      throw new ChatbotError(
        "bad_request:database",
        "Failed to save user platform settings"
      );
    }

    return row;
  } catch (error) {
    if (error instanceof ChatbotError) {
      throw error;
    }

    throw new ChatbotError(
      "bad_request:database",
      "Failed to save user platform settings"
    );
  }
}
