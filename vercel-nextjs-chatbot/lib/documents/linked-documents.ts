import "server-only";

import {
  type DocumentAccessInfo,
  resolveDocumentContent,
} from "@/lib/documents/access";
import {
  collectLinkedDocumentRefs,
  linkedDocumentRefKey,
  refsFromMcpToolOutputForAccess,
  type LinkedDocumentRef,
} from "@/lib/documents/linked-document-refs";

export type { LinkedDocumentRef };
export { collectLinkedDocumentRefs };

/** Request-scoped cache for linked document access lists. */
const linkedDocumentCache = new Map<string, DocumentAccessInfo>();

function cacheKey(chatId: string, ref: LinkedDocumentRef): string {
  return `${chatId}:${linkedDocumentRefKey(ref)}`;
}

/**
 * Fetches a single linked document by fileId or downloadUrl (tool refresh path).
 */
export async function fetchLinkedDocumentByRef({
  chatId,
  ref,
}: {
  chatId: string;
  ref: LinkedDocumentRef;
}): Promise<DocumentAccessInfo | null> {
  let resolved: DocumentAccessInfo | null = null;

  if (ref.fileId) {
    resolved = await resolveDocumentContent({
      kind: "ebuilder",
      fileId: ref.fileId,
      fileName: ref.fileName,
    });
  }

  if (!resolved && ref.downloadUrl) {
    resolved = await resolveDocumentContent({
      kind: "ebuilder-url",
      downloadUrl: ref.downloadUrl,
      fileId: ref.fileId,
      fileName: ref.fileName,
    });
  }

  if (!resolved && !ref.fileId && !ref.downloadUrl) {
    return null;
  }

  if (resolved) {
    linkedDocumentCache.set(cacheKey(chatId, ref), resolved);
  }
  return resolved;
}

/**
 * Resolves linked e-Builder documents to extracted text for agent context.
 * Uses a request-scoped cache keyed by chatId + document ref.
 */
export async function buildLinkedDocumentAccessList({
  chatId,
  refs,
}: {
  chatId: string;
  refs: LinkedDocumentRef[];
}): Promise<DocumentAccessInfo[]> {
  const results: DocumentAccessInfo[] = [];

  for (const ref of refs) {
    const key = cacheKey(chatId, ref);
    const cached = linkedDocumentCache.get(key);
    if (cached) {
      results.push(cached);
      continue;
    }

    if (!ref.fileId && !ref.downloadUrl) {
      continue;
    }

    const resolved = await fetchLinkedDocumentByRef({ chatId, ref });
    if (!resolved) {
      continue;
    }

    results.push(resolved);
  }

  return results;
}

/** Merge fetched linked documents into a mutable holder (same-turn MCP prefetch). */
export function mergeLinkedDocumentAccess(
  holder: DocumentAccessInfo[],
  incoming: DocumentAccessInfo
): void {
  const index = holder.findIndex((doc) => doc.id === incoming.id);
  if (index >= 0) {
    holder[index] = incoming;
    return;
  }
  holder.push(incoming);
}

/** Fetch and cache all refs from an MCP tool output payload. */
export async function prefetchLinkedDocumentsFromToolOutput({
  chatId,
  output,
  holder,
}: {
  chatId: string;
  output: unknown;
  holder: DocumentAccessInfo[];
}): Promise<void> {
  const refs = refsFromMcpToolOutputForAccess(output);
  for (const ref of refs) {
    const fetched = await fetchLinkedDocumentByRef({ chatId, ref });
    if (fetched) {
      mergeLinkedDocumentAccess(holder, fetched);
    }
  }
}

/** Clears request-scoped linked document cache (for tests). */
export function clearLinkedDocumentCache(): void {
  linkedDocumentCache.clear();
}
