import type { InferSelectModel } from "drizzle-orm";
import {
  boolean,
  foreignKey,
  index,
  integer,
  json,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const user = pgTable(
  "User",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    email: varchar("email", { length: 255 }).notNull(),
    password: varchar("password", { length: 255 }),
    name: text("name"),
    emailVerified: boolean("emailVerified").notNull().default(false),
    image: text("image"),
    isAnonymous: boolean("isAnonymous").notNull().default(false),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  },
  (table) => ({
    emailUnique: uniqueIndex("User_email_unique").on(table.email),
  })
);

export type User = InferSelectModel<typeof user>;

export const chat = pgTable("Chat", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  createdAt: timestamp("createdAt").notNull(),
  title: text("title").notNull(),
  userId: uuid("userId")
    .notNull()
    .references(() => user.id),
  visibility: varchar("visibility", { enum: ["public", "private"] })
    .notNull()
    .default("private"),
});

export type Chat = InferSelectModel<typeof chat>;

export const message = pgTable("Message_v2", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  chatId: uuid("chatId")
    .notNull()
    .references(() => chat.id),
  role: varchar("role").notNull(),
  parts: json("parts").notNull(),
  attachments: json("attachments").notNull(),
  createdAt: timestamp("createdAt").notNull(),
});

export type DBMessage = InferSelectModel<typeof message>;

export const vote = pgTable(
  "Vote_v2",
  {
    chatId: uuid("chatId")
      .notNull()
      .references(() => chat.id),
    messageId: uuid("messageId")
      .notNull()
      .references(() => message.id),
    isUpvoted: boolean("isUpvoted").notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.chatId, table.messageId] }),
  })
);

export type Vote = InferSelectModel<typeof vote>;

export const document = pgTable(
  "Document",
  {
    id: uuid("id").notNull().defaultRandom(),
    createdAt: timestamp("createdAt").notNull(),
    title: text("title").notNull(),
    content: text("content"),
    kind: varchar("text", { enum: ["text", "code", "image", "sheet"] })
      .notNull()
      .default("text"),
    userId: uuid("userId")
      .notNull()
      .references(() => user.id),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.id, table.createdAt] }),
  })
);

export type Document = InferSelectModel<typeof document>;

export const suggestion = pgTable(
  "Suggestion",
  {
    id: uuid("id").notNull().defaultRandom(),
    documentId: uuid("documentId").notNull(),
    documentCreatedAt: timestamp("documentCreatedAt").notNull(),
    originalText: text("originalText").notNull(),
    suggestedText: text("suggestedText").notNull(),
    description: text("description"),
    isResolved: boolean("isResolved").notNull().default(false),
    userId: uuid("userId")
      .notNull()
      .references(() => user.id),
    createdAt: timestamp("createdAt").notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    documentRef: foreignKey({
      columns: [table.documentId, table.documentCreatedAt],
      foreignColumns: [document.id, document.createdAt],
    }),
  })
);

export type Suggestion = InferSelectModel<typeof suggestion>;

export const stream = pgTable(
  "Stream",
  {
    id: uuid("id").notNull().defaultRandom(),
    chatId: uuid("chatId").notNull(),
    createdAt: timestamp("createdAt").notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    chatRef: foreignKey({
      columns: [table.chatId],
      foreignColumns: [chat.id],
    }),
  })
);

export type Stream = InferSelectModel<typeof stream>;

/**
 * MCP server connection (HTTP, SSE, or local stdio).
 * When userId is null the server is shared by all guest (unauthenticated) visitors.
 */
