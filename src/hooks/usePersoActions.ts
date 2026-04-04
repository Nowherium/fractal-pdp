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
} from "../types";
import {
  recalculateGroups,
  validateGroupCapacities,
} from "../utils/groupUtils";
import { createDefaultPerso } from "../utils/entityDefaults";
import { defaultRation, normalizePersoFieldValue } from "../utils/stateUtils";

interface UsePersoActionsParams {
  persos: Perso[];
  groups: Group[];
  resources: Resource[];
  sacs: Sac[];
  persoResources: PersoResource[];
  lunes: Lune[];
  nextPersoId: number;
  setPersos: Dispatch<SetStateAction<Perso[]>>;
  setGroups: Dispatch<SetStateAction<Group[]>>;
  setPersoResources: Dispatch<SetStateAction<PersoResource[]>>;
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
  saveLuneEntity: (lune: Lune) => void;
}

export const usePersoActions = ({
  persos,
  groups,
  resources,
  sacs,
  persoResources,
  lunes,
  nextPersoId,
  setPersos,
  setGroups,
  setPersoResources,
  setLunes,
  setPage,
  setSelectedPersoId,
  setOpenOverrides,
  setNextPersoId,
  savePersoEntity,
  deletePersoEntity,
  savePersoResourcesEntity,
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
    const nextPersos = persos.map((perso) => {
      if (perso.id !== persoId) {
        return perso;
      }

      const nextValue = normalizePersoFieldValue(field, rawValue);
      return {
        ...perso,
        [field]: nextValue,
        ...(field === "poidsMax"
          ? {
              poidsMaxEffectif:
                Number(nextValue) +
                Number(
                  sacs.find((sac) => sac.id === perso.equippedBagId)
                    ?.capacite ?? 0,
                ),
            }
          : {}),
      };
    });

    if (field === "groupId" || field === "cmd") {
      const nextGroups = recalculateGroups(nextPersos, groups);
      const capacityError = validateGroupCapacities(nextPersos, nextGroups);
      if (capacityError) {
        window.alert(capacityError);
        return;
      }
      setGroups(nextGroups);
    }

    setPersos(nextPersos);
    const updatedPerso = nextPersos.find((perso) => perso.id === persoId);
    if (persist && updatedPerso) {
      savePersoEntity(updatedPerso);
    }
  };

  const handlePersoResourceUpdate = (
    persoId: number,
    resourceId: number,
    rawValue: string | number,
  ) => {
    const quantity = Math.max(0, Number(rawValue) || 0);

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
              quantity,
            },
          ].sort(
            (left, right) =>
              left.perso_id - right.perso_id ||
              left.resource_id - right.resource_id,
          );

    setPersoResources(nextPersoResources);
    savePersoResourcesEntity(
      persoId,
      nextPersoResources.filter((entry) => entry.perso_id === persoId),
    );
  };

  const addPerso = () => {
    const newPerso: Perso = createDefaultPerso(nextPersoId);

    setPersos((previous) => [...previous, newPerso]);
    setPersoResources((previous) => [
      ...previous,
      ...resources.map((resource) => ({
        perso_id: newPerso.id,
        resource_id: resource.id,
        quantity: 0,
      })),
    ]);

    const nextLunes = lunes.map((lune) => ({
      ...lune,
      rations: {
        ...lune.rations,
        [newPerso.id]: defaultRation(),
      },
    }));

    setLunes(nextLunes);
    setSelectedPersoId(newPerso.id);
    setPage("perso");
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
    setLunes((previous) =>
      previous.map((lune) => {
        const rations = { ...lune.rations };
        delete rations[removedId];
        const overrides = { ...lune.overrides };
        delete overrides[removedId];
        return { ...lune, rations, overrides };
      }),
    );
    setOpenOverrides((previous) => {
      const next = { ...previous };
      Object.keys(next).forEach((key) => {
        if (key.endsWith(`-${removedId}`)) delete next[key];
      });
      return next;
    });
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
