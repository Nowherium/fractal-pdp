import type {
  Lune,
  LuneConstruction,
  PersoResource,
  Resource,
  Stocks,
} from "../types";

export type ResourceEditableField = "code" | "name";

export type ResourceDeleteGuard = {
  canDelete: boolean;
  reason: string;
};

const protectedResourceCodes = new Set(["eau", "nrt", "med", "mat", "crd"]);

export const normalizeResourceCode = (
  value: string | number | null | undefined,
): string =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

export const normalizeResourceName = (
  value: string | number | null | undefined,
  fallback: string,
): string => {
  const normalized = String(value ?? "").trim();
  return normalized || fallback;
};

export const ensureResourceStockKey = (
  stocks: Stocks,
  resourceCode: string,
): Stocks => ({
  ...stocks,
  [resourceCode]: Number(stocks[resourceCode] ?? 0),
});

export const renameResourceStockKey = (
  stocks: Stocks,
  previousCode: string,
  nextCode: string,
): Stocks => {
  if (previousCode === nextCode) {
    return stocks;
  }

  const nextStocks = { ...stocks };
  const quantity = Number(nextStocks[previousCode] ?? 0);
  delete nextStocks[previousCode];
  nextStocks[nextCode] = quantity;
  return nextStocks;
};

export const removeResourceStockKey = (
  stocks: Stocks,
  resourceCode: string,
): Stocks => {
  const nextStocks = { ...stocks };
  delete nextStocks[resourceCode];
  return nextStocks;
};

export const createDefaultResource = (resources: Resource[] = []): Resource => {
  const nextResourceId =
    resources.reduce(
      (maxId, resource) => Math.max(maxId, Number(resource.id) || 0),
      0,
    ) + 1;

  const existingCodes = new Set(
    resources.map((resource) => String(resource.code ?? "").toLowerCase()),
  );

  let nextCode = `res${nextResourceId}`;
  let suffix = 1;
  while (existingCodes.has(nextCode)) {
    nextCode = `res${nextResourceId}${suffix}`;
    suffix += 1;
  }

  return {
    id: nextResourceId,
    code: nextCode,
    name: `Ressource ${nextResourceId}`,
  };
};

export const buildUpdatedResource = ({
  resources,
  index,
  field,
  rawValue,
}: {
  resources: Resource[];
  index: number;
  field: ResourceEditableField;
  rawValue: string | number;
}): {
  currentResource: Resource | null;
  nextResource: Resource | null;
  previousCode: string;
  nextCode: string;
  error: string | null;
} => {
  const currentResource = resources[index] ?? null;
  if (!currentResource) {
    return {
      currentResource: null,
      nextResource: null,
      previousCode: "",
      nextCode: "",
      error: null,
    };
  }

  const previousCode = String(currentResource.code ?? "").toLowerCase();
  const nextCode =
    field === "code"
      ? normalizeResourceCode(rawValue) || previousCode
      : previousCode;

  if (
    field === "code" &&
    resources.some(
      (resource, currentIndex) =>
        currentIndex !== index &&
        String(resource.code ?? "").toLowerCase() === nextCode,
    )
  ) {
    return {
      currentResource,
      nextResource: null,
      previousCode,
      nextCode,
      error: `Le code ressource "${nextCode}" est déjà utilisé.`,
    };
  }

  return {
    currentResource,
    nextResource: {
      ...currentResource,
      code: nextCode,
      name:
        field === "name"
          ? normalizeResourceName(
              rawValue,
              currentResource.name || previousCode.toUpperCase(),
            )
          : currentResource.name || nextCode.toUpperCase(),
    },
    previousCode,
    nextCode,
    error: null,
  };
};

export const getResourceDeleteGuard = ({
  resource,
  stocks,
  persoResources,
  constructions,
  lunes,
}: {
  resource: Resource;
  stocks: Stocks;
  persoResources: PersoResource[];
  constructions: LuneConstruction[];
  lunes: Lune[];
}): ResourceDeleteGuard => {
  const resourceCode = String(resource.code ?? "").toLowerCase();

  if (protectedResourceCodes.has(resourceCode)) {
    return {
      canDelete: false,
      reason: `Protégée : ${resourceCode} ne peut pas être supprimée.`,
    };
  }

  const stockQuantity = Number(stocks[resourceCode] ?? 0);
  if (stockQuantity > 0) {
    return {
      canDelete: false,
      reason: `Stock restant en réserve centrale : ${stockQuantity}.`,
    };
  }

  const carriedQuantity = persoResources
    .filter((entry) => entry.resource_id === resource.id)
    .reduce((total, entry) => total + Number(entry.quantity ?? 0), 0);

  if (carriedQuantity > 0) {
    return {
      canDelete: false,
      reason: `Encore portée par des persos : ${carriedQuantity} unité(s).`,
    };
  }

  const isPlannedAsDrug = lunes.some((lune) =>
    Object.values(lune.rations || {}).some(
      (ration) => String(ration?.drogue ?? "").toLowerCase() === resourceCode,
    ),
  );

  if (isPlannedAsDrug) {
    return {
      canDelete: false,
      reason: "Encore planifiée comme drogue dans la timeline.",
    };
  }

  const isUsedByConstruction = constructions.some(
    (construction) =>
      String(construction.resourceCode ?? "").toLowerCase() === resourceCode,
  );

  if (isUsedByConstruction) {
    return {
      canDelete: false,
      reason: "Encore utilisée par un chantier global.",
    };
  }

  return {
    canDelete: true,
    reason: "Suppression autorisée.",
  };
};
