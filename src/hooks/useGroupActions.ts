import type { Dispatch, SetStateAction } from "react";
import type { AppPage, Group, Perso } from "../types";
import {
  recalculateGroups,
  validateGroupCapacities,
} from "../utils/groupUtils";

type PersistOptions = {
  persist?: boolean;
};

interface UseGroupActionsParams {
  groups: Group[];
  persos: Perso[];
  setGroups: Dispatch<SetStateAction<Group[]>>;
  setPersos: Dispatch<SetStateAction<Perso[]>>;
  setSelectedGroupId: Dispatch<SetStateAction<number | null>>;
  setPage: Dispatch<SetStateAction<AppPage>>;
  saveGroupEntity: (group: Group) => void;
  deleteGroupEntity: (groupId: number) => void;
  saveGroupMembersEntity: (groupId: number, memberIds: number[]) => void;
  savePersoEntity: (perso: Perso) => void;
}

export const useGroupActions = ({
  groups,
  persos,
  setGroups,
  setPersos,
  setSelectedGroupId,
  setPage,
  saveGroupEntity,
  deleteGroupEntity,
  saveGroupMembersEntity,
  savePersoEntity,
}: UseGroupActionsParams) => {
  const openGroupPage = (groupId: number) => {
    setSelectedGroupId(groupId);
    setPage("group");
  };

  const openGroupViewPage = (groupId: number) => {
    setSelectedGroupId(groupId);
    setPage("group-view");
  };

  const closeGroupPage = () => {
    setPage("groupes");
    setSelectedGroupId(null);
  };

  const addGroup = () => {
    const nextGroupId =
      groups.reduce(
        (maxId, group) => Math.max(maxId, Number(group.id) || 0),
        0,
      ) + 1;

    const newGroup: Group = {
      id: nextGroupId,
      name: `Nouveau groupe ${nextGroupId}`,
      chef: null,
    };

    setGroups((previous) => [...previous, newGroup]);
    setSelectedGroupId(newGroup.id);
    setPage("group");
    saveGroupEntity(newGroup);
  };

  const removeGroup = (groupId: number) => {
    const nextGroups = groups.filter((group) => group.id !== groupId);
    const updatedPersos = persos.map((perso) =>
      perso.groupId === groupId ? { ...perso, groupId: null } : perso,
    );

    setGroups(nextGroups);
    setPersos(updatedPersos);
    setSelectedGroupId((current) => (current === groupId ? null : current));
    setPage("groupes");

    updatedPersos
      .filter((perso) => perso.groupId === null)
      .forEach((perso) => {
        if (
          persos.some(
            (currentPerso) =>
              currentPerso.id === perso.id && currentPerso.groupId === groupId,
          )
        ) {
          savePersoEntity(perso);
        }
      });

    deleteGroupEntity(groupId);
  };

  const handleGroupUpdate = (
    groupId: number,
    field: string,
    rawValue: string | number | boolean | null,
    { persist = true }: PersistOptions = {},
  ) => {
    const nextGroups = groups.map((group) =>
      group.id !== groupId
        ? group
        : {
            ...group,
            [field]:
              field === "chef"
                ? rawValue === null
                  ? null
                  : Number(rawValue)
                : rawValue,
          },
    );

    setGroups(nextGroups);
    const updatedGroup = nextGroups.find((group) => group.id === groupId);
    if (persist && updatedGroup) {
      saveGroupEntity(updatedGroup);
    }
  };

  const handleGroupMembersUpdate = (
    groupId: number,
    selectedMemberIds: Array<number | string>,
  ) => {
    const uniqueIds = Array.from(
      new Set(
        selectedMemberIds
          .map((id) => Number(id))
          .filter((id) => Number.isFinite(id)),
      ),
    );

    const nextPersos = persos.map((perso) => {
      if (uniqueIds.includes(perso.id)) {
        return { ...perso, groupId };
      }
      if (perso.groupId === groupId) {
        return { ...perso, groupId: null };
      }
      return perso;
    });

    const nextGroups = recalculateGroups(nextPersos, groups);
    const capacityError = validateGroupCapacities(nextPersos, nextGroups);
    if (capacityError) {
      window.alert(capacityError);
      return;
    }

    setPersos(nextPersos);
    setGroups(nextGroups);
    saveGroupMembersEntity(groupId, uniqueIds);
  };

  const setGroupPresence = (groupId: number, isPresent: boolean) => {
    const memberIdSet = new Set(
      persos
        .filter((perso) => perso.groupId === groupId)
        .map((perso) => perso.id),
    );

    if (memberIdSet.size === 0) {
      return;
    }

    const changedPersos = persos.filter(
      (perso) =>
        memberIdSet.has(perso.id) && (perso.present !== false) !== isPresent,
    );

    if (changedPersos.length === 0) {
      return;
    }

    const nextPersos = persos.map((perso) =>
      memberIdSet.has(perso.id) ? { ...perso, present: isPresent } : perso,
    );

    setPersos(nextPersos);
    nextPersos
      .filter((perso) => memberIdSet.has(perso.id))
      .forEach((perso) => savePersoEntity(perso));
  };

  const handleGroupUpdateSafe = (
    groupId: number,
    field: string,
    rawValue: string | number | boolean | null,
    options: PersistOptions = {},
  ) => {
    if (field !== "chef") {
      handleGroupUpdate(groupId, field, rawValue, options);
      return;
    }

    const members = persos
      .filter((perso) => perso.groupId === groupId)
      .map((perso) => perso.id);

    const nextChef =
      rawValue === null || rawValue === undefined
        ? (members[0] ?? null)
        : Number(rawValue);

    if (nextChef === null || !members.includes(nextChef)) {
      return;
    }

    const nextGroups = groups.map((group) =>
      group.id !== groupId
        ? group
        : {
            ...group,
            chef: nextChef,
          },
    );

    const capacityError = validateGroupCapacities(persos, nextGroups);
    if (capacityError) {
      window.alert(capacityError);
      return;
    }

    setGroups(nextGroups);
    const updatedGroup = nextGroups.find((group) => group.id === groupId);
    if (updatedGroup) {
      saveGroupEntity(updatedGroup);
    }
  };

  return {
    openGroupPage,
    openGroupViewPage,
    closeGroupPage,
    addGroup,
    removeGroup,
    handleGroupMembersUpdate,
    handleGroupUpdateSafe,
    setGroupPresence,
  };
};
