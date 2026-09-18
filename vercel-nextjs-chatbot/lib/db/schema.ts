import { type InferSelectModel, sql } from "drizzle-orm";
import {
  boolean,
  foreignKey,
  index,
  integer,
  json,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import type {
  InvoiceReviewConfig,
  InvoiceReviewEnabledChecks,
  InvoiceReviewTolerances,
} from "@/lib/invoice-review/types";
import type {
  MayoComparisonOutput,
  MayoDocumentCategory,
  MayoDocumentExtractionData,
  MayoDocumentStage,
  MayoRuleConfig,
  MayoUsage,
} from "@/lib/mayo/types";

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

/** Chat session mode: general e-Builder chat vs Trimble browser automation vs invoice review. */
export type ChatSessionType =
  | "general"
  | "trimble_automation"
  | "invoice_review";

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
  sessionType: varchar("sessionType", {
    enum: ["general", "trimble_automation", "invoice_review"],
  }),
  invoiceReviewConfig: json("invoiceReviewConfig").$type<InvoiceReviewConfig>(),
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
    kind: varchar("text", {
      enum: [
        "text",
        "code",
        "image",
        "sheet",
        "advisory-brief",
        "chart",
        "dashboard",
        "file-preview",
      ],
    })
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
  headers: json("headers")
    .$type<Record<string, string>>()
    .notNull()
    .default({}),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export type McpServer = InferSelectModel<typeof mcpServer>;

/**
 * User-defined agent skill (markdown instructions referenced via @slug in chat).
 * Scoped per signed-in user; injected into the system prompt when mentioned.
 */
export const agentSkill = pgTable(
  "AgentSkill",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    userId: uuid("userId")
      .notNull()
      .references(() => user.id),
    name: varchar("name", { length: 128 }).notNull(),
    slug: varchar("slug", { length: 64 }).notNull(),
    description: text("description"),
    content: text("content").notNull(),
    enabled: boolean("enabled").notNull().default(true),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  },
  (table) => ({
    userSlugUnique: uniqueIndex("AgentSkill_userId_slug_unique").on(
      table.userId,
      table.slug
    ),
    userIdx: index("AgentSkill_userId_idx").on(table.userId),
  })
);

export type AgentSkill = InferSelectModel<typeof agentSkill>;

/**
 * Invoice review persona — review style, default tolerances, and check toggles.
 * Selected at chat creation for Invoice Review Advisor sessions.
 */
export const persona = pgTable(
  "Persona",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    userId: uuid("userId")
      .notNull()
      .references(() => user.id),
    name: varchar("name", { length: 128 }).notNull(),
    slug: varchar("slug", { length: 64 }).notNull(),
    description: text("description"),
    instructions: text("instructions").notNull(),
    defaultTolerances: json("defaultTolerances")
      .$type<InvoiceReviewTolerances>()
      .notNull(),
    defaultEnabledChecks: json("defaultEnabledChecks")
      .$type<InvoiceReviewEnabledChecks>()
      .notNull(),
    enabled: boolean("enabled").notNull().default(true),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  },
  (table) => ({
    userSlugUnique: uniqueIndex("Persona_userId_slug_unique").on(
      table.userId,
      table.slug
    ),
    userIdx: index("Persona_userId_idx").on(table.userId),
  })
);

export type Persona = InferSelectModel<typeof persona>;

/**
 * Per-user secret vault entry (URL, username, password, API key, etc.).
 * Values are stored as plaintext for now; encryption can be added later
 * without changing the public reference-by-slug API.
 */
export const userSecret = pgTable(
  "UserSecret",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    userId: uuid("userId")
      .notNull()
      .references(() => user.id),
    name: varchar("name", { length: 128 }).notNull(),
    slug: varchar("slug", { length: 64 }).notNull(),
    kind: varchar("kind", {
      enum: ["password", "username", "url", "api_key", "other"],
    })
      .notNull()
      .default("other"),
    value: text("value").notNull(),
    description: text("description"),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  },
  (table) => ({
    userSlugUnique: uniqueIndex("UserSecret_userId_slug_unique").on(
      table.userId,
      table.slug
    ),
    userIdx: index("UserSecret_userId_idx").on(table.userId),
  })
);

export type UserSecret = InferSelectModel<typeof userSecret>;

