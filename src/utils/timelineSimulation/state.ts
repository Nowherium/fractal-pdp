import type {
  Action,
  Arme,
  Lune,
  Outil,
  Perso,
  PersoResource,
  Resource,
  Sac,
  Stocks,
  ToolSpecialite,
} from "../../types";
import type {
  PersoCaps,
  PersoDrugStocks,
  SimulationState,
  TimelinePersoSnapshot,
  TimelineRow,
  TimelineSegment,
  TimelineStateSnapshot,
  TimelineStats,
} from "../timelineTypes";

import {
  createStockSnapshot,
  normalizePresenceValue,
} from "../timelineHelpers";
import {
  createDefaultToolMultipliers,
  getBestToolForSpecialite,
  getToolBonusMultiplier,
  normalizeToolSpecialite,
  toolSpecialiteOrder,
} from "../toolUtils";

const overrideCapMappings = [
  ["capEau", "eau"],
  ["capNrt", "nrt"],
  ["capMed", "med"],
  ["capMat", "mat"],
  ["capArt", "art"],
] as const;

const persoCapStateMappings = [
  ["eau", "capEau", "capEauEffectif"],
  ["nrt", "capNrt", "capNrtEffectif"],
  ["med", "capMed", "capMedEffectif"],
  ["mat", "capMat", "capMatEffectif"],
  ["art", "capArt", "capArtEffectif"],
] as const;

export const roundStateValue = (value: number): number =>
  Number((Number(value) || 0).toFixed(2));

export const createEmptyPersoCaps = (): PersoCaps => ({
  eau: 0,
  nrt: 0,
  med: 0,
  mat: 0,
  art: 0,
});

export const getOrCreatePersoCaps = (
  capCourantes: SimulationState["capCourantes"],
  persoId: number,
  fallback: Partial<PersoCaps> = {},
): PersoCaps => {
  const existingCaps = capCourantes[persoId];
  if (existingCaps) {
    return existingCaps;
  }

  const nextCaps = { ...createEmptyPersoCaps(), ...fallback };
  capCourantes[persoId] = nextCaps;
  return nextCaps;
};

export const buildDrugStocksByPerso = (
  resources: Resource[] = [],
  persoResources: PersoResource[] = [],
): PersoDrugStocks => {
  const resourceCodesById = new Map<number, string>(
    resources.map((resource) => [
      Number(resource.id),
      String(resource.code ?? "").toLowerCase(),
    ]),
  );

  return persoResources.reduce<PersoDrugStocks>((acc, entry) => {
    const persoId = Number(entry.perso_id);
    const resourceId = Number(entry.resource_id);
    const code = resourceCodesById.get(resourceId);

    if (!Number.isFinite(persoId) || !code) {
      return acc;
    }

    acc[persoId] = acc[persoId] || {};
    acc[persoId][code] =
      Number(acc[persoId][code] ?? 0) +
      Math.max(0, Number(entry.quantity ?? 0));
    return acc;
  }, {});
};

export const getInitialPersoCapValue = (
  perso: Perso,
  baseField: "capEau" | "capNrt" | "capMed" | "capMat" | "capArt",
): number => roundStateValue(Math.max(0, Number(perso[baseField] ?? 0) || 0));

export const buildBestToolsBySpecialite = (
  outils: Outil[] = [],
): Record<ToolSpecialite, Outil | null> =>
  Object.fromEntries(
    toolSpecialiteOrder.map((specialite) => [
      specialite,
      getBestToolForSpecialite(outils, specialite),
    ]),
  ) as Record<ToolSpecialite, Outil | null>;

export const buildSelectedToolMultipliers = (
  lune: Lune,
  outilsById: Map<number, Outil>,
  bestToolsBySpecialite: Record<ToolSpecialite, Outil | null>,
) => {
  const multipliers = createDefaultToolMultipliers();
  const toolAssignments = lune.toolAssignments ?? {};

  toolSpecialiteOrder.forEach((specialite) => {
    const hasExplicitSelection = Object.prototype.hasOwnProperty.call(
      toolAssignments,
      specialite,
    );

    if (hasExplicitSelection) {
      const outilId = toolAssignments[specialite];
      if (outilId === null) {
        return;
      }

      const selectedTool = outilsById.get(Number(outilId));
      if (
        selectedTool &&
        normalizeToolSpecialite(selectedTool.specialite) === specialite
      ) {
        multipliers[specialite] = getToolBonusMultiplier(selectedTool);
        return;
      }
    }

    const fallbackTool = bestToolsBySpecialite[specialite];
    if (fallbackTool) {
      multipliers[specialite] = getToolBonusMultiplier(fallbackTool);
    }
  });

  return multipliers;
};

