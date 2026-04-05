import type { Dispatch, SetStateAction } from "react";
import type {
  Arme,
  Outil,
  PersistOptions,
  Perso,
  PersoArme,
  PersoOutil,
  PersoSac,
  Sac,
} from "../types";
import {
  createDefaultArme,
  createDefaultOutil,
  createDefaultSac,
} from "../utils/entityDefaults";
import {
  countAssignedBagsForSac,
  countAssignedToolsForOutil,
  countAssignedWeaponsForArme,
  getInventoryAvailabilityError,
  getNextInventoryItemId,
  normalizeArmeFieldValue,
  normalizeOptionalInventoryId,
  normalizeOutilFieldValue,
  normalizeSacFieldValue,
  normalizeSelectedInventoryIds,
  replacePersoAssignedEntries,
} from "../utils/inventoryUtils";
import type {
  ArmeEditableField,
  OutilEditableField,
  SacEditableField,
} from "../utils/inventoryUtils";

interface UseInventoryActionsParams {
  armes: Arme[];
  setArmes: Dispatch<SetStateAction<Arme[]>>;
  persoArmes: PersoArme[];
  setPersoArmes: Dispatch<SetStateAction<PersoArme[]>>;
  outils: Outil[];
  setOutils: Dispatch<SetStateAction<Outil[]>>;
  persoOutils: PersoOutil[];
  setPersoOutils: Dispatch<SetStateAction<PersoOutil[]>>;
  sacs: Sac[];
  setSacs: Dispatch<SetStateAction<Sac[]>>;
  persoSacs: PersoSac[];
  setPersoSacs: Dispatch<SetStateAction<PersoSac[]>>;
  setPersos: Dispatch<SetStateAction<Perso[]>>;
  saveArmeEntity: (arme: Arme) => void;
  deleteArmeEntity: (armeId: number) => void;
  savePersoArmesEntity: (persoId: number, nextPersoArmes: PersoArme[]) => void;
  saveOutilEntity: (outil: Outil) => void;
  deleteOutilEntity: (outilId: number) => void;
  savePersoOutilsEntity: (
    persoId: number,
    nextPersoOutils: PersoOutil[],
  ) => void;
  saveSacEntity: (sac: Sac) => void;
  deleteSacEntity: (sacId: number) => void;
  savePersoSacsEntity: (persoId: number, nextPersoSacs: PersoSac[]) => void;
}

const replacePersoInventoryEntries = <TEntry extends { perso_id: number }>(
  setEntries: Dispatch<SetStateAction<TEntry[]>>,
  persoId: number,
  nextEntries: TEntry[],
) => {
  setEntries((previous) =>
    replacePersoAssignedEntries(previous, persoId, nextEntries),
  );
};

const addInventoryEntity = <TItem extends { id: number }>({
  items,
  setItems,
  createItem,
  saveEntity,
}: {
  items: TItem[];
  setItems: Dispatch<SetStateAction<TItem[]>>;
  createItem: (nextId: number) => TItem;
  saveEntity: (item: TItem) => void;
}) => {
  const newItem = createItem(getNextInventoryItemId(items));
  setItems((previous) => [...previous, newItem]);
  saveEntity(newItem);
};

const updateInventoryEntity = <
  TItem extends { id: number },
  TField extends string,
