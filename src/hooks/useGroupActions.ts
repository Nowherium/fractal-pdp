import {
  recalculateGroups,
  validateGroupCapacities,
} from "../utils/groupUtils";

export const useGroupActions = ({
  groups,
  persos,
  setGroups,
  setPersos,
  setSelectedGroupId,
  setPage,
  saveGroupEntity,
  saveGroupMembersEntity,
}) => {
  const openGroupPage = (groupId) => {
    setSelectedGroupId(groupId);
    setPage("group");
  };

  const openGroupViewPage = (groupId) => {
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

    const newGroup = {
      id: nextGroupId,
      name: `Nouveau groupe ${nextGroupId}`,
      chef: null,
    };

    setGroups((previous) => [...previous, newGroup]);
    setSelectedGroupId(newGroup.id);
    setPage("group");
    saveGroupEntity(newGroup);
  };

  const handleGroupUpdate = (
    groupId,
    field,
    rawValue,
    { persist = true } = {},
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

  const handleGroupMembersUpdate = (groupId, selectedMemberIds) => {
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

  const handleGroupUpdateSafe = (groupId, field, rawValue, options) => {
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
    handleGroupMembersUpdate,
    handleGroupUpdateSafe,
  };
};
