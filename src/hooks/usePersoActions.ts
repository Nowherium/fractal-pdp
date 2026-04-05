import type { Dispatch, SetStateAction } from "react";
import type {
  AppPage,
  Group,
  Lune,
  PersistOptions,
  Perso,
  PersoResource,
  Resource,
  Sac,
  Stocks,
} from "../types";
import {
  recalculateGroups,
  validateGroupCapacities,
} from "../utils/groupUtils";
import { createDefaultPerso } from "../utils/entityDefaults";
import {
  addPersoToLunes,
  buildInitialPersoResources,
  buildPersoResourceUpdate,
  buildUpdatedPersos,
  isGroupRelatedPersoField,
  removePersoFromLunes,
  removePersoOpenOverrides,
} from "../utils/persoUtils";

interface UsePersoActionsParams {
  persos: Perso[];
  groups: Group[];
  resources: Resource[];
  sacs: Sac[];
  stocks: Stocks;
  exchangeCityStocksWithPersos: boolean;
  persoResources: PersoResource[];
  lunes: Lune[];
  nextPersoId: number;
  setPersos: Dispatch<SetStateAction<Perso[]>>;
  setGroups: Dispatch<SetStateAction<Group[]>>;
  setPersoResources: Dispatch<SetStateAction<PersoResource[]>>;
  setStocks: Dispatch<SetStateAction<Stocks>>;
  setLunes: Dispatch<SetStateAction<Lune[]>>;
  setPage: Dispatch<SetStateAction<AppPage>>;
  setSelectedPersoId: Dispatch<SetStateAction<number | null>>;
  setOpenOverrides: Dispatch<SetStateAction<Record<string, boolean>>>;
  setNextPersoId: Dispatch<SetStateAction<number>>;
  savePersoEntity: (perso: Perso) => void;
  deletePersoEntity: (persoId: number) => void;
  savePersoResourcesEntity: (
    persoId: number,
    nextPersoResources: PersoResource[],
  ) => void;
  saveStockEntity: (code: string, quantity: number) => void;
  saveLuneEntity: (lune: Lune) => void;
}

export const usePersoActions = ({
  persos,
  groups,
  resources,
  sacs,
  stocks,
  exchangeCityStocksWithPersos,
  persoResources,
  lunes,
  nextPersoId,
  setPersos,
  setGroups,
  setPersoResources,
  setStocks,
  setLunes,
  setPage,
  setSelectedPersoId,
  setOpenOverrides,
  setNextPersoId,
  savePersoEntity,
  deletePersoEntity,
  savePersoResourcesEntity,
  saveStockEntity,
  saveLuneEntity,
}: UsePersoActionsParams) => {
  const openPersoPage = (persoId: number) => {
    setSelectedPersoId(persoId);
    setPage("perso");
  };

  const closePersoPage = () => {
    setPage("effectif");
    setSelectedPersoId(null);
  };

  const handlePersoUpdateById = (
    persoId: number,
    field: string,
    rawValue: string | number | boolean | null,
    { persist = true }: PersistOptions = {},
  ) => {
    const { nextPersos, updatedPerso } = buildUpdatedPersos({
      persos,
      persoId,
      field,
      rawValue,
      sacs,
    });

    if (isGroupRelatedPersoField(field)) {
      const nextGroups = recalculateGroups(nextPersos, groups);
      const capacityError = validateGroupCapacities(nextPersos, nextGroups);
      if (capacityError) {
        window.alert(capacityError);
        return;
      }
      setGroups(nextGroups);
    }

    setPersos(nextPersos);
    if (persist && updatedPerso) {
      savePersoEntity(updatedPerso);
    }
  };

  const handlePersoResourceUpdate = (
    persoId: number,
    resourceId: number,
    rawValue: string | number,
  ) => {
    const { nextPersoResources, nextStocks, resourceCode, cityStockChanged } =
      buildPersoResourceUpdate({
        persoId,
        resourceId,
        rawValue,
        persoResources,
        resources,
        stocks,
        exchangeCityStocksWithPersos,
      });

    setPersoResources(nextPersoResources);
    savePersoResourcesEntity(
      persoId,
      nextPersoResources.filter((entry) => entry.perso_id === persoId),
    );

    if (cityStockChanged && resourceCode) {
      setStocks(nextStocks);
      saveStockEntity(resourceCode, Number(nextStocks[resourceCode] ?? 0));
    }
  };

  const addPerso = () => {
    const newPerso: Perso = createDefaultPerso(nextPersoId);
    const nextLunes = addPersoToLunes(lunes, newPerso.id);

    setPersos((previous) => [...previous, newPerso]);
    setPersoResources((previous) => [
      ...previous,
      ...buildInitialPersoResources(newPerso.id, resources),
    ]);
    setLunes(nextLunes);
    openPersoPage(newPerso.id);
    setNextPersoId((previous) => previous + 1);
    savePersoEntity(newPerso);
    nextLunes.forEach((lune) => saveLuneEntity(lune));
  };

  const removePerso = (index: number) => {
    const persoToRemove = persos[index];
    if (!persoToRemove) return;

    const removedId = persoToRemove.id;
    const nextPersos = persos.filter((_, idx) => idx !== index);
    const nextGroups = recalculateGroups(nextPersos, groups);

    setPersos(nextPersos);
    setGroups(nextGroups);
    setPersoResources((previous) =>
      previous.filter((entry) => entry.perso_id !== removedId),
    );
    setLunes((previous) => removePersoFromLunes(previous, removedId));
    setOpenOverrides((previous) =>
      removePersoOpenOverrides(previous, removedId),
    );
    deletePersoEntity(removedId);
  };

  return {
    openPersoPage,
    closePersoPage,
    handlePersoUpdateById,
    handlePersoResourceUpdate,
    addPerso,
    removePerso,
  };
};