/** Upload metadata stored alongside GCS objects. */
export type ChatUploadMetadata = {
  extractedTextPreview?: string;
  pageCount?: number;
  width?: number;
  height?: number;
  /** User marked this file for use in Browserbase form uploads. */
  useInBrowser?: boolean;
  /** Remote path inside the Browserbase session, e.g. /tmp/.uploads/resume.pdf */
  browserRemotePath?: string;
  /** Browserbase session id the file was last synced to. */
  browserSyncedSessionId?: string;
  /** ISO timestamp when the file was last synced to a browser session. */
  browserSyncedAt?: string;
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
    metadata: json("metadata")
      .$type<ChatUploadMetadata>()
      .notNull()
      .default({}),
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
    browserbaseSessionId: varchar("browserbaseSessionId", {
      length: 128,
    }).notNull(),
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

/** Per-user platform preferences (browser timeouts, etc.). */
export const userPlatformSettings = pgTable("UserPlatformSettings", {
  userId: uuid("userId")
    .primaryKey()
    .notNull()
    .references(() => user.id),
  browserIdleTimeoutSeconds: integer("browserIdleTimeoutSeconds")
    .notNull()
    .default(120),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export type UserPlatformSettingsRow = InferSelectModel<
  typeof userPlatformSettings
>;

/** A project/payment review workspace owned by a signed-in user. */
export const mayoCase = pgTable(
  "MayoCase",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    ownerUserId: uuid("ownerUserId")
      .notNull()
      .references(() => user.id),
    name: varchar("name", { length: 200 }).notNull(),
    projectName: varchar("projectName", { length: 200 }).notNull(),
    projectNumber: varchar("projectNumber", { length: 100 }),
    description: text("description"),
    status: varchar("status", {
      enum: ["active", "in_review", "completed", "archived"],
    })
      .notNull()
      .default("active"),
    openaiVectorStoreId: varchar("openaiVectorStoreId", { length: 128 }),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  },
  (table) => ({
    ownerUpdatedIdx: index("MayoCase_ownerUserId_updatedAt_idx").on(
      table.ownerUserId,
      table.updatedAt
    ),
    vectorStoreUnique: uniqueIndex("MayoCase_openaiVectorStoreId_unique").on(
      table.openaiVectorStoreId
    ),
  })
);

export type MayoCase = InferSelectModel<typeof mayoCase>;

export type MayoCaseMemberScopes = {
  documentCategories?: MayoDocumentCategory[];
  ruleFamilyIds?: string[];
};

/** Case-level access control. The creator is inserted as owner. */
export const mayoCaseMember = pgTable(
  "MayoCaseMember",
  {
    caseId: uuid("caseId")
      .notNull()
      .references(() => mayoCase.id, { onDelete: "cascade" }),
    userId: uuid("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: varchar("role", {
      enum: ["owner", "admin", "reviewer", "auditor"],
    }).notNull(),
    scopes: json("scopes").$type<MayoCaseMemberScopes>().notNull().default({}),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.caseId, table.userId] }),
    userIdx: index("MayoCaseMember_userId_idx").on(table.userId),
  })
);

export type MayoCaseMember = InferSelectModel<typeof mayoCaseMember>;

/** GCS-backed document and its OpenAI indexing lifecycle. */
export const mayoDocument = pgTable(
  "MayoDocument",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    caseId: uuid("caseId")
      .notNull()
      .references(() => mayoCase.id, { onDelete: "cascade" }),
    uploadedByUserId: uuid("uploadedByUserId")
      .notNull()
      .references(() => user.id),
    category: varchar("category", {
      enum: [
        "contract",
        "amendment",
        "pay_application",
        "invoice",
        "change_order",
        "prior_payment",
        "supporting_document",
        "ebuilder_export",
        "other",
      ],
    })
      .$type<MayoDocumentCategory>()
      .notNull(),
    stage: varchar("stage", {
      enum: ["draft", "final", "supporting"],
    })
      .$type<MayoDocumentStage>()
      .notNull()
      .default("supporting"),
    revision: integer("revision").notNull().default(1),
    paymentApplicationNumber: varchar("paymentApplicationNumber", {
      length: 100,
    }),
    originalFilename: text("originalFilename").notNull(),
    mimeType: varchar("mimeType", { length: 128 }).notNull(),
    sizeBytes: integer("sizeBytes").notNull(),
    bucket: varchar("bucket", { length: 255 }).notNull(),
    objectPath: text("objectPath").notNull(),
    checksumSha256: varchar("checksumSha256", { length: 64 }),
    status: varchar("status", {
      enum: ["uploading", "uploaded", "indexing", "ready", "failed", "deleted"],
    })
      .notNull()
      .default("uploading"),
    openaiFileId: varchar("openaiFileId", { length: 128 }),
    openaiVectorStoreFileId: varchar("openaiVectorStoreFileId", {
      length: 128,
    }),
    indexingError: text("indexingError"),
    uploadedAt: timestamp("uploadedAt").notNull().defaultNow(),
    indexedAt: timestamp("indexedAt"),
    deletedAt: timestamp("deletedAt"),
  },
  (table) => ({
    caseUploadedIdx: index("MayoDocument_caseId_uploadedAt_idx").on(
      table.caseId,
      table.uploadedAt
    ),
    caseChecksumUnique: uniqueIndex("MayoDocument_caseId_checksumSha256_unique")
      .on(table.caseId, table.checksumSha256)
      .where(sql`${table.status} <> 'deleted'`),
  })
);

