import type {
  Arme,
  Outil,
  PersoArme,
  PersoOutil,
  PersoSac,
  Sac,
} from "../types";

export type ArmeEditableField = keyof Pick<
  Arme,
  "name" | "quantity" | "att" | "degats" | "fiabilite" | "pv" | "pvm" | "poids"
>;

export type OutilEditableField = keyof Pick<
  Outil,
  "name" | "specialite" | "bonus" | "pv" | "pvmax" | "poids" | "quantity"
>;

export type SacEditableField = keyof Pick<
  Sac,
  "name" | "pv" | "pvmax" | "poids" | "capacite" | "quantity"
>;

type InventoryAssignedEntry = {
  perso_id: number;
};

const normalizeNumericFieldValue = (rawValue: string | number): number => {
  const value = Number(rawValue);
  return Number.isFinite(value) ? value : 0;
};

const normalizeInventoryFieldValue = <TField extends string>(
  field: TField,
  rawValue: string | number,
  options: {
    textFields?: readonly TField[];
    integerFields?: readonly TField[];
    nonNegativeFields?: readonly TField[];
  } = {},
): string | number => {
  const {
    textFields = [],
    integerFields = [],
    nonNegativeFields = [],
  } = options;

  if (textFields.includes(field)) {
    return rawValue;
  }

  const numericValue = normalizeNumericFieldValue(rawValue);
  const normalizedValue = integerFields.includes(field)
    ? Math.floor(numericValue)
    : numericValue;

  if (integerFields.includes(field) || nonNegativeFields.includes(field)) {
    return Math.max(0, normalizedValue);
  }

  return normalizedValue;
};

const countAssignedEntries = <
  TEntry extends InventoryAssignedEntry,
  TKey extends Exclude<keyof TEntry, "perso_id">,
>(
  entries: TEntry[] = [],
  itemKey: TKey,
  itemId: number,
  excludedPersoId: number | null = null,
) =>
  entries.filter(
    (entry) =>
      Number(entry[itemKey]) === itemId &&
      (excludedPersoId === null || entry.perso_id !== excludedPersoId),
  ).length;

export const normalizeSelectedInventoryIds = (
  itemIds: Array<number | string> = [],
): number[] =>
  Array.from(
    new Set(
      itemIds.map((id) => Number(id)).filter((id) => Number.isFinite(id)),
    ),
  );

export const normalizeOptionalInventoryId = (
  itemId: number | string | null | undefined,
): number | null => {
  if (itemId === null || itemId === undefined || itemId === "") {
    return null;
  }

  const numericId = Number(itemId);
  return Number.isFinite(numericId) ? numericId : null;
};

export const replacePersoAssignedEntries = <
  TEntry extends InventoryAssignedEntry,
>(
  entries: TEntry[] = [],
  persoId: number,
  nextEntries: TEntry[],
): TEntry[] => {
  const remainingEntries = entries.filter(
    (entry) => entry.perso_id !== persoId,
  );
  return [...remainingEntries, ...nextEntries];
};

export const getInventoryAvailabilityError = <
  TItem extends { id: number; name?: string; quantity?: number },
>({
  selectedIds,
  items,
  excludedPersoId,
  countAssigned,
  buildMessage,
}: {
  selectedIds: number[];
  items: TItem[];
  excludedPersoId: number;
  countAssigned: (itemId: number, excludedPersoId: number) => number;
  buildMessage: (
    item: TItem | undefined,
    itemId: number,
    assignedToOthers: number,
    maxQuantity: number,
  ) => string;
}): string | null => {
  for (const itemId of selectedIds) {
    const item = items.find((entry) => entry.id === itemId);
    const maxQuantity = Math.max(0, Math.floor(Number(item?.quantity ?? 1)));
    const assignedToOthers = countAssigned(itemId, excludedPersoId);

    if (assignedToOthers + 1 > maxQuantity) {
      return buildMessage(item, itemId, assignedToOthers, maxQuantity);
    }
  }

  return null;
};

export const getNextInventoryItemId = <TItem extends { id: number }>(
  items: TItem[] = [],
): number =>
  items.reduce((maxId, item) => Math.max(maxId, Number(item.id) || 0), 0) + 1;

export const normalizeArmeFieldValue = (
  field: ArmeEditableField,
  rawValue: string | number,
): string | number =>
  normalizeInventoryFieldValue(field, rawValue, {
    textFields: ["name"],
    integerFields: ["quantity"],
  });

export const countAssignedWeaponsForArme = (
  entries: PersoArme[] = [],
  armeId: number,
  excludedPersoId: number | null = null,
) => countAssignedEntries(entries, "arme_id", armeId, excludedPersoId);

export const normalizeOutilFieldValue = (
  field: OutilEditableField,
  rawValue: string | number,
): string | number =>
  normalizeInventoryFieldValue(field, rawValue, {
    textFields: ["name", "specialite"],
    integerFields: ["quantity"],
    nonNegativeFields: ["pv", "pvmax", "bonus"],
  });

export const countAssignedToolsForOutil = (
  entries: PersoOutil[] = [],
  outilId: number,
  excludedPersoId: number | null = null,
) => countAssignedEntries(entries, "outil_id", outilId, excludedPersoId);

export const normalizeSacFieldValue = (
  field: SacEditableField,
  rawValue: string | number,
): string | number =>
  normalizeInventoryFieldValue(field, rawValue, {
    textFields: ["name"],
    integerFields: ["quantity"],
    nonNegativeFields: ["pv", "pvmax", "poids", "capacite"],
  });

export const countAssignedBagsForSac = (
  entries: PersoSac[] = [],
  sacId: number,
  excludedPersoId: number | null = null,
) => countAssignedEntries(entries, "sac_id", sacId, excludedPersoId);
