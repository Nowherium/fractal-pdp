import type { PersoArme, PersoOutil, PersoSac } from "../types";

export const normalizeArmeFieldValue = (
  field: string,
  rawValue: string | number,
): string | number => {
  if (field === "name") return rawValue;
  const value = Number(rawValue);
  if (!Number.isFinite(value)) return 0;
  if (field === "quantity") return Math.max(0, Math.floor(value));
  return value;
};

export const countAssignedWeaponsForArme = (
  entries: PersoArme[] = [],
  armeId: number,
  excludedPersoId: number | null = null,
) =>
  entries.filter(
    (entry) =>
      entry.arme_id === armeId &&
      (excludedPersoId === null || entry.perso_id !== excludedPersoId),
  ).length;

export const normalizeOutilFieldValue = (
  field: string,
  rawValue: string | number,
): string | number => {
  if (field === "name" || field === "specialite") return rawValue;
  const value = Number(rawValue);
  if (!Number.isFinite(value)) return 0;
  if (field === "quantity") return Math.max(0, Math.floor(value));
  if (field === "pv" || field === "pvmax" || field === "bonus") {
    return Math.max(0, value);
  }
  return value;
};

export const countAssignedToolsForOutil = (
  entries: PersoOutil[] = [],
  outilId: number,
  excludedPersoId: number | null = null,
) =>
  entries.filter(
    (entry) =>
      entry.outil_id === outilId &&
      (excludedPersoId === null || entry.perso_id !== excludedPersoId),
  ).length;

export const normalizeSacFieldValue = (
  field: string,
  rawValue: string | number,
): string | number => {
  if (field === "name") return rawValue;
  const value = Number(rawValue);
  if (!Number.isFinite(value)) return 0;
  if (field === "quantity") return Math.max(0, Math.floor(value));
  if (
    field === "pv" ||
    field === "pvmax" ||
    field === "poids" ||
    field === "capacite"
  ) {
    return Math.max(0, value);
  }
  return value;
};

export const countAssignedBagsForSac = (
  entries: PersoSac[] = [],
  sacId: number,
  excludedPersoId: number | null = null,
) =>
  entries.filter(
    (entry) =>
      entry.sac_id === sacId &&
      (excludedPersoId === null || entry.perso_id !== excludedPersoId),
  ).length;