export type MayoDocument = InferSelectModel<typeof mayoDocument>;

/** Strict Responses API extraction output for one source document. */
export const mayoDocumentExtraction = pgTable(
  "MayoDocumentExtraction",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    caseId: uuid("caseId")
      .notNull()
      .references(() => mayoCase.id, { onDelete: "cascade" }),
    documentId: uuid("documentId")
      .notNull()
      .references(() => mayoDocument.id, { onDelete: "cascade" }),
    status: varchar("status", {
      enum: ["pending", "processing", "completed", "needs_review", "failed"],
    })
      .notNull()
      .default("pending"),
    model: varchar("model", { length: 128 }).notNull(),
    promptVersion: varchar("promptVersion", { length: 64 }).notNull(),
    openaiResponseId: varchar("openaiResponseId", { length: 128 }),
    data: json("data").$type<MayoDocumentExtractionData>(),
    confidence: integer("confidence"),
    missingFields: json("missingFields")
      .$type<string[]>()
      .notNull()
      .default([]),
    usage: json("usage").$type<MayoUsage>(),
    errorMessage: text("errorMessage"),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  },
  (table) => ({
    documentUnique: uniqueIndex("MayoDocumentExtraction_documentId_unique").on(
      table.documentId
    ),
    caseIdx: index("MayoDocumentExtraction_caseId_idx").on(table.caseId),
  })
);

export type MayoDocumentExtraction = InferSelectModel<
  typeof mayoDocumentExtraction
>;

/** Administrative grouping for versioned Mayo rules. */
export const mayoRuleFamily = pgTable(
  "MayoRuleFamily",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    ownerUserId: uuid("ownerUserId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    code: varchar("code", { length: 64 }).notNull(),
    name: varchar("name", { length: 160 }).notNull(),
    description: text("description"),
    enabled: boolean("enabled").notNull().default(true),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  },
  (table) => ({
    ownerCodeUnique: uniqueIndex("MayoRuleFamily_ownerUserId_code_unique").on(
      table.ownerUserId,
      table.code
    ),
  })
);

export type MayoRuleFamily = InferSelectModel<typeof mayoRuleFamily>;

/** Immutable rule versions; creating an edit inserts the next version. */
export const mayoRule = pgTable(
  "MayoRule",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    familyId: uuid("familyId")
      .notNull()
      .references(() => mayoRuleFamily.id, { onDelete: "cascade" }),
    createdByUserId: uuid("createdByUserId")
      .notNull()
      .references(() => user.id),
    code: varchar("code", { length: 64 }).notNull(),
    name: varchar("name", { length: 160 }).notNull(),
    description: text("description").notNull(),
    kind: varchar("kind", {
      enum: ["deterministic", "semantic"],
    }).notNull(),
    severity: varchar("severity", {
      enum: ["info", "low", "medium", "high", "critical"],
    }).notNull(),
    enabled: boolean("enabled").notNull().default(true),
    config: json("config").$type<MayoRuleConfig>().notNull().default({}),
    version: integer("version").notNull().default(1),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (table) => ({
    familyCodeVersionUnique: uniqueIndex(
      "MayoRule_familyId_code_version_unique"
    ).on(table.familyId, table.code, table.version),
    familyIdx: index("MayoRule_familyId_idx").on(table.familyId),
  })
);

