export const getGroupMembers = (persos, groupId) =>
  persos.filter((perso) => perso.groupId === groupId);

export const getGroupLeader = (group, persos) => {
  const members = getGroupMembers(persos, group.id);
  return members.find((perso) => perso.id === group.chef) || members[0] || null;
};

export const getGroupCapacity = (leader) =>
  Math.max(1, Math.floor(Number(leader?.cmd ?? 0)) + 1);

export const getPersoCombatValue = (perso) =>
  Number(perso?.combatEffectif ?? perso?.combat ?? 0);

export const getPersoWeightValue = (perso) => Number(perso?.poidsTotal ?? 0);

export const getPersoWeightLimit = (perso) =>
  Number(perso?.poidsMaxEffectif ?? perso?.poidsMax ?? 20);

export const isPersoOverweight = (perso) =>
  getPersoWeightValue(perso) > getPersoWeightLimit(perso);

export const getPersoCapacityValue = (perso, type) => {
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

export const calculateGroupTotals = (persos) =>
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

export const recalculateGroups = (nextPersos, previousGroups) => {
  const membersByGroup = nextPersos.reduce((acc, perso) => {
    if (perso.groupId === null || perso.groupId === undefined) {
      return acc;
    }
    if (!acc[perso.groupId]) acc[perso.groupId] = [];
    acc[perso.groupId].push(perso.id);
    return acc;
  }, {});

  return previousGroups.map((group) => {
    const members = membersByGroup[group.id] || [];

    if (members.length === 0) {
      return { ...group, chef: null };
    }

    if (group.chef !== null && members.includes(Number(group.chef))) {
      return group;
    }

    return { ...group, chef: members[0] };
  });
};

export const validateGroupCapacities = (candidatePersos, candidateGroups) => {
  for (const group of candidateGroups) {
    const members = getGroupMembers(candidatePersos, group.id);
    if (members.length === 0) continue;

    const leader =
      members.find((perso) => perso.id === group.chef) || members[0] || null;
    const capacity = getGroupCapacity(leader);

    if (members.length > capacity) {
      return `Le groupe "${group.name}" dépasse la capacité de commandement de ${leader?.nom || "ce leader"} (${capacity} membres max).`;
    }
  }

  return "";
};
