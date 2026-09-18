CREATE TABLE IF NOT EXISTS "MayoCase" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "ownerUserId" uuid NOT NULL REFERENCES "User"("id"),
  "name" varchar(200) NOT NULL,
  "projectName" varchar(200) NOT NULL,
  "projectNumber" varchar(100),
  "description" text,
  "status" varchar DEFAULT 'active' NOT NULL,
  "openaiVectorStoreId" varchar(128),
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "MayoCase_ownerUserId_updatedAt_idx"
  ON "MayoCase" ("ownerUserId", "updatedAt");
CREATE UNIQUE INDEX IF NOT EXISTS "MayoCase_openaiVectorStoreId_unique"
  ON "MayoCase" ("openaiVectorStoreId");

CREATE TABLE IF NOT EXISTS "MayoCaseMember" (
  "caseId" uuid NOT NULL REFERENCES "MayoCase"("id") ON DELETE CASCADE,
  "userId" uuid NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "role" varchar NOT NULL,
  "scopes" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "MayoCaseMember_caseId_userId_pk" PRIMARY KEY ("caseId", "userId")
);

CREATE INDEX IF NOT EXISTS "MayoCaseMember_userId_idx"
  ON "MayoCaseMember" ("userId");

CREATE TABLE IF NOT EXISTS "MayoDocument" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "caseId" uuid NOT NULL REFERENCES "MayoCase"("id") ON DELETE CASCADE,
  "uploadedByUserId" uuid NOT NULL REFERENCES "User"("id"),
  "category" varchar NOT NULL,
  "stage" varchar DEFAULT 'supporting' NOT NULL,
  "revision" integer DEFAULT 1 NOT NULL,
  "paymentApplicationNumber" varchar(100),
  "originalFilename" text NOT NULL,
  "mimeType" varchar(128) NOT NULL,
  "sizeBytes" integer NOT NULL,
  "bucket" varchar(255) NOT NULL,
  "objectPath" text NOT NULL,
  "checksumSha256" varchar(64),
  "status" varchar DEFAULT 'uploading' NOT NULL,
  "openaiFileId" varchar(128),
  "openaiVectorStoreFileId" varchar(128),
  "indexingError" text,
  "uploadedAt" timestamp DEFAULT now() NOT NULL,
  "indexedAt" timestamp,
  "deletedAt" timestamp
);

CREATE INDEX IF NOT EXISTS "MayoDocument_caseId_uploadedAt_idx"
  ON "MayoDocument" ("caseId", "uploadedAt");
CREATE UNIQUE INDEX IF NOT EXISTS "MayoDocument_caseId_checksumSha256_unique"
  ON "MayoDocument" ("caseId", "checksumSha256")
  WHERE "status" <> 'deleted';

CREATE TABLE IF NOT EXISTS "MayoDocumentExtraction" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "caseId" uuid NOT NULL REFERENCES "MayoCase"("id") ON DELETE CASCADE,
  "documentId" uuid NOT NULL REFERENCES "MayoDocument"("id") ON DELETE CASCADE,
  "status" varchar DEFAULT 'pending' NOT NULL,
  "model" varchar(128) NOT NULL,
  "promptVersion" varchar(64) NOT NULL,
  "openaiResponseId" varchar(128),
  "data" jsonb,
  "confidence" integer,
  "missingFields" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "usage" jsonb,
  "errorMessage" text,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "MayoDocumentExtraction_documentId_unique"
  ON "MayoDocumentExtraction" ("documentId");
CREATE INDEX IF NOT EXISTS "MayoDocumentExtraction_caseId_idx"
  ON "MayoDocumentExtraction" ("caseId");

CREATE TABLE IF NOT EXISTS "MayoRuleFamily" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "ownerUserId" uuid NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "code" varchar(64) NOT NULL,
  "name" varchar(160) NOT NULL,
  "description" text,
  "enabled" boolean DEFAULT true NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "MayoRuleFamily_ownerUserId_code_unique"
  ON "MayoRuleFamily" ("ownerUserId", "code");

CREATE TABLE IF NOT EXISTS "MayoRule" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "familyId" uuid NOT NULL REFERENCES "MayoRuleFamily"("id") ON DELETE CASCADE,
  "createdByUserId" uuid NOT NULL REFERENCES "User"("id"),
  "code" varchar(64) NOT NULL,
  "name" varchar(160) NOT NULL,
  "description" text NOT NULL,
  "kind" varchar NOT NULL,
  "severity" varchar NOT NULL,
  "enabled" boolean DEFAULT true NOT NULL,
  "config" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "version" integer DEFAULT 1 NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "MayoRule_familyId_code_version_unique"
  ON "MayoRule" ("familyId", "code", "version");
CREATE INDEX IF NOT EXISTS "MayoRule_familyId_idx"
  ON "MayoRule" ("familyId");

