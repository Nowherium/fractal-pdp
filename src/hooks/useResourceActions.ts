import type { Dispatch, SetStateAction } from "react";

import type {
  Lune,
  LuneConstruction,
  PersoResource,
  PersistOptions,
  Resource,
  Stocks,
} from "../types";
import {
  buildUpdatedResource,
  createDefaultResource,
  ensureResourceStockKey,
  getResourceDeleteGuard as evaluateResourceDeleteGuard,
  removeResourceStockKey,
  renameResourceStockKey,
} from "../utils/resourceUtils";
import type { ResourceEditableField } from "../utils/resourceUtils";

interface UseResourceActionsParams {
  resources: Resource[];
  stocks: Stocks;
  persoResources: PersoResource[];
  constructions: LuneConstruction[];
  lunes: Lune[];
  setResources: Dispatch<SetStateAction<Resource[]>>;
  setStocks: Dispatch<SetStateAction<Stocks>>;
  saveResourceEntity: (resource: Resource) => void;
  deleteResourceEntity: (resourceId: number) => void;
}

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
}: UseResourceActionsParams) => {
  const addResource = () => {
    const newResource = createDefaultResource(resources);

    setResources((previous) => [...previous, newResource]);
    setStocks((previous) => ensureResourceStockKey(previous, newResource.code));
    saveResourceEntity(newResource);
  };

  const getResourceDeleteGuard = (resource: Resource) =>
    evaluateResourceDeleteGuard({
      resource,
      stocks,
      persoResources,
      constructions,
      lunes,
    });

  const updateResource = (
    index: number,
    field: ResourceEditableField,
    rawValue: string | number,
    { persist = true }: PersistOptions = {},
  ) => {
    const { currentResource, nextResource, previousCode, nextCode, error } =
      buildUpdatedResource({
        resources,
        index,
        field,
        rawValue,
      });

    if (!currentResource || !nextResource) {
      if (error) {
        window.alert(error);
      }
      return;
    }

    setResources((previous) =>
      previous.map((resource, currentIndex) =>
        currentIndex !== index ? resource : nextResource,
      ),
    );

    if (field === "code" && nextCode !== previousCode) {
      setStocks((previous) =>
        renameResourceStockKey(previous, previousCode, nextCode),
      );
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
        `Impossible de supprimer "${resourceCode}" : ${guard.reason}`,
      );
      return;
    }

    const confirmed = window.confirm(
      `Supprimer définitivement la ressource "${resourceToRemove.name || resourceCode}" ?`,
    );
    if (!confirmed) return;

    setResources((previous) =>
      previous.filter((resource) => resource.id !== resourceToRemove.id),
    );
    setStocks((previous) => removeResourceStockKey(previous, resourceCode));
    deleteResourceEntity(resourceToRemove.id);
  };

  return {
    addResource,
    updateResource,
    removeResource,
    getResourceDeleteGuard,
  };
};
