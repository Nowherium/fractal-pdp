import type {
  Lune,
  Perso,
  PersoResource,
  Resource,
  Sac,
  Stocks,
} from "../types";
import {
  defaultRation,
  normalizePersoFieldValue,
  normalizeStockQuantity,
} from "./stateUtils";

export type PersoUpdateValue = string | number | boolean | null;

const getEquippedBagCapacity = (
  sacs: Sac[] = [],
  equippedBagId: number | null | undefined,
): number =>
  Number(sacs.find((sac) => sac.id === equippedBagId)?.capacite ?? 0);

const sortPersoResources = (
  left: PersoResource,
  right: PersoResource,
): number =>
  left.perso_id - right.perso_id || left.resource_id - right.resource_id;

const getResourceCode = (
  resources: Resource[] = [],
  resourceId: number,
): string =>
  String(resources.find((resource) => resource.id === resourceId)?.code ?? "")
    .trim()
    .toLowerCase();

export const isGroupRelatedPersoField = (field: string): boolean =>
  field === "groupId" || field === "cmd";

export const buildUpdatedPersos = ({
  persos,
  persoId,
  field,
  rawValue,
  sacs,
}: {
  persos: Perso[];
  persoId: number;
  field: string;
  rawValue: PersoUpdateValue;
  sacs: Sac[];
}): { nextPersos: Perso[]; updatedPerso: Perso | undefined } => {
  const nextValue = normalizePersoFieldValue(field, rawValue);

  const nextPersos = persos.map((perso) => {
    if (perso.id !== persoId) {
      return perso;
    }

    return {
      ...perso,
      [field]: nextValue,
      ...(field === "poidsMax"
        ? {
            poidsMaxEffectif:
              Number(nextValue) +
              getEquippedBagCapacity(sacs, perso.equippedBagId),
          }
        : {}),
    };
  });

  return {
    nextPersos,
    updatedPerso: nextPersos.find((perso) => perso.id === persoId),
  };
};

export const buildPersoResourceUpdate = ({
  persoId,
  resourceId,
  rawValue,
  persoResources,
  resources,
  stocks,
  exchangeCityStocksWithPersos,
}: {
  persoId: number;
  resourceId: number;
  rawValue: string | number;
  persoResources: PersoResource[];
  resources: Resource[];
  stocks: Stocks;
  exchangeCityStocksWithPersos: boolean;
}): {
  nextPersoResources: PersoResource[];
  nextStocks: Stocks;
  resourceCode: string;
  cityStockChanged: boolean;
} => {
  const requestedQuantity = normalizeStockQuantity(rawValue);
  const currentQuantity = normalizeStockQuantity(
    persoResources.find(
      (entry) => entry.perso_id === persoId && entry.resource_id === resourceId,
    )?.quantity ?? 0,
  );
  const resourceCode = getResourceCode(resources, resourceId);
  const currentCityStock = normalizeStockQuantity(stocks[resourceCode] ?? 0);

  let quantity = requestedQuantity;
  let nextStocks = stocks;

  if (exchangeCityStocksWithPersos && resourceCode) {
    const delta = requestedQuantity - currentQuantity;

    if (delta > 0) {
      const transferable = Math.min(delta, currentCityStock);
      quantity = normalizeStockQuantity(currentQuantity + transferable);
      nextStocks = {
        ...stocks,
        [resourceCode]: normalizeStockQuantity(currentCityStock - transferable),
      };
    } else if (delta < 0) {
      nextStocks = {
        ...stocks,
        [resourceCode]: normalizeStockQuantity(
          currentCityStock + Math.abs(delta),
        ),
      };
    }
  }

  const remainingEntries = persoResources.filter(
    (entry) =>
      !(entry.perso_id === persoId && entry.resource_id === resourceId),
  );

  const nextPersoResources =
    quantity === 0
      ? remainingEntries
      : [
          ...remainingEntries,
          {
            perso_id: persoId,
            resource_id: resourceId,
            quantity: normalizeStockQuantity(quantity),
          },
        ].sort(sortPersoResources);

  return {
    nextPersoResources,
    nextStocks,
    resourceCode,
    cityStockChanged:
      exchangeCityStocksWithPersos &&
      Boolean(resourceCode) &&
      Number(nextStocks[resourceCode] ?? 0) !== currentCityStock,
  };
};

export const buildInitialPersoResources = (
  persoId: number,
  resources: Resource[] = [],
): PersoResource[] =>
  resources.map((resource) => ({
    perso_id: persoId,
    resource_id: resource.id,
    quantity: 0,
  }));

export const addPersoToLunes = (lunes: Lune[] = [], persoId: number): Lune[] =>
  lunes.map((lune) => ({
    ...lune,
    rations: {
      ...lune.rations,
      [persoId]: defaultRation(),
    },
  }));

export const removePersoFromLunes = (
  lunes: Lune[] = [],
  persoId: number,
): Lune[] =>
  lunes.map((lune) => {
    const rations = { ...lune.rations };
    delete rations[persoId];

    const overrides = { ...lune.overrides };
    delete overrides[persoId];

    return { ...lune, rations, overrides };
  });

export const removePersoOpenOverrides = (
  openOverrides: Record<string, boolean> = {},
  persoId: number,
): Record<string, boolean> =>
  Object.fromEntries(
    Object.entries(openOverrides).filter(
      ([key]) => !key.endsWith(`-${persoId}`),
    ),
  );
