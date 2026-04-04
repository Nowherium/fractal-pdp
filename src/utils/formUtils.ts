export const formControlClassName =
  "w-full rounded-lg border border-border-strong bg-[#111] px-3 py-2.5 text-left text-[#f1f1f1]";

export const toFormInputValue = (
  value: unknown,
  fallback: string | number = "",
): string | number =>
  typeof value === "string" || typeof value === "number" ? value : fallback;
