export const MAYO_ONEAGENT_BOT = {
  id: "mayo-oneagent",
  name: "Mayo OneAgent",
  route: "/mayo",
  description:
    "Payment-application review against contracts, changes, prior draws, and eBuilder evidence.",
  api: "responses",
  authoritativeFileStore: "gcs",
  retrieval: "openai-file-search",
  requiresHumanReview: true,
} as const;
