import type { Resource } from "../types";

const priorityCodes = ["nrt", "eau", "med", "mat"];
const priorityByCode = new Map(
  priorityCodes.map((code, index) => [code, index]),
);

const normalizeCode = (resource?: Pick<Resource, "code"> | null) =>
  String(resource?.code ?? "")
    .trim()
    .toLowerCase();

export const compareResources = (
  left: Pick<Resource, "code">,
  right: Pick<Resource, "code">,
) => {
  const leftCode = normalizeCode(left);
  const rightCode = normalizeCode(right);
  const leftPriority = priorityByCode.get(leftCode);
  const rightPriority = priorityByCode.get(rightCode);

  if (leftPriority !== undefined || rightPriority !== undefined) {
    if (leftPriority === undefined) return 1;
    if (rightPriority === undefined) return -1;
    if (leftPriority !== rightPriority) return leftPriority - rightPriority;
  }

  return leftCode.localeCompare(rightCode, "fr", { sensitivity: "base" });
};

export const sortResources = <T extends Resource>(resources: T[]) =>
  [...resources].sort(compareResources);