export const clonePersoDrugStocks = (
  source: PersoDrugStocks = {},
): PersoDrugStocks =>
  Object.fromEntries(
    Object.entries(source).map(([persoId, drugStocks]) => [
      Number(persoId),
      Object.fromEntries(
        Object.entries(drugStocks ?? {}).map(([code, quantity]) => [
          code,
          Math.max(0, Number(quantity ?? 0) || 0),
        ]),
      ),
    ]),
  );

const cloneSerializableValue = <T>(value: T): T =>
  value === undefined ? value : (JSON.parse(JSON.stringify(value)) as T);

export const buildFrozenTimelineSnapshot = (
  segment?: TimelineSegment | null,
) => {
  if (!segment) {
    return null;
  }

  return {
    rows: cloneSerializableValue(segment.rows ?? []),
    stats: cloneSerializableValue(segment.stats ?? {}),
    constructionStates: cloneSerializableValue(
      segment.constructionStates ?? {},
    ),
    endingState: cloneSerializableValue(segment.endingState ?? {}),
  };
};

export const buildTimelineStateSnapshot = ({
  persos,
  pvCourants,
  capCourantes,
  combatCourants,
  presenceCourante,
  stocks,
  remainingResourceStocksByPerso,
}: {
  persos: Perso[];
  pvCourants: SimulationState["pvCourants"];
  capCourantes: SimulationState["capCourantes"];
  combatCourants: SimulationState["combatCourants"];
  presenceCourante: SimulationState["presenceCourante"];
  stocks: Record<string, number>;
  remainingResourceStocksByPerso: PersoDrugStocks;
}) => ({
  persos: Object.fromEntries(
    persos.map((perso) => {
      const currentCaps = getOrCreatePersoCaps(capCourantes, perso.id, {
        eau: getInitialPersoCapValue(perso, "capEau"),
        nrt: getInitialPersoCapValue(perso, "capNrt"),
        med: getInitialPersoCapValue(perso, "capMed"),
        mat: getInitialPersoCapValue(perso, "capMat"),
        art: getInitialPersoCapValue(perso, "capArt"),
      });

      return [
        perso.id,
        {
          pv: roundStateValue(
            Math.max(0, Number(pvCourants[perso.id] ?? perso.pv ?? 0) || 0),
          ),
          present: normalizePresenceValue(
            presenceCourante[perso.id],
            normalizePresenceValue(perso.present, true),
          ),
          combat: roundStateValue(
            Math.max(
              0,
              Number(combatCourants[perso.id] ?? perso.combat ?? 0) || 0,
            ),
          ),
          caps: {
            eau: roundStateValue(Number(currentCaps.eau ?? 0)),
            nrt: roundStateValue(Number(currentCaps.nrt ?? 0)),
            med: roundStateValue(Number(currentCaps.med ?? 0)),
            mat: roundStateValue(Number(currentCaps.mat ?? 0)),
            art: roundStateValue(Number(currentCaps.art ?? 0)),
          },
        },
      ];
    }),
  ),
  stocks: createStockSnapshot(stocks),
  carriedResources: clonePersoDrugStocks(remainingResourceStocksByPerso),
});

const resolveBaseCapFromEffective = (
  _perso: Perso,
  _baseField: "capEau" | "capNrt" | "capMed" | "capMat" | "capArt",
  _effectifField:
    | "capEauEffectif"
    | "capNrtEffectif"
    | "capMedEffectif"
    | "capMatEffectif"
    | "capArtEffectif",
  nextEffectiveValue: number,
): number => roundStateValue(Math.max(0, Number(nextEffectiveValue ?? 0) || 0));

