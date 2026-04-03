import { useEffect } from "react";
import { loadState } from "../utils/api";
import { useDebouncedApiSave } from "../utils/useDebouncedApiSave";
import { buildFallbackState } from "../utils/stateUtils";

export const useInitialAppLoad = ({
  setCompleteState,
  setSaveStatus,
  setLoadError,
  setReady,
}) => {
  useEffect(() => {
    const loadBackend = async () => {
      try {
        const data = await loadState();
        setCompleteState(data);
        setSaveStatus("(Auto-sauvegarde active)");
      } catch (error) {
        console.error(error);
        setLoadError(
          "Impossible de charger la base de données. Utilisation du mode local temporaire.",
        );
        setCompleteState(buildFallbackState());
        setSaveStatus("(Auto-sauvegarde locale)");
      } finally {
        setReady(true);
      }
    };

    loadBackend();
  }, []);
};

export const useAppEntitySaves = ({ ready, isHydratingRef, setSaveStatus }) => {
  const queueSave = useDebouncedApiSave({
    ready,
    isHydratingRef,
    setSaveStatus,
  });

  return {
    saveCityMultipliersEntity: (cityMultipliers) =>
      queueSave(`city-multipliers`, `/api/city-multipliers`, {
        cityMultipliers,
      }),
    saveResourceEntity: (resource) =>
      queueSave(`resource-${resource.id}`, `/api/resources/${resource.id}`, {
        resource,
      }),
    deleteResourceEntity: (resourceId) =>
      queueSave(
        `resource-${resourceId}`,
        `/api/resources/${resourceId}`,
        undefined,
        "DELETE",
      ),
    savePersoEntity: (perso) =>
      queueSave(`perso-${perso.id}`, `/api/persos/${perso.id}`, { perso }),
    deletePersoEntity: (persoId) =>
      queueSave(
        `perso-${persoId}`,
        `/api/persos/${persoId}`,
        undefined,
        "DELETE",
      ),
    savePersoResourcesEntity: (persoId, nextPersoResources) =>
      queueSave(
        `perso-resources-${persoId}`,
        `/api/persos/${persoId}/resources`,
        {
          persoResources: nextPersoResources,
        },
      ),
    saveGroupEntity: (group) =>
      queueSave(`group-${group.id}`, `/api/groups/${group.id}`, { group }),
    saveGroupMembersEntity: (groupId, memberIds) =>
      queueSave(`group-members-${groupId}`, `/api/groups/${groupId}/members`, {
        memberIds,
      }),
    saveArmeEntity: (arme) =>
      queueSave(`arme-${arme.id}`, `/api/armes/${arme.id}`, { arme }),
    deleteArmeEntity: (armeId) =>
      queueSave(`arme-${armeId}`, `/api/armes/${armeId}`, undefined, "DELETE"),
    savePersoArmesEntity: (persoId, nextPersoArmes) =>
      queueSave(`perso-armes-${persoId}`, `/api/persos/${persoId}/armes`, {
        persoArmes: nextPersoArmes,
      }),
    saveOutilEntity: (outil) =>
      queueSave(`outil-${outil.id}`, `/api/outils/${outil.id}`, { outil }),
    deleteOutilEntity: (outilId) =>
      queueSave(
        `outil-${outilId}`,
        `/api/outils/${outilId}`,
        undefined,
        "DELETE",
      ),
    savePersoOutilsEntity: (persoId, nextPersoOutils) =>
      queueSave(`perso-outils-${persoId}`, `/api/persos/${persoId}/outils`, {
        persoOutils: nextPersoOutils,
      }),
    saveSacEntity: (sac) =>
      queueSave(`sac-${sac.id}`, `/api/sacs/${sac.id}`, { sac }),
    deleteSacEntity: (sacId) =>
      queueSave(`sac-${sacId}`, `/api/sacs/${sacId}`, undefined, "DELETE"),
    savePersoSacsEntity: (persoId, nextPersoSacs) =>
      queueSave(`perso-sacs-${persoId}`, `/api/persos/${persoId}/sacs`, {
        persoSacs: nextPersoSacs,
      }),
    saveLuneEntity: (lune) =>
      queueSave(`lune-${lune.id}`, `/api/lunes/${lune.id}`, { lune }),
    deleteLuneEntity: (luneId) =>
      queueSave(`lune-${luneId}`, `/api/lunes/${luneId}`, undefined, "DELETE"),
    saveStockEntity: (code, quantity) =>
      queueSave(`stock-${code}`, `/api/stocks/${code}`, { quantity }),
  };
};
