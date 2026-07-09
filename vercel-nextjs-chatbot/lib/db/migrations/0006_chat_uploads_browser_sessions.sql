CREATE TABLE IF NOT EXISTS "ChatUpload" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chatId" uuid NOT NULL,
	"userId" uuid NOT NULL,
	"messageId" uuid,
	"originalFilename" text NOT NULL,
	"mimeType" varchar(128) NOT NULL,
	"sizeBytes" integer NOT NULL,
	"bucket" varchar(255) NOT NULL,
	"objectPath" text NOT NULL,
	"isPublic" boolean DEFAULT false NOT NULL,
	"category" varchar NOT NULL,
	"status" varchar DEFAULT 'uploading' NOT NULL,
	"checksumSha256" varchar(64),
	"metadata" json DEFAULT '{}'::json NOT NULL,
	"uploadedAt" timestamp DEFAULT now() NOT NULL,
	"deletedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ChatBrowserSession" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chatId" uuid NOT NULL,
	"userId" uuid NOT NULL,
	"browserbaseSessionId" varchar(128) NOT NULL,
	"status" varchar DEFAULT 'starting' NOT NULL,
	"title" text,
	"startedUrl" text,
	"lastKnownUrl" text,
	"liveViewUrl" text,
	"replayUrl" text NOT NULL,
	"messageId" uuid,
	"toolCallId" varchar(128),
	"startedAt" timestamp DEFAULT now() NOT NULL,
	"endedAt" timestamp,
	"lastActivityAt" timestamp DEFAULT now() NOT NULL,
	"durationSeconds" integer,
	"errorMessage" text,
	"metadata" json DEFAULT '{}'::json NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ChatUpload" ADD CONSTRAINT "ChatUpload_chatId_Chat_id_fk" FOREIGN KEY ("chatId") REFERENCES "public"."Chat"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ChatUpload" ADD CONSTRAINT "ChatUpload_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ChatUpload" ADD CONSTRAINT "ChatUpload_messageId_Message_v2_id_fk" FOREIGN KEY ("messageId") REFERENCES "public"."Message_v2"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ChatBrowserSession" ADD CONSTRAINT "ChatBrowserSession_chatId_Chat_id_fk" FOREIGN KEY ("chatId") REFERENCES "public"."Chat"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ChatBrowserSession" ADD CONSTRAINT "ChatBrowserSession_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ChatBrowserSession" ADD CONSTRAINT "ChatBrowserSession_messageId_Message_v2_id_fk" FOREIGN KEY ("messageId") REFERENCES "public"."Message_v2"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ChatUpload_chatId_uploadedAt_idx" ON "ChatUpload" USING btree ("chatId","uploadedAt");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ChatUpload_userId_idx" ON "ChatUpload" USING btree ("userId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ChatBrowserSession_chatId_startedAt_idx" ON "ChatBrowserSession" USING btree ("chatId","startedAt");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ChatBrowserSession_browserbaseSessionId_unique" ON "ChatBrowserSession" USING btree ("browserbaseSessionId");
