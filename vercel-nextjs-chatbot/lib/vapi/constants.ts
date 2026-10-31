/** Display name for the Vapi floating assistant on the new-chat screen. */
export const VAPI_WEEKLY_STATUS_BOT_TITLE = "ebuilder weekly status AI bot";

/** Short label for the launcher control (avoids a cramped floating pill). */
export const VAPI_WEEKLY_STATUS_CTA_TITLE = "Weekly status assistant";

/** Subtitle under the launcher label. */
export const VAPI_WEEKLY_STATUS_CTA_SUBTITLE = "Voice or chat · eBuilder";

/** Returns true when the pathname is the app home (new chat), not /chat/:id or /insights. */
export function isNewChatHomePath(pathname: string, basePath: string): boolean {
  const home = basePath.length > 0 ? basePath : "/";
  return pathname === home || pathname === `${home}/`;
}
