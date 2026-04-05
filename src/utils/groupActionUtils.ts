import type { Group, Perso } from "../types";
import { recalculateGroups, validateGroupCapacities } from "./groupUtils";

export const createDefaultGroup = (groups: Group[] = []): Group => {
  const nextGroupId =
    groups.reduce((maxId, group) => Math.max(maxId, Number(group.id) || 0), 0) +
    1;

  return {
    id: nextGroupId,
    name: `Nouveau groupe ${nextGroupId}`,
    chef: null,
  };
};

export const buildGroupUpdate = ({
  groups,
  groupId,
  field,
  rawValue,
}: {
  groups: Group[];
  groupId: number;
  field: string;
  rawValue: string | number | boolean | null;
}): { nextGroups: Group[]; updatedGroup: Group | undefined } => {
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

  return {
    nextGroups,
    updatedGroup: nextGroups.find((group) => group.id === groupId),
  };
};

export const buildGroupRemoval = ({
  groups,
  persos,
  groupId,
}: {
  groups: Group[];
  persos: Perso[];
  groupId: number;
}): { nextGroups: Group[]; nextPersos: Perso[]; changedPersoIds: number[] } => {
  const changedPersoIds = persos
    .filter((perso) => perso.groupId === groupId)
    .map((perso) => perso.id);

  return {
    nextGroups: groups.filter((group) => group.id !== groupId),
    nextPersos: persos.map((perso) =>
      perso.groupId === groupId ? { ...perso, groupId: null } : perso,
    ),
    changedPersoIds,
  };
};

export const normalizeSelectedGroupMemberIds = (
  selectedMemberIds: Array<number | string>,
): number[] =>
  Array.from(
    new Set(
      selectedMemberIds
        .map((id) => Number(id))
        .filter((id) => Number.isFinite(id)),
    ),
  );

export const buildGroupMembersUpdate = ({
  groups,
  persos,
  groupId,
  selectedMemberIds,
}: {
  groups: Group[];
  persos: Perso[];
  groupId: number;
  selectedMemberIds: Array<number | string>;
}): {
  uniqueIds: number[];
  nextPersos: Perso[];
  nextGroups: Group[];
  capacityError: string;
} => {
  const uniqueIds = normalizeSelectedGroupMemberIds(selectedMemberIds);

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

  return {
    uniqueIds,
    nextPersos,
    nextGroups,
    capacityError: validateGroupCapacities(nextPersos, nextGroups),
  };
};

export const buildGroupPresenceUpdate = ({
  persos,
  groupId,
  isPresent,
}: {
  persos: Perso[];
  groupId: number;
  isPresent: boolean;
}): { nextPersos: Perso[]; changedPersoIds: number[] } => {
  const changedPersoIds = persos
    .filter(
      (perso) =>
        perso.groupId === groupId && (perso.present !== false) !== isPresent,
    )
    .map((perso) => perso.id);

  if (changedPersoIds.length === 0) {
    return {
      nextPersos: persos,
      changedPersoIds: [],
    };
  }

  const changedIdSet = new Set(changedPersoIds);

  return {
    nextPersos: persos.map((perso) =>
      changedIdSet.has(perso.id) ? { ...perso, present: isPresent } : perso,
    ),
    changedPersoIds,
  };
};

export const buildSafeGroupChefUpdate = ({
  groups,
  persos,
  groupId,
  rawValue,
}: {
  groups: Group[];
  persos: Perso[];
  groupId: number;
  rawValue: string | number | boolean | null;
}): {
  nextGroups: Group[];
  updatedGroup: Group | undefined;
  capacityError: string;
  shouldUpdate: boolean;
} => {
  const members = persos
    .filter((perso) => perso.groupId === groupId)
    .map((perso) => perso.id);

  const nextChef =
    rawValue === null || rawValue === undefined
      ? (members[0] ?? null)
      : Number(rawValue);

  if (nextChef === null || !members.includes(nextChef)) {
    return {
      nextGroups: groups,
      updatedGroup: groups.find((group) => group.id === groupId),
      capacityError: "",
      shouldUpdate: false,
    };
  }

  const nextGroups = groups.map((group) =>
    group.id !== groupId
      ? group
      : {
          ...group,
          chef: nextChef,
        },
  );

  return {
    nextGroups,
    updatedGroup: nextGroups.find((group) => group.id === groupId),
    capacityError: validateGroupCapacities(persos, nextGroups),
    shouldUpdate: true,
  };
};
