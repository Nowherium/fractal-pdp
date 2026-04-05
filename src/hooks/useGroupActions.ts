import type { Dispatch, SetStateAction } from "react";
import type { AppPage, Group, PersistOptions, Perso } from "../types";
import {
  buildGroupMembersUpdate,
  buildGroupPresenceUpdate,
  buildGroupRemoval,
  buildGroupUpdate,
  buildSafeGroupChefUpdate,
  createDefaultGroup,
} from "../utils/groupActionUtils";

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
  const persistPersosByIds = (
    persoIds: number[],
    candidatePersos: Perso[],
  ): void => {
    const persoIdSet = new Set(persoIds);
    candidatePersos
      .filter((perso) => persoIdSet.has(perso.id))
      .forEach((perso) => savePersoEntity(perso));
  };

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
    const newGroup: Group = createDefaultGroup(groups);

    setGroups((previous) => [...previous, newGroup]);
    setSelectedGroupId(newGroup.id);
    setPage("group");
    saveGroupEntity(newGroup);
  };

  const removeGroup = (groupId: number) => {
    const { nextGroups, nextPersos, changedPersoIds } = buildGroupRemoval({
      groups,
      persos,
      groupId,
    });

    setGroups(nextGroups);
    setPersos(nextPersos);
    setSelectedGroupId((current) => (current === groupId ? null : current));
    setPage("groupes");
    persistPersosByIds(changedPersoIds, nextPersos);
    deleteGroupEntity(groupId);
  };

  const handleGroupUpdate = (
    groupId: number,
    field: string,
    rawValue: string | number | boolean | null,
    { persist = true }: PersistOptions = {},
  ) => {
    const { nextGroups, updatedGroup } = buildGroupUpdate({
      groups,
      groupId,
      field,
      rawValue,
    });

    setGroups(nextGroups);
    if (persist && updatedGroup) {
      saveGroupEntity(updatedGroup);
    }
  };

  const handleGroupMembersUpdate = (
    groupId: number,
    selectedMemberIds: Array<number | string>,
  ) => {
    const { uniqueIds, nextPersos, nextGroups, capacityError } =
      buildGroupMembersUpdate({
        groups,
        persos,
        groupId,
        selectedMemberIds,
      });

    if (capacityError) {
      window.alert(capacityError);
      return;
    }

    setPersos(nextPersos);
    setGroups(nextGroups);
    saveGroupMembersEntity(groupId, uniqueIds);
  };

  const setGroupPresence = (groupId: number, isPresent: boolean) => {
    const { nextPersos, changedPersoIds } = buildGroupPresenceUpdate({
      persos,
      groupId,
      isPresent,
    });

    if (changedPersoIds.length === 0) {
      return;
    }

    setPersos(nextPersos);
    persistPersosByIds(changedPersoIds, nextPersos);
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

    const { nextGroups, updatedGroup, capacityError, shouldUpdate } =
      buildSafeGroupChefUpdate({
        groups,
        persos,
        groupId,
        rawValue,
      });

    if (!shouldUpdate) {
      return;
    }

    if (capacityError) {
      window.alert(capacityError);
      return;
    }

    setGroups(nextGroups);
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
