import type { Outil, ToolSpecialite } from "../types";

export const toolSpecialiteOrder: ToolSpecialite[] = [
  "eau",
  "nrt",
  "med",
  "mat",
  "art",
];

export const toolSpecialiteLabels: Record<ToolSpecialite, string> = {
  eau: "💧 Eau",
  nrt: "🍗 Nrt",
  med: "💊 Med",
  mat: "🧱 Mat",
  art: "🎭 Art",
};

export const normalizeToolSpecialite = (
  specialite: Outil["specialite"],
): ToolSpecialite =>
  toolSpecialiteOrder.includes(specialite as ToolSpecialite)
    ? (specialite as ToolSpecialite)
    : "eau";

export const getToolsForSpecialite = (
  outils: Outil[] = [],
  specialite: ToolSpecialite,
): Outil[] =>
  [...outils]
    .filter((outil) => normalizeToolSpecialite(outil.specialite) === specialite)
    .sort(
      (left, right) =>
        Number(right.bonus ?? 1) - Number(left.bonus ?? 1) ||
        String(left.name ?? "").localeCompare(String(right.name ?? ""), "fr"),
    );

export const getBestToolForSpecialite = (
  outils: Outil[] = [],
  specialite: ToolSpecialite,
): Outil | null => getToolsForSpecialite(outils, specialite)[0] ?? null;

export const createDefaultToolMultipliers = (): Record<
  ToolSpecialite,
  number
> => ({
  eau: 1,
  nrt: 1,
  med: 1,
  mat: 1,
  art: 1,
});

export const getToolBonusMultiplier = (outil?: Outil | null): number => {
  const bonus = Number(outil?.bonus ?? 1);
  return Number.isFinite(bonus) && bonus > 0 ? bonus : 1;
};
