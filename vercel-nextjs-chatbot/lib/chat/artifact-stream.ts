/**
 * Which artifact definition each delta in a streamed batch should be handed to.
 *
 * Only the per-kind `onStreamPart` handler sets `isVisible`, so picking the
 * wrong definition means the side panel never opens for that artifact.
 */

export type ArtifactStreamDelta = {
  type: string;
  data?: unknown;
};

/**
 * Resolve the artifact kind to dispatch each delta against, in order.
 *
 * The kind has to be tracked across the batch rather than read once from React
 * state. `data-kind` and the content delta that follows it can land in the same
 * batch, and state does not update until the next render, so reading it once
 * dispatched the content delta to whichever artifact was open before. A new
 * chat starts on the text artifact, which ignores every other kind's delta, so
 * the panel stayed shut. Whether that happened at all came down to how the
 * deltas were batched, which is why it looked intermittent.
 */
export function dispatchKindsForBatch(
  startKind: string,
  deltas: ArtifactStreamDelta[]
): string[] {
  let currentKind = startKind;

  return deltas.map((delta) => {
    if (delta.type === "data-kind" && typeof delta.data === "string") {
      currentKind = delta.data;
    }
    return currentKind;
  });
}