>({
  items,
  index,
  field,
  rawValue,
  persist,
  normalizeFieldValue,
  getAssignedCount,
  quantityErrorMessage,
  setItems,
  saveEntity,
}: {
  items: TItem[];
  index: number;
  field: TField;
  rawValue: string | number;
  persist: boolean;
  normalizeFieldValue: (
    field: TField,
    rawValue: string | number,
  ) => string | number;
  getAssignedCount?: (itemId: number) => number;
  quantityErrorMessage?: (assignedCount: number) => string;
  setItems: Dispatch<SetStateAction<TItem[]>>;
  saveEntity: (item: TItem) => void;
}) => {
  const itemToUpdate = items[index];
  if (!itemToUpdate) return;

  const nextValue = normalizeFieldValue(field, rawValue);
  if (field === "quantity" && getAssignedCount && quantityErrorMessage) {
    const assignedCount = getAssignedCount(itemToUpdate.id);

    if (Number(nextValue) < assignedCount) {
      window.alert(quantityErrorMessage(assignedCount));
      return;
    }
  }

  const nextItem = {
    ...itemToUpdate,
    [field]: nextValue,
  } as TItem;

  setItems((previous) =>
    previous.map((item, currentIndex) =>
      currentIndex !== index ? item : nextItem,
    ),
  );
  if (persist) {
    saveEntity(nextItem);
  }
};

const removeInventoryEntity = <TItem extends { id: number }>({
  items,
  index,
  setItems,
  deleteEntity,
}: {
  items: TItem[];
  index: number;
  setItems: Dispatch<SetStateAction<TItem[]>>;
  deleteEntity: (itemId: number) => void;
}): TItem | null => {
  const itemToRemove = items[index];
  if (!itemToRemove) return null;

  setItems((previous) =>
    previous.filter((_, currentIndex) => currentIndex !== index),
  );
  deleteEntity(itemToRemove.id);
  return itemToRemove;
};