export const mcpServer = pgTable("McpServer", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  userId: uuid("userId").references(() => user.id),
  name: varchar("name", { length: 128 }).notNull(),
  description: text("description"),
  transport: varchar("transport", { enum: ["http", "sse", "stdio"] }).notNull(),
  url: text("url"),
  command: text("command"),
  args: json("args").$type<string[]>().notNull().default([]),
  env: json("env").$type<Record<string, string>>().notNull().default({}),
  headers: json("headers").$type<Record<string, string>>().notNull().default({}),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export type McpServer = InferSelectModel<typeof mcpServer>;

/** Upload metadata stored alongside GCS objects. */
export type ChatUploadMetadata = {
  extractedTextPreview?: string;
  pageCount?: number;
  width?: number;
  height?: number;
};

/**
 * User-uploaded files scoped to a chat conversation.
 * Objects live in GCS; this table stores metadata and access control.
 */
export const chatUpload = pgTable(
  "ChatUpload",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    chatId: uuid("chatId")
      .notNull()
      .references(() => chat.id),
    userId: uuid("userId")
      .notNull()
      .references(() => user.id),
    messageId: uuid("messageId").references(() => message.id),
    originalFilename: text("originalFilename").notNull(),
    mimeType: varchar("mimeType", { length: 128 }).notNull(),
    sizeBytes: integer("sizeBytes").notNull(),
    bucket: varchar("bucket", { length: 255 }).notNull(),
    objectPath: text("objectPath").notNull(),
    isPublic: boolean("isPublic").notNull().default(false),
    category: varchar("category", { enum: ["image", "document"] }).notNull(),
    status: varchar("status", {
      enum: ["uploading", "ready", "failed", "deleted"],
    })
      .notNull()
      .default("uploading"),
    checksumSha256: varchar("checksumSha256", { length: 64 }),
    metadata: json("metadata").$type<ChatUploadMetadata>().notNull().default({}),
    uploadedAt: timestamp("uploadedAt").notNull().defaultNow(),
    deletedAt: timestamp("deletedAt"),
  },
  (table) => ({
    chatUploadedAtIdx: index("ChatUpload_chatId_uploadedAt_idx").on(
      table.chatId,
      table.uploadedAt
    ),
    userIdx: index("ChatUpload_userId_idx").on(table.userId),
  })
);

export type ChatUpload = InferSelectModel<typeof chatUpload>;

/** Browserbase session metadata persisted per chat. */
export type ChatBrowserSessionMetadata = {
  toolsUsed?: string[];
  stepCount?: number;
  pagesVisited?: number;
};

/**
 * Cloud browser session history for a chat.
 * Runtime Stagehand handles remain in-memory; this table stores durable metadata.
 */
export const chatBrowserSession = pgTable(
  "ChatBrowserSession",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    chatId: uuid("chatId")
      .notNull()
      .references(() => chat.id),
    userId: uuid("userId")
      .notNull()
      .references(() => user.id),
    browserbaseSessionId: varchar("browserbaseSessionId", { length: 128 }).notNull(),
    status: varchar("status", {
      enum: ["starting", "running", "ended", "error"],
    })
      .notNull()
      .default("starting"),
    title: text("title"),
    startedUrl: text("startedUrl"),
    lastKnownUrl: text("lastKnownUrl"),
    liveViewUrl: text("liveViewUrl"),
    replayUrl: text("replayUrl").notNull(),
    messageId: uuid("messageId").references(() => message.id),
    toolCallId: varchar("toolCallId", { length: 128 }),
    startedAt: timestamp("startedAt").notNull().defaultNow(),
    endedAt: timestamp("endedAt"),
    lastActivityAt: timestamp("lastActivityAt").notNull().defaultNow(),
    durationSeconds: integer("durationSeconds"),
    errorMessage: text("errorMessage"),
    metadata: json("metadata")
      .$type<ChatBrowserSessionMetadata>()
      .notNull()
      .default({}),
  },
  (table) => ({
    chatStartedAtIdx: index("ChatBrowserSession_chatId_startedAt_idx").on(
      table.chatId,
      table.startedAt
    ),
    browserbaseSessionUnique: uniqueIndex(
      "ChatBrowserSession_browserbaseSessionId_unique"
    ).on(table.browserbaseSessionId),
  })
);

export type ChatBrowserSession = InferSelectModel<typeof chatBrowserSession>;
