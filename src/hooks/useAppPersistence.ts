import {
  useEffect,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from "react";
import type {
  Arme,
  CityMultipliers,
  Group,
  Lune,
  LuneConstruction,
  Outil,
  Terrain,
  Perso,
  PersoArme,
  PersoOutil,
  PersoResource,
  PersoSac,
  Resource,
  Sac,
  Action,
} from "../types";
import { loadState } from "../utils/api";
import { useDebouncedApiSave } from "../utils/useDebouncedApiSave";
import { buildFallbackState } from "../utils/stateUtils";

interface UseInitialAppLoadParams {
  setCompleteState: (rawState: unknown) => unknown;
  setSaveStatus: Dispatch<SetStateAction<string>>;
  setLoadError: Dispatch<SetStateAction<string>>;
  setReady: Dispatch<SetStateAction<boolean>>;
}

interface UseAppEntitySavesParams {
  ready: boolean;
  isHydratingRef: MutableRefObject<boolean>;
  setSaveStatus: Dispatch<SetStateAction<string>>;
}

export const useInitialAppLoad = ({
  setCompleteState,
  setSaveStatus,
  setLoadError,
  setReady,
}: UseInitialAppLoadParams) => {
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
  }, [setCompleteState, setLoadError, setReady, setSaveStatus]);
};

export const useAppEntitySaves = ({
  ready,
  isHydratingRef,
  setSaveStatus,
}: UseAppEntitySavesParams) => {
  const queueSave = useDebouncedApiSave({
    ready,
    isHydratingRef,
    setSaveStatus,
  });

  return {
    saveCityMultipliersEntity: (cityMultipliers: CityMultipliers) =>
      queueSave(`city-multipliers`, `/api/city-multipliers`, {
        cityMultipliers,
      }),
    saveTerrainsEntity: (terrains: Terrain[]) =>
      queueSave(`terrains`, `/api/terrains`, {
        terrains,
      }),
    saveCurrentTerrainEntity: (currentTerrainId: number | null) =>
      queueSave(`current-terrain`, `/api/current-terrain`, {
        currentTerrainId,
      }),
    saveCurrentLuneEntity: (currentLune: number) =>
      queueSave(`current-lune`, `/api/current-lune`, {
        currentLune,
      }),
    saveConstructionsEntity: (constructions: LuneConstruction[]) =>
      queueSave(`constructions`, `/api/constructions`, {
        constructions,
      }),
    saveResourceEntity: (resource: Resource) =>
      queueSave(`resource-${resource.id}`, `/api/resources/${resource.id}`, {
        resource,
      }),
    deleteResourceEntity: (resourceId: number) =>
      queueSave(
        `resource-${resourceId}`,
        `/api/resources/${resourceId}`,
        undefined,
        "DELETE",
      ),
    savePersoEntity: (perso: Perso) =>
      queueSave(`perso-${perso.id}`, `/api/persos/${perso.id}`, { perso }),
    deletePersoEntity: (persoId: number) =>
      queueSave(
        `perso-${persoId}`,
        `/api/persos/${persoId}`,
        undefined,
        "DELETE",
      ),
    savePersoResourcesEntity: (
      persoId: number,
      nextPersoResources: PersoResource[],
    ) =>
      queueSave(
        `perso-resources-${persoId}`,
        `/api/persos/${persoId}/resources`,
        {
          persoResources: nextPersoResources,
        },
      ),
    saveGroupEntity: (group: Group) =>
      queueSave(`group-${group.id}`, `/api/groups/${group.id}`, { group }),
    deleteGroupEntity: (groupId: number) =>
      queueSave(
        `group-${groupId}`,
        `/api/groups/${groupId}`,
        undefined,
        "DELETE",
      ),
    saveGroupMembersEntity: (groupId: number, memberIds: number[]) =>
      queueSave(`group-members-${groupId}`, `/api/groups/${groupId}/members`, {
        memberIds,
      }),
    saveArmeEntity: (arme: Arme) =>
      queueSave(`arme-${arme.id}`, `/api/armes/${arme.id}`, { arme }),
    deleteArmeEntity: (armeId: number) =>
      queueSave(`arme-${armeId}`, `/api/armes/${armeId}`, undefined, "DELETE"),
    savePersoArmesEntity: (persoId: number, nextPersoArmes: PersoArme[]) =>
      queueSave(`perso-armes-${persoId}`, `/api/persos/${persoId}/armes`, {
        persoArmes: nextPersoArmes,
      }),
    saveOutilEntity: (outil: Outil) =>
      queueSave(`outil-${outil.id}`, `/api/outils/${outil.id}`, { outil }),
    deleteOutilEntity: (outilId: number) =>
      queueSave(
        `outil-${outilId}`,
        `/api/outils/${outilId}`,
        undefined,
        "DELETE",
      ),
    saveActionsEntity: (action: Action) =>
      queueSave(`action-${action.id}`, `/api/actions/${action.id}`, { action }),
    deleteActionsEntity: (actionId: number) =>
      queueSave(
        `action-${actionId}`,
        `/api/actions/${actionId}`,
        undefined,
        "DELETE",
      ),
    savePersoOutilsEntity: (persoId: number, nextPersoOutils: PersoOutil[]) =>
      queueSave(`perso-outils-${persoId}`, `/api/persos/${persoId}/outils`, {
        persoOutils: nextPersoOutils,
      }),
    saveSacEntity: (sac: Sac) =>
      queueSave(`sac-${sac.id}`, `/api/sacs/${sac.id}`, { sac }),
    deleteSacEntity: (sacId: number) =>
      queueSave(`sac-${sacId}`, `/api/sacs/${sacId}`, undefined, "DELETE"),
    savePersoSacsEntity: (persoId: number, nextPersoSacs: PersoSac[]) =>
      queueSave(`perso-sacs-${persoId}`, `/api/persos/${persoId}/sacs`, {
        persoSacs: nextPersoSacs,
      }),
    saveLuneEntity: (lune: Lune) =>
      queueSave(`lune-${lune.id}`, `/api/lunes/${lune.id}`, { lune }),
    deleteLuneEntity: (luneId: number) =>
      queueSave(`lune-${luneId}`, `/api/lunes/${luneId}`, undefined, "DELETE"),
    saveStockEntity: (code: string, quantity: number) =>
      queueSave(`stock-${code}`, `/api/stocks/${code}`, { quantity }),
  };
};