export type MayoRule = InferSelectModel<typeof mayoRule>;

/** One reproducible deterministic + semantic review execution. */
export const mayoReviewRun = pgTable(
  "MayoReviewRun",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    caseId: uuid("caseId")
      .notNull()
      .references(() => mayoCase.id, { onDelete: "cascade" }),
    requestedByUserId: uuid("requestedByUserId")
      .notNull()
      .references(() => user.id),
    status: varchar("status", {
      enum: ["queued", "running", "awaiting_review", "completed", "failed"],
    })
      .notNull()
      .default("queued"),
    model: varchar("model", { length: 128 }).notNull(),
    promptVersion: varchar("promptVersion", { length: 64 }).notNull(),
    ruleSnapshot: json("ruleSnapshot").$type<unknown[]>().notNull().default([]),
    sourceDocumentIds: json("sourceDocumentIds")
      .$type<string[]>()
      .notNull()
      .default([]),
    openaiResponseId: varchar("openaiResponseId", { length: 128 }),
    retrievalResults: json("retrievalResults").$type<unknown[]>().default([]),
    usage: json("usage").$type<MayoUsage>(),
    summary: text("summary"),
    errorMessage: text("errorMessage"),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    startedAt: timestamp("startedAt"),
    completedAt: timestamp("completedAt"),
  },
  (table) => ({
    caseCreatedIdx: index("MayoReviewRun_caseId_createdAt_idx").on(
      table.caseId,
      table.createdAt
    ),
  })
);

export type MayoReviewRun = InferSelectModel<typeof mayoReviewRun>;

/** Review exception requiring a human decision. */
export const mayoFinding = pgTable(
  "MayoFinding",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    caseId: uuid("caseId")
      .notNull()
      .references(() => mayoCase.id, { onDelete: "cascade" }),
    reviewRunId: uuid("reviewRunId")
      .notNull()
      .references(() => mayoReviewRun.id, { onDelete: "cascade" }),
    ruleId: uuid("ruleId").references(() => mayoRule.id),
    fingerprint: varchar("fingerprint", { length: 64 }).notNull(),
    ruleCode: varchar("ruleCode", { length: 64 }).notNull(),
    title: varchar("title", { length: 300 }).notNull(),
    description: text("description").notNull(),
    severity: varchar("severity", {
      enum: ["info", "low", "medium", "high", "critical"],
    }).notNull(),
    amountImpact: numeric("amountImpact", { precision: 18, scale: 2 }),
    confidence: integer("confidence").notNull(),
    source: varchar("source", {
      enum: ["deterministic", "semantic", "comparison"],
    }).notNull(),
    recommendation: text("recommendation").notNull(),
    status: varchar("status", {
      enum: ["open", "accepted", "rejected", "resolved", "carried_forward"],
    })
      .notNull()
      .default("open"),
    assignedReviewerId: uuid("assignedReviewerId").references(() => user.id),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  },
  (table) => ({
    caseFingerprintUnique: uniqueIndex(
      "MayoFinding_caseId_fingerprint_unique"
    ).on(table.caseId, table.fingerprint),
    caseStatusIdx: index("MayoFinding_caseId_status_idx").on(
      table.caseId,
      table.status
    ),
  })
);

export type MayoFinding = InferSelectModel<typeof mayoFinding>;

/** Excerpt-level evidence attached to a finding. */
export const mayoFindingEvidence = pgTable(
  "MayoFindingEvidence",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    findingId: uuid("findingId")
      .notNull()
      .references(() => mayoFinding.id, { onDelete: "cascade" }),
    documentId: uuid("documentId").references(() => mayoDocument.id, {
      onDelete: "set null",
    }),
    openaiFileId: varchar("openaiFileId", { length: 128 }),
    filename: text("filename").notNull(),
    excerpt: text("excerpt").notNull(),
    pageNumber: integer("pageNumber"),
    pageNumberVerified: boolean("pageNumberVerified").notNull().default(false),
    coordinates: json("coordinates").$type<null>().default(null),
    relevanceScore: numeric("relevanceScore", { precision: 6, scale: 5 }),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (table) => ({
    findingIdx: index("MayoFindingEvidence_findingId_idx").on(table.findingId),
  })
);

