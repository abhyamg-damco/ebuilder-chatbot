"use client";

import { FileIcon, LoaderIcon, UploadIcon } from "lucide-react";
import {
  type ChangeEvent,
  useCallback,
  useRef,
  useState,
} from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AgentSkillPublic } from "@/lib/skills/types";
import { FILE_ACCEPT } from "@/lib/storage/mime";
import {
  TRIMBLE_DEFAULT_CREDENTIALS,
  TRIMBLE_SECRET_SLUGS,
} from "@/lib/secrets/trimble";
import type { Attachment } from "@/lib/types";
import { fetcher } from "@/lib/utils";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export { TRIMBLE_SECRET_SLUGS };

type SkillsResponse = {
  skills: AgentSkillPublic[];
};

type TrimbleSetupFormProps = {
  chatId: string;
  visibilityType: "public" | "private";
  attachments: Attachment[];
  setAttachments: React.Dispatch<React.SetStateAction<Attachment[]>>;
  onProceed: (result: {
    skill: AgentSkillPublic;
    secretIds: string[];
  }) => void | Promise<void>;
};

/**
 * Gated Trimble automation setup: files, site credentials, and skill.
 * Proceed is enabled only when all three sections are complete.
 */
export function TrimbleSetupForm({
  chatId,
  visibilityType,
  attachments,
  setAttachments,
  onProceed,
}: TrimbleSetupFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadQueue, setUploadQueue] = useState<string[]>([]);
  const [websiteUrl, setWebsiteUrl] = useState<string>(
    TRIMBLE_DEFAULT_CREDENTIALS.websiteUrl
  );
  const [username, setUsername] = useState<string>(
    TRIMBLE_DEFAULT_CREDENTIALS.username
  );
  const [password, setPassword] = useState<string>(
    TRIMBLE_DEFAULT_CREDENTIALS.password
  );
  const [skillId, setSkillId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: skillsData, isLoading: skillsLoading } = useSWR<SkillsResponse>(
    `${basePath}/api/skills`,
    fetcher
  );

  const enabledSkills = (skillsData?.skills ?? []).filter((s) => s.enabled);

  const uploadFile = useCallback(
    async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("chatId", chatId);
      formData.append("visibility", visibilityType);
      formData.append("sessionType", "trimble_automation");

      try {
        const response = await fetch(`${basePath}/api/files/upload`, {
          method: "POST",
          body: formData,
        });

        if (response.ok) {
          const data = await response.json();
          const attachment: Attachment = {
            id: data.id as string,
            url: data.url as string,
            name: (data.originalFilename ?? data.pathname) as string,
            contentType: data.contentType as string,
            expiresAt: data.expiresAt,
            category: data.category,
            sizeBytes: data.sizeBytes,
            useInBrowser: true,
          };
          return attachment;
        }
        const { error } = await response.json();
        toast.error(error ?? "Upload failed");
      } catch {
        toast.error("Failed to upload file, please try again!");
      }
    },
    [chatId, visibilityType]
  );

  const handleFileChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files || []);
      if (files.length === 0) {
        return;
      }

      setUploadQueue(files.map((file) => file.name));

      try {
        const uploaded = await Promise.all(files.map((file) => uploadFile(file)));
        const ok = uploaded.filter(
          (attachment): attachment is Attachment => attachment !== undefined
        );
        setAttachments((current) => [...current, ...ok]);
      } catch {
        toast.error("Failed to upload files");
      } finally {
        setUploadQueue([]);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    },
    [setAttachments, uploadFile]
  );

  const canProceed =
    attachments.length > 0 &&
    uploadQueue.length === 0 &&
    websiteUrl.trim().length > 0 &&
    username.trim().length > 0 &&
    password.length > 0 &&
    skillId.length > 0 &&
    !isSubmitting;

  const upsertSecret = async (payload: {
    name: string;
    slug: string;
    kind: "url" | "username" | "password";
    value: string;
  }) => {
    const response = await fetch(`${basePath}/api/secrets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, upsert: true }),
    });

    if (!response.ok) {
      throw new Error(`Failed to save secret ${payload.slug}`);
    }

    const data = (await response.json()) as { secret: { id: string } };
    return data.secret.id;
  };

  const handleProceed = async () => {
    if (!canProceed) {
      return;
    }

    const skill = enabledSkills.find((s) => s.id === skillId);
    if (!skill) {
      toast.error("Select a skill to continue");
      return;
    }

    setIsSubmitting(true);

    try {
      const secretIds = await Promise.all([
        upsertSecret({
          name: "Trimble site URL",
          slug: TRIMBLE_SECRET_SLUGS.url,
          kind: "url",
          value: websiteUrl.trim(),
        }),
        upsertSecret({
          name: "Trimble username",
          slug: TRIMBLE_SECRET_SLUGS.username,
          kind: "username",
          value: username.trim(),
        }),
        upsertSecret({
          name: "Trimble password",
          slug: TRIMBLE_SECRET_SLUGS.password,
          kind: "password",
          value: password,
        }),
      ]);

      await onProceed({ skill, secretIds });
    } catch {
      toast.error("Failed to save credentials. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-5 px-4 py-2">
      <div className="space-y-1 text-center">
        <h2 className="font-semibold text-xl tracking-tight">
          Trimble automation setup
        </h2>
        <p className="text-muted-foreground text-sm">
          Upload files, enter site login details, and pick a skill. Then proceed
          to start the chat.
        </p>
      </div>

      <div className="space-y-4 rounded-xl border border-border/60 bg-card/50 p-5">
        <div className="space-y-2">
          <Label>1. Upload files</Label>
          <input
            accept={FILE_ACCEPT}
            className="hidden"
            multiple
            onChange={handleFileChange}
            ref={fileInputRef}
            type="file"
          />
          <Button
            className="w-full"
            onClick={() => fileInputRef.current?.click()}
            type="button"
            variant="outline"
          >
            <UploadIcon className="size-4" />
            Choose files
          </Button>
          {(attachments.length > 0 || uploadQueue.length > 0) && (
            <ul className="space-y-1.5 pt-1">
              {attachments.map((file) => (
                <li
                  className="flex items-center gap-2 text-muted-foreground text-xs"
                  key={file.id ?? file.url}
                >
                  <FileIcon className="size-3.5 shrink-0" />
                  <span className="truncate">{file.name}</span>
                </li>
              ))}
              {uploadQueue.map((name) => (
                <li
                  className="flex items-center gap-2 text-muted-foreground text-xs"
                  key={`q-${name}`}
                >
                  <LoaderIcon className="size-3.5 shrink-0 animate-spin" />
                  <span className="truncate">Uploading {name}…</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="trimble-url">2. Website URL</Label>
          <Input
            id="trimble-url"
            onChange={(e) => setWebsiteUrl(e.target.value)}
            placeholder="https://…"
            required
            type="url"
            value={websiteUrl}
          />
          <Label htmlFor="trimble-username">Username</Label>
          <Input
            autoComplete="username"
            id="trimble-username"
            onChange={(e) => setUsername(e.target.value)}
            required
            value={username}
          />
          <Label htmlFor="trimble-password">Password</Label>
          <Input
            autoComplete="current-password"
            id="trimble-password"
            onChange={(e) => setPassword(e.target.value)}
            required
            type="password"
            value={password}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="trimble-skill">3. Skill</Label>
          <Select
            disabled={skillsLoading || enabledSkills.length === 0}
            onValueChange={setSkillId}
            value={skillId || undefined}
          >
            <SelectTrigger id="trimble-skill">
              <SelectValue
                placeholder={
                  skillsLoading
                    ? "Loading skills…"
                    : enabledSkills.length === 0
                      ? "No enabled skills — create one in Settings"
                      : "Select a skill"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {enabledSkills.map((skill) => (
                <SelectItem key={skill.id} value={skill.id}>
                  {skill.name} (@{skill.slug})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button
        className="w-full"
        disabled={!canProceed}
        onClick={handleProceed}
        type="button"
      >
        {isSubmitting ? "Starting…" : "Proceed"}
      </Button>
    </div>
  );
}

/** Builds the first user message text for a Trimble session (no raw secrets). */
export function buildTrimbleKickoffText(skillSlug: string): string {
  return [
    `Start Trimble automation using skill @${skillSlug}.`,
    `Website: @secret:${TRIMBLE_SECRET_SLUGS.url}.`,
    `Username: @secret:${TRIMBLE_SECRET_SLUGS.username}.`,
    `Password: @secret:${TRIMBLE_SECRET_SLUGS.password}.`,
    "Uploaded files are marked for browser use — sync and attach them per the skill.",
  ].join(" ");
}
