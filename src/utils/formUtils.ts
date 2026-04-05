export const formControlClassName =
  "w-full rounded-lg border border-border-strong bg-[#111] px-3 py-2.5 text-left text-[#f1f1f1]";

export const getIncrementStep = (value: unknown): string => {
  const numericValue = Number(value);
  if (Number.isNaN(numericValue)) return "0.1";
  if (numericValue <= 4) return "0.1";
  if (numericValue <= 6) return "0.05";
  return "0.01";
};

export const toFormInputValue = (
  value: unknown,
  fallback: string | number = "",
): string | number =>
  typeof value === "string" || typeof value === "number" ? value : fallback;