export type MayoFindingEvidence = InferSelectModel<typeof mayoFindingEvidence>;

/** Immutable history of reviewer actions on findings. */
export const mayoReviewerDecision = pgTable(
  "MayoReviewerDecision",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    findingId: uuid("findingId")
      .notNull()
      .references(() => mayoFinding.id, { onDelete: "cascade" }),
    userId: uuid("userId")
      .notNull()
      .references(() => user.id),
    decision: varchar("decision", {
      enum: [
        "accepted",
        "rejected",
        "resolved",
        "commented",
        "reopened",
        "assigned",
      ],
    }).notNull(),
    comment: text("comment"),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (table) => ({
    findingCreatedIdx: index("MayoReviewerDecision_findingId_createdAt_idx").on(
      table.findingId,
      table.createdAt
    ),
  })
);

export type MayoReviewerDecision = InferSelectModel<
  typeof mayoReviewerDecision
>;

/** Draft-versus-final comparison generated by Responses API. */
export const mayoDraftComparison = pgTable(
  "MayoDraftComparison",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    caseId: uuid("caseId")
      .notNull()
      .references(() => mayoCase.id, { onDelete: "cascade" }),
    draftDocumentId: uuid("draftDocumentId")
      .notNull()
      .references(() => mayoDocument.id),
    finalDocumentId: uuid("finalDocumentId")
      .notNull()
      .references(() => mayoDocument.id),
    createdByUserId: uuid("createdByUserId")
      .notNull()
      .references(() => user.id),
    model: varchar("model", { length: 128 }).notNull(),
    promptVersion: varchar("promptVersion", { length: 64 }).notNull(),
    status: varchar("status", {
      enum: ["queued", "running", "completed", "failed"],
    })
      .notNull()
      .default("queued"),
    openaiResponseId: varchar("openaiResponseId", { length: 128 }),
    usage: json("usage").$type<MayoUsage>(),
    summary: text("summary"),
    data: json("data").$type<MayoComparisonOutput>(),
    errorMessage: text("errorMessage"),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    completedAt: timestamp("completedAt"),
  },
  (table) => ({
    caseCreatedIdx: index("MayoDraftComparison_caseId_createdAt_idx").on(
      table.caseId,
      table.createdAt
    ),
  })
);

export type MayoDraftComparison = InferSelectModel<typeof mayoDraftComparison>;

/** eBuilder import/export attempt and normalized payload. */
export const mayoIntegrationSync = pgTable(
  "MayoIntegrationSync",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    caseId: uuid("caseId")
      .notNull()
      .references(() => mayoCase.id, { onDelete: "cascade" }),
    requestedByUserId: uuid("requestedByUserId")
      .notNull()
      .references(() => user.id),
    provider: varchar("provider", { length: 64 }).notNull().default("ebuilder"),
    direction: varchar("direction", {
      enum: ["import", "export"],
    })
      .notNull()
      .default("import"),
    status: varchar("status", {
      enum: ["queued", "running", "completed", "failed"],
    })
      .notNull()
      .default("queued"),
    request: json("request").$type<Record<string, unknown>>().notNull(),
    result: json("result").$type<unknown>(),
    errorMessage: text("errorMessage"),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    completedAt: timestamp("completedAt"),
  },
  (table) => ({
    caseCreatedIdx: index("MayoIntegrationSync_caseId_createdAt_idx").on(
      table.caseId,
      table.createdAt
    ),
  })
);

export type MayoIntegrationSync = InferSelectModel<typeof mayoIntegrationSync>;

/** Append-only case audit trail. */
export const mayoAuditEvent = pgTable(
  "MayoAuditEvent",
  {
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    caseId: uuid("caseId")
      .notNull()
      .references(() => mayoCase.id, { onDelete: "cascade" }),
    actorUserId: uuid("actorUserId").references(() => user.id),
    eventType: varchar("eventType", { length: 100 }).notNull(),
    entityType: varchar("entityType", { length: 100 }).notNull(),
    entityId: varchar("entityId", { length: 128 }),
    metadata: json("metadata")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (table) => ({
    caseCreatedIdx: index("MayoAuditEvent_caseId_createdAt_idx").on(
      table.caseId,
      table.createdAt
    ),
  })
);

export type MayoAuditEvent = InferSelectModel<typeof mayoAuditEvent>;