CREATE TABLE IF NOT EXISTS "MayoReviewRun" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "caseId" uuid NOT NULL REFERENCES "MayoCase"("id") ON DELETE CASCADE,
  "requestedByUserId" uuid NOT NULL REFERENCES "User"("id"),
  "status" varchar DEFAULT 'queued' NOT NULL,
  "model" varchar(128) NOT NULL,
  "promptVersion" varchar(64) NOT NULL,
  "ruleSnapshot" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "sourceDocumentIds" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "openaiResponseId" varchar(128),
  "retrievalResults" jsonb DEFAULT '[]'::jsonb,
  "usage" jsonb,
  "summary" text,
  "errorMessage" text,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "startedAt" timestamp,
  "completedAt" timestamp
);

CREATE INDEX IF NOT EXISTS "MayoReviewRun_caseId_createdAt_idx"
  ON "MayoReviewRun" ("caseId", "createdAt");

CREATE TABLE IF NOT EXISTS "MayoFinding" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "caseId" uuid NOT NULL REFERENCES "MayoCase"("id") ON DELETE CASCADE,
  "reviewRunId" uuid NOT NULL REFERENCES "MayoReviewRun"("id") ON DELETE CASCADE,
  "ruleId" uuid REFERENCES "MayoRule"("id"),
  "fingerprint" varchar(64) NOT NULL,
  "ruleCode" varchar(64) NOT NULL,
  "title" varchar(300) NOT NULL,
  "description" text NOT NULL,
  "severity" varchar NOT NULL,
  "amountImpact" numeric(18, 2),
  "confidence" integer NOT NULL,
  "source" varchar NOT NULL,
  "recommendation" text NOT NULL,
  "status" varchar DEFAULT 'open' NOT NULL,
  "assignedReviewerId" uuid REFERENCES "User"("id"),
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "MayoFinding_caseId_fingerprint_unique"
  ON "MayoFinding" ("caseId", "fingerprint");
CREATE INDEX IF NOT EXISTS "MayoFinding_caseId_status_idx"
  ON "MayoFinding" ("caseId", "status");

CREATE TABLE IF NOT EXISTS "MayoFindingEvidence" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "findingId" uuid NOT NULL REFERENCES "MayoFinding"("id") ON DELETE CASCADE,
  "documentId" uuid REFERENCES "MayoDocument"("id") ON DELETE SET NULL,
  "openaiFileId" varchar(128),
  "filename" text NOT NULL,
  "excerpt" text NOT NULL,
  "pageNumber" integer,
  "pageNumberVerified" boolean DEFAULT false NOT NULL,
  "coordinates" jsonb DEFAULT null,
  "relevanceScore" numeric(6, 5),
  "createdAt" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "MayoFindingEvidence_findingId_idx"
  ON "MayoFindingEvidence" ("findingId");

CREATE TABLE IF NOT EXISTS "MayoReviewerDecision" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "findingId" uuid NOT NULL REFERENCES "MayoFinding"("id") ON DELETE CASCADE,
  "userId" uuid NOT NULL REFERENCES "User"("id"),
  "decision" varchar NOT NULL,
  "comment" text,
  "createdAt" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "MayoReviewerDecision_findingId_createdAt_idx"
  ON "MayoReviewerDecision" ("findingId", "createdAt");

CREATE TABLE IF NOT EXISTS "MayoDraftComparison" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "caseId" uuid NOT NULL REFERENCES "MayoCase"("id") ON DELETE CASCADE,
  "draftDocumentId" uuid NOT NULL REFERENCES "MayoDocument"("id"),
  "finalDocumentId" uuid NOT NULL REFERENCES "MayoDocument"("id"),
  "createdByUserId" uuid NOT NULL REFERENCES "User"("id"),
  "model" varchar(128) NOT NULL,
  "promptVersion" varchar(64) NOT NULL,
  "status" varchar DEFAULT 'queued' NOT NULL,
  "openaiResponseId" varchar(128),
  "usage" jsonb,
  "summary" text,
  "data" jsonb,
  "errorMessage" text,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "completedAt" timestamp
);

CREATE INDEX IF NOT EXISTS "MayoDraftComparison_caseId_createdAt_idx"
  ON "MayoDraftComparison" ("caseId", "createdAt");

CREATE TABLE IF NOT EXISTS "MayoIntegrationSync" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "caseId" uuid NOT NULL REFERENCES "MayoCase"("id") ON DELETE CASCADE,
  "requestedByUserId" uuid NOT NULL REFERENCES "User"("id"),
  "provider" varchar(64) DEFAULT 'ebuilder' NOT NULL,
  "direction" varchar DEFAULT 'import' NOT NULL,
  "status" varchar DEFAULT 'queued' NOT NULL,
  "request" jsonb NOT NULL,
  "result" jsonb,
  "errorMessage" text,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "completedAt" timestamp
);

CREATE INDEX IF NOT EXISTS "MayoIntegrationSync_caseId_createdAt_idx"
  ON "MayoIntegrationSync" ("caseId", "createdAt");

CREATE TABLE IF NOT EXISTS "MayoAuditEvent" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "caseId" uuid NOT NULL REFERENCES "MayoCase"("id") ON DELETE CASCADE,
  "actorUserId" uuid REFERENCES "User"("id"),
  "eventType" varchar(100) NOT NULL,
  "entityType" varchar(100) NOT NULL,
  "entityId" varchar(128),
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "MayoAuditEvent_caseId_createdAt_idx"
  ON "MayoAuditEvent" ("caseId", "createdAt");
