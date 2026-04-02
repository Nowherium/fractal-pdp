import {
  recalculateGroups,
  validateGroupCapacities,
} from "../utils/groupUtils";
import { defaultRation, normalizePersoFieldValue } from "../utils/stateUtils";

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
}) => {
  const openPersoPage = (persoId) => {
    setSelectedPersoId(persoId);
    setPage("perso");
  };

  const closePersoPage = () => {
    setPage("effectif");
    setSelectedPersoId(null);
  };

  const handlePersoUpdateById = (
    persoId,
    field,
    rawValue,
    { persist = true } = {},
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

  const handlePersoResourceUpdate = (persoId, resourceId, rawValue) => {
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
    const newPerso = {
      id: nextPersoId,
      nom: "Nouveau",
      pvmax: 10,
      pv: 10,
      capEau: 1,
      capNrt: 1,
      capMed: 0,
      capMat: 1,
      capart: 0,
      cmd: 0,
      combat: 0,
      poidsMax: 20,
      poidsMaxEffectif: 20,
      groupId: groups[0]?.id ?? null,
    };

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

  const removePerso = (index) => {
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
