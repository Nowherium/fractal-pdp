import {
  countAssignedBagsForSac,
  countAssignedToolsForOutil,
  countAssignedWeaponsForArme,
  normalizeArmeFieldValue,
  normalizeOutilFieldValue,
  normalizeSacFieldValue,
} from "../utils/inventoryUtils";

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
}) => {
  const handlePersoWeaponsUpdate = (
    persoId,
    carriedWeaponIds,
    equippedWeaponId,
  ) => {
    const uniqueWeaponIds = Array.from(
      new Set(
        carriedWeaponIds
          .map((id) => Number(id))
          .filter((id) => Number.isFinite(id)),
      ),
    );

    const normalizedEquippedWeaponId =
      equippedWeaponId === null ||
      equippedWeaponId === undefined ||
      equippedWeaponId === ""
        ? null
        : Number(equippedWeaponId);

    if (
      normalizedEquippedWeaponId !== null &&
      !uniqueWeaponIds.includes(normalizedEquippedWeaponId)
    ) {
      window.alert("Une arme équipée doit d'abord être portée par le perso.");
      return;
    }

    for (const armeId of uniqueWeaponIds) {
      const arme = armes.find((item) => item.id === armeId);
      const maxQuantity = Math.max(0, Math.floor(Number(arme?.quantity ?? 1)));
      const assignedToOthers = countAssignedWeaponsForArme(
        persoArmes,
        armeId,
        persoId,
      );

      if (assignedToOthers + 1 > maxQuantity) {
        window.alert(
          `L'arme "${arme?.name || armeId}" n'est plus disponible (${assignedToOthers}/${maxQuantity} déjà attribuée(s)).`,
        );
        return;
      }
    }

    const nextEntries = uniqueWeaponIds.map((armeId) => ({
      perso_id: persoId,
      arme_id: armeId,
      equipee: armeId === normalizedEquippedWeaponId,
    }));

    setPersoArmes((previous) => {
      const remainingEntries = previous.filter(
        (entry) => entry.perso_id !== persoId,
      );
      return [...remainingEntries, ...nextEntries];
    });

    setPersos((previous) =>
      previous.map((perso) =>
        perso.id !== persoId
          ? perso
          : {
              ...perso,
              equippedWeaponId: normalizedEquippedWeaponId,
              combatEffectif:
                normalizedEquippedWeaponId === null
                  ? perso.combat
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

  const handlePersoToolsUpdate = (persoId, carriedToolIds) => {
    const uniqueToolIds = Array.from(
      new Set(
        carriedToolIds
          .map((id) => Number(id))
          .filter((id) => Number.isFinite(id)),
      ),
    );

    for (const outilId of uniqueToolIds) {
      const outil = outils.find((item) => item.id === outilId);
      const maxQuantity = Math.max(0, Math.floor(Number(outil?.quantity ?? 1)));
      const assignedToOthers = countAssignedToolsForOutil(
        persoOutils,
        outilId,
        persoId,
      );

      if (assignedToOthers + 1 > maxQuantity) {
        window.alert(
          `L'outil "${outil?.name || outilId}" n'est plus disponible (${assignedToOthers}/${maxQuantity} déjà attribué(s)).`,
        );
        return;
      }
    }

    const nextEntries = uniqueToolIds.map((outilId) => ({
      perso_id: persoId,
      outil_id: outilId,
    }));

    setPersoOutils((previous) => {
      const remainingEntries = previous.filter(
        (entry) => entry.perso_id !== persoId,
      );
      return [...remainingEntries, ...nextEntries];
    });

    savePersoOutilsEntity(persoId, nextEntries);
  };

  const handlePersoBagsUpdate = (persoId, carriedBagIds, equippedBagId) => {
    const uniqueBagIds = Array.from(
      new Set(
        carriedBagIds
          .map((id) => Number(id))
          .filter((id) => Number.isFinite(id)),
      ),
    );

    const normalizedEquippedBagId =
      equippedBagId === null ||
      equippedBagId === undefined ||
      equippedBagId === ""
        ? null
        : Number(equippedBagId);

    if (
      normalizedEquippedBagId !== null &&
      !uniqueBagIds.includes(normalizedEquippedBagId)
    ) {
      window.alert("Un sac équipé doit d'abord être porté par le perso.");
      return;
    }

    for (const sacId of uniqueBagIds) {
      const sac = sacs.find((item) => item.id === sacId);
      const maxQuantity = Math.max(0, Math.floor(Number(sac?.quantity ?? 1)));
      const assignedToOthers = countAssignedBagsForSac(
        persoSacs,
        sacId,
        persoId,
      );

      if (assignedToOthers + 1 > maxQuantity) {
        window.alert(
          `Le sac "${sac?.name || sacId}" n'est plus disponible (${assignedToOthers}/${maxQuantity} déjà attribué(s)).`,
        );
        return;
      }
    }

    const nextEntries = uniqueBagIds.map((sacId) => ({
      perso_id: persoId,
      sac_id: sacId,
      equipe: sacId === normalizedEquippedBagId,
    }));

    setPersoSacs((previous) => {
      const remainingEntries = previous.filter(
        (entry) => entry.perso_id !== persoId,
      );
      return [...remainingEntries, ...nextEntries];
    });

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
    const nextArmeId =
      armes.reduce((maxId, arme) => Math.max(maxId, Number(arme.id) || 0), 0) +
      1;

    const newArme = {
      id: nextArmeId,
      name: "Nouvelle arme",
      att: 1,
      degats: 0,
      fiabilite: 0,
      pv: 0,
      pvm: 0,
      poids: 0,
      quantity: 1,
    };

    setArmes((previous) => [...previous, newArme]);
    saveArmeEntity(newArme);
  };

  const updateArme = (index, field, rawValue, { persist = true } = {}) => {
    const armeToUpdate = armes[index];
    if (!armeToUpdate) return;

    const nextValue = normalizeArmeFieldValue(field, rawValue);
    if (field === "quantity") {
      const assignedCount = countAssignedWeaponsForArme(
        persoArmes,
        armeToUpdate.id,
      );

      if (nextValue < assignedCount) {
        window.alert(
          `Impossible de définir une quantité inférieure aux ${assignedCount} arme(s) déjà attribuée(s).`,
        );
        return;
      }
    }

    const nextArme = {
      ...armeToUpdate,
      [field]: nextValue,
    };

    setArmes((previous) =>
      previous.map((arme, currentIndex) =>
        currentIndex !== index ? arme : nextArme,
      ),
    );
    if (persist) {
      saveArmeEntity(nextArme);
    }
  };

  const removeArme = (index) => {
    const armeToRemove = armes[index];
    if (!armeToRemove) return;

    setArmes((previous) =>
      previous.filter((_, currentIndex) => currentIndex !== index),
    );
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
    deleteArmeEntity(armeToRemove.id);
  };

  const addOutil = () => {
    const nextOutilId =
      outils.reduce(
        (maxId, outil) => Math.max(maxId, Number(outil.id) || 0),
        0,
      ) + 1;

    const newOutil = {
      id: nextOutilId,
      name: "Nouvel outil",
      specialite: "eau",
      bonus: 1,
      pv: 0,
      pvmax: 0,
      poids: 0,
      quantity: 1,
    };

    setOutils((previous) => [...previous, newOutil]);
    saveOutilEntity(newOutil);
  };

  const updateOutil = (index, field, rawValue, { persist = true } = {}) => {
    const outilToUpdate = outils[index];
    if (!outilToUpdate) return;

    const nextValue = normalizeOutilFieldValue(field, rawValue);
    if (field === "quantity") {
      const assignedCount = countAssignedToolsForOutil(
        persoOutils,
        outilToUpdate.id,
      );

      if (nextValue < assignedCount) {
        window.alert(
          `Impossible de définir une quantité inférieure aux ${assignedCount} outil(s) déjà attribué(s).`,
        );
        return;
      }
    }

    const nextOutil = {
      ...outilToUpdate,
      [field]: nextValue,
    };

    setOutils((previous) =>
      previous.map((outil, currentIndex) =>
        currentIndex !== index ? outil : nextOutil,
      ),
    );
    if (persist) {
      saveOutilEntity(nextOutil);
    }
  };

  const removeOutil = (index) => {
    const outilToRemove = outils[index];
    if (!outilToRemove) return;

    setOutils((previous) =>
      previous.filter((_, currentIndex) => currentIndex !== index),
    );
    setPersoOutils((previous) =>
      previous.filter((entry) => entry.outil_id !== outilToRemove.id),
    );
    deleteOutilEntity(outilToRemove.id);
  };

  const addSac = () => {
    const nextSacId =
      sacs.reduce((maxId, sac) => Math.max(maxId, Number(sac.id) || 0), 0) + 1;

    const newSac = {
      id: nextSacId,
      name: "Nouveau sac",
      pv: 0,
      pvmax: 0,
      poids: 0,
      capacite: 0,
      quantity: 1,
    };

    setSacs((previous) => [...previous, newSac]);
    saveSacEntity(newSac);
  };

  const updateSac = (index, field, rawValue, { persist = true } = {}) => {
    const sacToUpdate = sacs[index];
    if (!sacToUpdate) return;

    const nextValue = normalizeSacFieldValue(field, rawValue);
    if (field === "quantity") {
      const assignedCount = countAssignedBagsForSac(persoSacs, sacToUpdate.id);

      if (nextValue < assignedCount) {
        window.alert(
          `Impossible de définir une quantité inférieure aux ${assignedCount} sac(s) déjà attribué(s).`,
        );
        return;
      }
    }

    const nextSac = {
      ...sacToUpdate,
      [field]: nextValue,
    };

    setSacs((previous) =>
      previous.map((sac, currentIndex) =>
        currentIndex !== index ? sac : nextSac,
      ),
    );
    if (persist) {
      saveSacEntity(nextSac);
    }
  };

  const removeSac = (index) => {
    const sacToRemove = sacs[index];
    if (!sacToRemove) return;

    setSacs((previous) =>
      previous.filter((_, currentIndex) => currentIndex !== index),
    );
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
    deleteSacEntity(sacToRemove.id);
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
