import type { Dispatch, SetStateAction } from "react";

import type {
  Lune,
  LuneConstruction,
  PersoResource,
  Resource,
  Stocks,
} from "../types";

const normalizeResourceCode = (value: string | number | null | undefined) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const normalizeResourceName = (
  value: string | number | null | undefined,
  fallback: string,
) => {
  const normalized = String(value ?? "").trim();
  return normalized || fallback;
};

export const useResourceActions = ({
  resources,
  stocks,
  persoResources,
  constructions,
  lunes,
  setResources,
  setStocks,
  saveResourceEntity,
  deleteResourceEntity,
}: {
  resources: Resource[];
  stocks: Stocks;
  persoResources: PersoResource[];
  constructions: LuneConstruction[];
  lunes: Lune[];
  setResources: Dispatch<SetStateAction<Resource[]>>;
  setStocks: Dispatch<SetStateAction<Stocks>>;
  saveResourceEntity: (resource: Resource) => void;
  deleteResourceEntity: (resourceId: number) => void;
}) => {
  const addResource = () => {
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

    const newResource: Resource = {
      id: nextResourceId,
      code: nextCode,
      name: `Ressource ${nextResourceId}`,
    };

    setResources((previous) => [...previous, newResource]);
    setStocks((previous) => ({
      ...previous,
      [nextCode]: Number(previous[nextCode] ?? 0),
    }));
    saveResourceEntity(newResource);
  };

  const protectedCodes = new Set(["eau", "nrt", "med", "mat", "crd"]);

  const getResourceDeleteGuard = (resource: Resource) => {
    const resourceCode = String(resource.code ?? "").toLowerCase();

    if (protectedCodes.has(resourceCode)) {
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

  const updateResource = (
    index: number,
    field: "code" | "name",
    rawValue: string | number,
    { persist = true }: { persist?: boolean } = {},
  ) => {
    const currentResource = resources[index];
    if (!currentResource) return;

    const nextCode =
      field === "code"
        ? normalizeResourceCode(rawValue) || currentResource.code
        : currentResource.code;

    if (
      field === "code" &&
      resources.some(
        (resource, currentIndex) =>
          currentIndex !== index &&
          String(resource.code ?? "").toLowerCase() === nextCode,
      )
    ) {
      window.alert(`Le code ressource \"${nextCode}\" est déjà utilisé.`);
      return;
    }

    const nextResource: Resource = {
      ...currentResource,
      code: nextCode,
      name:
        field === "name"
          ? normalizeResourceName(
              rawValue,
              currentResource.name || currentResource.code.toUpperCase(),
            )
          : currentResource.name || nextCode.toUpperCase(),
    };

    setResources((previous) =>
      previous.map((resource, currentIndex) =>
        currentIndex !== index ? resource : nextResource,
      ),
    );

    if (field === "code" && nextCode !== currentResource.code) {
      setStocks((previous) => {
        const nextStocks = { ...previous };
        const quantity = Number(nextStocks[currentResource.code] ?? 0);
        delete nextStocks[currentResource.code];
        nextStocks[nextCode] = quantity;
        return nextStocks;
      });
    }

    if (persist) {
      saveResourceEntity(nextResource);
    }
  };

  const removeResource = (index: number) => {
    const resourceToRemove = resources[index];
    if (!resourceToRemove) return;

    const resourceCode = String(resourceToRemove.code ?? "").toLowerCase();
    const guard = getResourceDeleteGuard(resourceToRemove);

    if (!guard.canDelete) {
      window.alert(
        `Impossible de supprimer \"${resourceCode}\" : ${guard.reason}`,
      );
      return;
    }

    const confirmed = window.confirm(
      `Supprimer définitivement la ressource \"${resourceToRemove.name || resourceCode}\" ?`,
    );
    if (!confirmed) return;

    setResources((previous) =>
      previous.filter((resource) => resource.id !== resourceToRemove.id),
    );
    setStocks((previous) => {
      const nextStocks = { ...previous };
      delete nextStocks[resourceCode];
      return nextStocks;
    });
    deleteResourceEntity(resourceToRemove.id);
  };

  return {
    addResource,
    updateResource,
    removeResource,
    getResourceDeleteGuard,
  };
};