export const applyTimelineStateSnapshotToSimulation = ({
  endingState,
  pvCourants,
  capCourantes,
  combatCourants,
  presenceCourante,
  resourceStocks,
  remainingResourceStocksByPerso,
}: {
  endingState: TimelineStateSnapshot | undefined;
  pvCourants: SimulationState["pvCourants"];
  capCourantes: SimulationState["capCourantes"];
  combatCourants: SimulationState["combatCourants"];
  presenceCourante: SimulationState["presenceCourante"];
  resourceStocks: Record<string, number>;
  remainingResourceStocksByPerso: PersoDrugStocks;
}) => {
  if (!endingState) {
    return;
  }

  Object.keys(pvCourants).forEach((key) => delete pvCourants[Number(key)]);
  Object.keys(capCourantes).forEach((key) => delete capCourantes[Number(key)]);
  Object.keys(combatCourants).forEach(
    (key) => delete combatCourants[Number(key)],
  );
  Object.keys(presenceCourante).forEach(
    (key) => delete presenceCourante[Number(key)],
  );

  Object.entries(endingState.persos ?? {}).forEach(
    ([persoIdRaw, rawSnapshot]) => {
      const persoId = Number(persoIdRaw);
      if (!Number.isFinite(persoId)) {
        return;
      }

      const snapshot = rawSnapshot as TimelinePersoSnapshot;

      pvCourants[persoId] = roundStateValue(Number(snapshot.pv ?? 0));
      combatCourants[persoId] = roundStateValue(Number(snapshot.combat ?? 0));
      presenceCourante[persoId] = normalizePresenceValue(
        snapshot.present,
        true,
      );
      capCourantes[persoId] = {
        eau: roundStateValue(Number(snapshot.caps?.eau ?? 0)),
        nrt: roundStateValue(Number(snapshot.caps?.nrt ?? 0)),
        med: roundStateValue(Number(snapshot.caps?.med ?? 0)),
        mat: roundStateValue(Number(snapshot.caps?.mat ?? 0)),
        art: roundStateValue(Number(snapshot.caps?.art ?? 0)),
      };
    },
  );

  Object.keys(resourceStocks).forEach((key) => delete resourceStocks[key]);
  Object.assign(resourceStocks, createStockSnapshot(endingState.stocks ?? {}));

  Object.keys(remainingResourceStocksByPerso).forEach(
    (key) => delete remainingResourceStocksByPerso[Number(key)],
  );
  Object.assign(
    remainingResourceStocksByPerso,
    clonePersoDrugStocks(endingState.carriedResources ?? {}),
  );
};

export const getFrozenTimelineSegment = (
  lune: Lune,
): Omit<TimelineSegment, "lune"> | null => {
  const frozenTimeline = lune.frozenTimeline;
  if (!frozenTimeline || typeof frozenTimeline !== "object") {
    return null;
  }

  if (!Array.isArray(frozenTimeline.rows)) {
    return null;
  }

  if (!frozenTimeline.stats || typeof frozenTimeline.stats !== "object") {
    return null;
  }

  const frozenSegment: Omit<TimelineSegment, "lune"> = {
    rows: frozenTimeline.rows as TimelineRow[],
    stats: frozenTimeline.stats as TimelineStats,
  };

  if (
    frozenTimeline.constructionStates &&
    typeof frozenTimeline.constructionStates === "object"
  ) {
    frozenSegment.constructionStates =
      frozenTimeline.constructionStates as Record<string, never>;
  }

  if (
    frozenTimeline.endingState &&
    typeof frozenTimeline.endingState === "object"
  ) {
    frozenSegment.endingState =
      frozenTimeline.endingState as TimelineStateSnapshot;
  }

  return frozenSegment;
};

export const initializePersoSimulationState = (
  persos: Perso[] = [],
  remainingDrugStocksByPerso: PersoDrugStocks = {},
): SimulationState => {
  const pvCourants: Record<number, number> = {};
  const capCourantes: Record<number, PersoCaps> = {};
  const combatCourants: Record<number, number> = {};
  const presenceCourante: Record<number, boolean> = {};

  persos.forEach((perso) => {
    pvCourants[perso.id] = Math.max(0, Number(perso.pv ?? perso.pvmax ?? 0));
    presenceCourante[perso.id] = normalizePresenceValue(perso.present, true);
    capCourantes[perso.id] = {
      eau: getInitialPersoCapValue(perso, "capEau"),
      nrt: getInitialPersoCapValue(perso, "capNrt"),
      med: getInitialPersoCapValue(perso, "capMed"),
      mat: getInitialPersoCapValue(perso, "capMat"),
      art: getInitialPersoCapValue(perso, "capArt"),
    };
    combatCourants[perso.id] = Number(perso.combat ?? 0);
    remainingDrugStocksByPerso[perso.id] =
      remainingDrugStocksByPerso[perso.id] || {};
  });

  return {
    pvCourants,
    capCourantes,
    combatCourants,
    presenceCourante,
  };
};

export const applyLuneOverrides = ({
  persos,
  overrides,
  presenceCourante,
  pvCourants,
  capCourantes,
  combatCourants,
}: {
  persos: Perso[];
  overrides: Lune["overrides"];
  presenceCourante: SimulationState["presenceCourante"];
  pvCourants: SimulationState["pvCourants"];
  capCourantes: SimulationState["capCourantes"];
  combatCourants: SimulationState["combatCourants"];
}): void => {
  persos.forEach((perso) => {
    const override = overrides[perso.id];
    if (!override) return;

    const currentCaps = getOrCreatePersoCaps(capCourantes, perso.id);

    if (override.present !== undefined) {
      presenceCourante[perso.id] = normalizePresenceValue(
        override.present,
        presenceCourante[perso.id] ?? true,
      );
    }
    if (override.pv !== undefined) {
      pvCourants[perso.id] = Math.max(0, Number(override.pv) || 0);
    }

    for (const [overrideKey, capKey] of overrideCapMappings) {
      const overrideValue = override[overrideKey];
      if (overrideValue !== undefined) {
        currentCaps[capKey] = Number(overrideValue) || 0;
      }
    }

    if (override.combat !== undefined) {
      combatCourants[perso.id] = Number(override.combat) || 0;
    }
  });
};

