import type { Group, Perso, PersoCapacityKey } from "../types";

export const getGroupMembers = (
  persos: Perso[] = [],
  groupId: number | null | undefined,
): Perso[] => persos.filter((perso) => perso.groupId === groupId);

export const getGroupLeader = (
  group: Group,
  persos: Perso[] = [],
): Perso | null => {
  const members = getGroupMembers(persos, group.id);
  return members.find((perso) => perso.id === group.chef) || members[0] || null;
};

export const getGroupCapacity = (leader: Perso | null | undefined): number =>
  Math.max(1, Math.floor(Number(leader?.cmd ?? 0)) + 1);

export const getPersoCombatValue = (
  perso: Partial<Perso> | null | undefined,
): number => Number(perso?.combatEffectif ?? perso?.combat ?? 0);

export const getPersoWeightValue = (
  perso: Partial<Perso> | null | undefined,
): number => Number(perso?.poidsTotal ?? 0);

export const getPersoWeightLimit = (
  perso: Partial<Perso> | null | undefined,
): number => Number(perso?.poidsMaxEffectif ?? perso?.poidsMax ?? 20);

export const isPersoOverweight = (
  perso: Partial<Perso> | null | undefined,
): boolean => getPersoWeightValue(perso) > getPersoWeightLimit(perso);

export const getPersoCapacityValue = (
  perso: Partial<Perso> | null | undefined,
  type: PersoCapacityKey,
): number => {
  switch (type) {
    case "eau":
      return Number(perso?.capEauEffectif ?? perso?.capEau ?? 0);
    case "nrt":
      return Number(perso?.capNrtEffectif ?? perso?.capNrt ?? 0);
    case "med":
      return Number(perso?.capMedEffectif ?? perso?.capMed ?? 0);
    case "mat":
      return Number(perso?.capMatEffectif ?? perso?.capMat ?? 0);
    case "art":
      return Number(perso?.capArtEffectif ?? perso?.capart ?? 0);
    default:
      return 0;
  }
};

export const calculateGroupTotals = (persos: Perso[] = []) =>
  persos.reduce(
    (acc, perso) => ({
      eau: acc.eau + getPersoCapacityValue(perso, "eau"),
      nrt: acc.nrt + getPersoCapacityValue(perso, "nrt"),
      med: acc.med + getPersoCapacityValue(perso, "med"),
      mat: acc.mat + getPersoCapacityValue(perso, "mat"),
      art: acc.art + getPersoCapacityValue(perso, "art"),
      poids: acc.poids + getPersoWeightValue(perso),
      combat: acc.combat + getPersoCombatValue(perso),
    }),
    { eau: 0, nrt: 0, med: 0, mat: 0, art: 0, poids: 0, combat: 0 },
  );

export const recalculateGroups = (
  nextPersos: Perso[] = [],
  previousGroups: Group[] = [],
): Group[] => {
  const membersByGroup = nextPersos.reduce<Record<number, number[]>>(
    (acc, perso) => {
      if (perso.groupId === null || perso.groupId === undefined) {
        return acc;
      }

      const members = acc[perso.groupId] ?? [];
      members.push(perso.id);
      acc[perso.groupId] = members;
      return acc;
    },
    {},
  );

  return previousGroups.map((group) => {
    const members = membersByGroup[group.id] || [];

    if (members.length === 0) {
      return { ...group, chef: null };
    }

    if (group.chef !== null && members.includes(Number(group.chef))) {
      return group;
    }

    return { ...group, chef: null };
  });
};

export const validateGroupCapacities = (
  candidatePersos: Perso[] = [],
  candidateGroups: Group[] = [],
): string => {
  for (const group of candidateGroups) {
    if (group.overrideCapacity) continue;

    const members = getGroupMembers(candidatePersos, group.id);
    if (members.length === 0) continue;

    const leader =
      members.find((perso) => perso.id === group.chef) || members[0] || null;
    const capacity = getGroupCapacity(leader);
    const leaderCmd = Number(leader?.cmd ?? 0);

    const isApprenticeSlaverException =
      members.length === 2 &&
      leaderCmd < 1 &&
      members.some((m) => m.id !== group.chef && m.esclave);

    if (members.length > capacity && !isApprenticeSlaverException) {
      return `Le groupe "${group.name}" dépasse la capacité de commandement de ${leader?.nom || "ce leader"} (${capacity} places).`;
    }
  }

  return "";
};
