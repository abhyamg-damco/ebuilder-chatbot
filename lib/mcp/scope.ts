import type { UserType } from "@/app/(auth)/auth";

/** Whether an MCP server belongs to a signed-in user or is shared site-wide. */
export type McpServerScope =
  | { kind: "global" }
  | { kind: "user"; userId: string };

/**
 * Guest visitors share one MCP configuration. Signed-in users keep their own.
 */
export function getMcpServerScope(
  userType: UserType,
  userId: string
): McpServerScope {
  if (userType === "guest") {
    return { kind: "global" };
  }

  return { kind: "user", userId };
}