export const applyTimelineSegmentToState = (
  persos: Perso[] = [],
  stocks: Stocks = {},
  segment?: TimelineSegment | null,
  persoResources: PersoResource[] = [],
  resources: Resource[] = [],
  _actions: Action[] = [],
  armes: Arme[] = [],
  outils: Outil[] = [],
  sacs: Sac[] = [],
): {
  persos: Perso[];
  stocks: Stocks;
  persoResources: PersoResource[];
  armes: Arme[];
  outils: Outil[];
  sacs: Sac[];
} => {
  const endingState = segment?.endingState;
  if (!endingState) {
    return {
      persos: [...persos],
      stocks: { ...stocks },
      persoResources: [...persoResources],
      armes: [...armes],
      outils: [...outils],
      sacs: [...sacs],
    };
  }

  const nextPersos = persos.map((perso) => {
    const snapshot = endingState.persos[perso.id];
    if (!snapshot) {
      return perso;
    }

    const nextPerso = {
      ...perso,
      present: snapshot.present,
      pv: roundStateValue(snapshot.pv),
      combat: roundStateValue(snapshot.combat),
      capEauEffectif: roundStateValue(snapshot.caps.eau),
      capNrtEffectif: roundStateValue(snapshot.caps.nrt),
      capMedEffectif: roundStateValue(snapshot.caps.med),
      capMatEffectif: roundStateValue(snapshot.caps.mat),
      capArtEffectif: roundStateValue(snapshot.caps.art),
    };

    persoCapStateMappings.forEach(([capKey, baseField, effectifField]) => {
      nextPerso[baseField] = resolveBaseCapFromEffective(
        perso,
        baseField,
        effectifField,
        snapshot.caps[capKey],
      );
    });

    return nextPerso;
  });

  const resourceCodesById = new Map<number, string>(
    resources.map((resource) => [
      Number(resource.id),
      String(resource.code ?? "")
        .trim()
        .toLowerCase(),
    ]),
  );

  const nextPersoResources = persoResources.flatMap((entry) => {
    const persoId = Number(entry.perso_id);
    const code = resourceCodesById.get(Number(entry.resource_id));
    const remainingResources = endingState.carriedResources?.[persoId];

    if (!code || !remainingResources || !(code in remainingResources)) {
      return [entry];
    }

    const quantity = Math.max(0, Number(remainingResources[code] ?? 0) || 0);
    return quantity > 0 ? [{ ...entry, quantity }] : [];
  });

  const craftedCounts = (segment?.rows ?? []).reduce(
    (acc, row) => {
      const craftedAction = row.craftedAction;
      if (
        !craftedAction?.success ||
        !craftedAction.targetType ||
        !craftedAction.targetId
      ) {
        return acc;
      }

      const targetType = craftedAction.targetType;
      const targetId = Number(craftedAction.targetId);
      if (!Number.isFinite(targetId) || targetId <= 0) {
        return acc;
      }

      const craftedQuantity = Math.max(
        0,
        Number(craftedAction.quantity ?? 1) || 0,
      );
      if (craftedQuantity <= 0) {
        return acc;
      }

      acc[targetType][targetId] =
        (acc[targetType][targetId] ?? 0) + craftedQuantity;
      return acc;
    },
    {
      arme: {} as Record<number, number>,
      outil: {} as Record<number, number>,
      sac: {} as Record<number, number>,
    },
  );

  const applyCraftedQuantities = <
    TItem extends { id: number; quantity?: number },
  >(
    items: TItem[] = [],
    countsById: Record<number, number>,
  ): TItem[] =>
    items.map((item) => {
      const craftedCount = countsById[Number(item.id)] ?? 0;
      if (craftedCount <= 0) {
        return item;
      }

      return {
        ...item,
        quantity:
          Math.max(0, Math.floor(Number(item.quantity ?? 0) || 0)) +
          craftedCount,
      };
    });

  return {
    persos: nextPersos,
    stocks: {
      ...stocks,
      ...endingState.stocks,
    },
    persoResources: nextPersoResources,
    armes: applyCraftedQuantities(armes, craftedCounts.arme),
    outils: applyCraftedQuantities(outils, craftedCounts.outil),
    sacs: applyCraftedQuantities(sacs, craftedCounts.sac),
  };
};