export const useInventoryActions = ({
  armes,
  setArmes,
  persoArmes,
  setPersoArmes,
  outils,
  setOutils,
  persoOutils,
  setPersoOutils,
  sacs,
  setSacs,
  persoSacs,
  setPersoSacs,
  setPersos,
  saveArmeEntity,
  deleteArmeEntity,
  savePersoArmesEntity,
  saveOutilEntity,
  deleteOutilEntity,
  savePersoOutilsEntity,
  saveSacEntity,
  deleteSacEntity,
  savePersoSacsEntity,
}: UseInventoryActionsParams) => {
  const handlePersoWeaponsUpdate = (
    persoId: number,
    carriedWeaponIds: Array<number | string>,
    equippedWeaponId: number | string | null,
  ) => {
    const uniqueWeaponIds = normalizeSelectedInventoryIds(carriedWeaponIds);
    const normalizedEquippedWeaponId =
      normalizeOptionalInventoryId(equippedWeaponId);

    if (
      normalizedEquippedWeaponId !== null &&
      !uniqueWeaponIds.includes(normalizedEquippedWeaponId)
    ) {
      window.alert("Une arme équipée doit d'abord être portée par le perso.");
      return;
    }

    const availabilityError = getInventoryAvailabilityError({
      selectedIds: uniqueWeaponIds,
      items: armes,
      excludedPersoId: persoId,
      countAssigned: (armeId, excludedPersoId) =>
        countAssignedWeaponsForArme(persoArmes, armeId, excludedPersoId),
      buildMessage: (arme, armeId, assignedToOthers, maxQuantity) =>
        `L'arme "${arme?.name || armeId}" n'est plus disponible (${assignedToOthers}/${maxQuantity} déjà attribuée(s)).`,
    });

    if (availabilityError) {
      window.alert(availabilityError);
      return;
    }

    const nextEntries: PersoArme[] = uniqueWeaponIds.map((armeId) => ({
      perso_id: persoId,
      arme_id: armeId,
      equipee: armeId === normalizedEquippedWeaponId,
    }));

    replacePersoInventoryEntries(setPersoArmes, persoId, nextEntries);

    setPersos((previous) =>
      previous.map((perso) =>
        perso.id !== persoId
          ? perso
          : {
              ...perso,
              equippedWeaponId: normalizedEquippedWeaponId,
              combatEffectif:
                normalizedEquippedWeaponId === null
                  ? Number(perso.combat ?? 0)
                  : (() => {
                      const equippedArme = armes.find(
                        (arme) => arme.id === normalizedEquippedWeaponId,
                      );
                      return (
                        Number(perso.combat ?? 0) *
                        Number(equippedArme?.att ?? 1)
                      );
                    })(),
            },
      ),
    );

    savePersoArmesEntity(persoId, nextEntries);
  };

  const handlePersoToolsUpdate = (
    persoId: number,
    carriedToolIds: Array<number | string>,
  ) => {
    const uniqueToolIds = normalizeSelectedInventoryIds(carriedToolIds);
    const availabilityError = getInventoryAvailabilityError({
      selectedIds: uniqueToolIds,
      items: outils,
      excludedPersoId: persoId,
      countAssigned: (outilId, excludedPersoId) =>
        countAssignedToolsForOutil(persoOutils, outilId, excludedPersoId),
      buildMessage: (outil, outilId, assignedToOthers, maxQuantity) =>
        `L'outil "${outil?.name || outilId}" n'est plus disponible (${assignedToOthers}/${maxQuantity} déjà attribué(s)).`,
    });

    if (availabilityError) {
      window.alert(availabilityError);
      return;
    }

    const nextEntries: PersoOutil[] = uniqueToolIds.map((outilId) => ({
      perso_id: persoId,
      outil_id: outilId,
    }));

    replacePersoInventoryEntries(setPersoOutils, persoId, nextEntries);
    savePersoOutilsEntity(persoId, nextEntries);
  };

  const handlePersoBagsUpdate = (
    persoId: number,
    carriedBagIds: Array<number | string>,
    equippedBagId: number | string | null,
  ) => {
    const uniqueBagIds = normalizeSelectedInventoryIds(carriedBagIds);
    const normalizedEquippedBagId = normalizeOptionalInventoryId(equippedBagId);

    if (
      normalizedEquippedBagId !== null &&
      !uniqueBagIds.includes(normalizedEquippedBagId)
    ) {
      window.alert("Un sac équipé doit d'abord être porté par le perso.");
      return;
    }

    const availabilityError = getInventoryAvailabilityError({
      selectedIds: uniqueBagIds,
      items: sacs,
      excludedPersoId: persoId,
      countAssigned: (sacId, excludedPersoId) =>
        countAssignedBagsForSac(persoSacs, sacId, excludedPersoId),
      buildMessage: (sac, sacId, assignedToOthers, maxQuantity) =>
        `Le sac "${sac?.name || sacId}" n'est plus disponible (${assignedToOthers}/${maxQuantity} déjà attribué(s)).`,
    });

    if (availabilityError) {
      window.alert(availabilityError);
      return;
    }

    const nextEntries: PersoSac[] = uniqueBagIds.map((sacId) => ({
      perso_id: persoId,
      sac_id: sacId,
      equipe: sacId === normalizedEquippedBagId,
    }));

    replacePersoInventoryEntries(setPersoSacs, persoId, nextEntries);

    setPersos((previous) =>
      previous.map((perso) =>
        perso.id !== persoId
          ? perso
          : {
              ...perso,
              equippedBagId: normalizedEquippedBagId,
              poidsMaxEffectif:
                Number(perso.poidsMax ?? 20) +
                Number(
                  sacs.find((sac) => sac.id === normalizedEquippedBagId)
                    ?.capacite ?? 0,
                ),
            },
      ),
    );

    savePersoSacsEntity(persoId, nextEntries);
  };

  const addArme = () => {
    addInventoryEntity({
      items: armes,
      setItems: setArmes,
      createItem: createDefaultArme,
      saveEntity: saveArmeEntity,
    });
  };

  const updateArme = (
    index: number,
    field: ArmeEditableField,
    rawValue: string | number,
    { persist = true }: PersistOptions = {},
  ) => {
    updateInventoryEntity({
      items: armes,
      index,
      field,
      rawValue,
      persist,
      normalizeFieldValue: normalizeArmeFieldValue,
      getAssignedCount: (armeId) =>
        countAssignedWeaponsForArme(persoArmes, armeId),
      quantityErrorMessage: (assignedCount) =>
        `Impossible de définir une quantité inférieure aux ${assignedCount} arme(s) déjà attribuée(s).`,
      setItems: setArmes,
      saveEntity: saveArmeEntity,
    });
  };

  const removeArme = (index: number) => {
    const armeToRemove = removeInventoryEntity({
      items: armes,
      index,
      setItems: setArmes,
      deleteEntity: deleteArmeEntity,
    });
    if (!armeToRemove) return;

    setPersoArmes((previous) =>
      previous.filter((entry) => entry.arme_id !== armeToRemove.id),
    );
    setPersos((previous) =>
      previous.map((perso) =>
        perso.equippedWeaponId !== armeToRemove.id
          ? perso
          : {
              ...perso,
              equippedWeaponId: null,
              combatEffectif: Number(perso.combat ?? 0),
            },
      ),
    );
  };

  const addOutil = () => {
    addInventoryEntity({
      items: outils,
      setItems: setOutils,
      createItem: createDefaultOutil,
      saveEntity: saveOutilEntity,
    });
  };

  const updateOutil = (
    index: number,
    field: OutilEditableField,
    rawValue: string | number,
    { persist = true }: PersistOptions = {},
  ) => {
    updateInventoryEntity({
      items: outils,
      index,
      field,
      rawValue,
      persist,
      normalizeFieldValue: normalizeOutilFieldValue,
      getAssignedCount: (outilId) =>
        countAssignedToolsForOutil(persoOutils, outilId),
      quantityErrorMessage: (assignedCount) =>
        `Impossible de définir une quantité inférieure aux ${assignedCount} outil(s) déjà attribué(s).`,
      setItems: setOutils,
      saveEntity: saveOutilEntity,
    });
  };

  const removeOutil = (index: number) => {
    const outilToRemove = removeInventoryEntity({
      items: outils,
      index,
      setItems: setOutils,
      deleteEntity: deleteOutilEntity,
    });
    if (!outilToRemove) return;

    setPersoOutils((previous) =>
      previous.filter((entry) => entry.outil_id !== outilToRemove.id),
    );
  };

  const addSac = () => {
    addInventoryEntity({
      items: sacs,
      setItems: setSacs,
      createItem: createDefaultSac,
      saveEntity: saveSacEntity,
    });
  };

  const updateSac = (
    index: number,
    field: SacEditableField,
    rawValue: string | number,
    { persist = true }: PersistOptions = {},
  ) => {
    updateInventoryEntity({
      items: sacs,
      index,
      field,
      rawValue,
      persist,
      normalizeFieldValue: normalizeSacFieldValue,
      getAssignedCount: (sacId) => countAssignedBagsForSac(persoSacs, sacId),
      quantityErrorMessage: (assignedCount) =>
        `Impossible de définir une quantité inférieure aux ${assignedCount} sac(s) déjà attribué(s).`,
      setItems: setSacs,
      saveEntity: saveSacEntity,
    });
  };

  const removeSac = (index: number) => {
    const sacToRemove = removeInventoryEntity({
      items: sacs,
      index,
      setItems: setSacs,
      deleteEntity: deleteSacEntity,
    });
    if (!sacToRemove) return;

    setPersoSacs((previous) =>
      previous.filter((entry) => entry.sac_id !== sacToRemove.id),
    );
    setPersos((previous) =>
      previous.map((perso) =>
        perso.equippedBagId !== sacToRemove.id
          ? perso
          : {
              ...perso,
              equippedBagId: null,
              poidsMaxEffectif: Number(perso.poidsMax ?? 20),
            },
      ),
    );
  };

  return {
    handlePersoWeaponsUpdate,
    handlePersoToolsUpdate,
    handlePersoBagsUpdate,
    addArme,
    updateArme,
    removeArme,
    addOutil,
    updateOutil,
    removeOutil,
    addSac,
    updateSac,
    removeSac,
  };
};
