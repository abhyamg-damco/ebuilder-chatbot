export type MayoReviewerFindingStatus =
  | "open"
  | "accepted"
  | "rejected"
  | "resolved";

const allowedFindingTransitions: Record<
  MayoReviewerFindingStatus,
  MayoReviewerFindingStatus[]
> = {
  open: ["accepted", "rejected", "resolved"],
  accepted: ["open", "resolved"],
  rejected: ["open", "resolved"],
  resolved: ["open"],
};

export function assertMayoFindingTransition(
  current: MayoReviewerFindingStatus | "carried_forward",
  next: MayoReviewerFindingStatus
): void {
  if (current === next) {
    return;
  }
  if (
    current === "carried_forward" ||
    !allowedFindingTransitions[current].includes(next)
  ) {
    throw new Error(`Finding cannot transition from ${current} to ${next}`);
  }
}
