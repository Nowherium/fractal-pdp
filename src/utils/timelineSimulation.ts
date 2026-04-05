import type {
  ConstructionProgressById,
  Lune,
  LuneConstruction,
  Outil,
  Perso,
  PersoResource,
  Ration,
  Resource,
  Stocks,
  ToolSpecialite,
} from "../types";
import type {
  CityMultipliersInput,
  ConstructionAssignment,
  ConstructionProgressSnapshot,
  ConstructionState,
  LuneTotals,
  PersoCaps,
  PersoDrugStocks,
  ProcessPersoResult,
  ProductionMultipliers,
  RuntimeConstructionProgress,
  SimulatedConstruction,
  SimulationState,
  StockSnapshot,
  TimelinePersoSnapshot,
  TimelineRow,
  TimelineSegment,
  TimelineStateSnapshot,
  TimelineStats,
} from "./timelineTypes";

import {
  DRUG_EFFECTS,
  formatDrugQuantity,
  getDrugConsumptionQuantity,
  getDrugLabel,
  getDrugSummary,
  normalizeDrugCode,
} from "./drugEffects";
import {
  computeIncrement,
  createStockSnapshot,
  formatDisplayValue,
  normalizePresenceValue,
  normalizeProductionMultipliers,
  normalizeWeatherCoefficients,
} from "./timelineHelpers";
import {
  getPlacedConstructionIdsForLune,
  normalizeLuneConstructions,
} from "./stateUtils";
import {
  createDefaultToolMultipliers,
  getBestToolForSpecialite,
  getToolBonusMultiplier,
  normalizeToolSpecialite,
  toolSpecialiteOrder,
} from "./toolUtils";

const productionTaskKeys = ["eau", "nrt", "med", "mat"] as const;
type ProductionTaskKey = (typeof productionTaskKeys)[number];

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
  ["art", "capart", "capArtEffectif"],
] as const;

const isProductionTask = (task: string): task is ProductionTaskKey =>
  productionTaskKeys.includes(task as ProductionTaskKey);

const createEmptyPersoCaps = (): PersoCaps => ({
  eau: 0,
  nrt: 0,
  med: 0,
  mat: 0,
  art: 0,
});

const getOrCreatePersoCaps = (
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

const buildDrugStocksByPerso = (
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

const buildAvailableDrugsMap = (
  remainingStocks: Record<string, number> = {},
): Record<string, number> =>
  Object.fromEntries(
    Object.entries(DRUG_EFFECTS).map(([code, effect]) => [
      code,
      effect.requiresResource === false
        ? Number.POSITIVE_INFINITY
        : Number(remainingStocks[code] ?? 0),
    ]),
  );

const buildAvailableResourceCodes = (resources: Resource[] = []): Set<string> =>
  new Set(
    resources
      .map((resource) =>
        String(resource.code ?? "")
          .trim()
          .toLowerCase(),
      )
      .filter(Boolean),
  );

const roundStateValue = (value: number): number =>
  Number((Number(value) || 0).toFixed(2));

const getInitialPersoCapValue = (
  perso: Perso,
  baseField: "capEau" | "capNrt" | "capMed" | "capMat" | "capart",
): number => roundStateValue(Math.max(0, Number(perso[baseField] ?? 0) || 0));

const buildSelectedToolMultipliers = (
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

const clonePersoDrugStocks = (source: PersoDrugStocks = {}): PersoDrugStocks =>
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

const buildTimelineStateSnapshot = ({
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
        art: getInitialPersoCapValue(perso, "capart"),
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
  _baseField: "capEau" | "capNrt" | "capMed" | "capMat" | "capart",
  _effectifField:
    | "capEauEffectif"
    | "capNrtEffectif"
    | "capMedEffectif"
    | "capMatEffectif"
    | "capArtEffectif",
  nextEffectiveValue: number,
): number => roundStateValue(Math.max(0, Number(nextEffectiveValue ?? 0) || 0));

const applyTimelineStateSnapshotToSimulation = ({
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

const getFrozenTimelineSegment = (
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
      frozenTimeline.constructionStates as Record<string, ConstructionState>;
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

export const applyTimelineSegmentToState = (
  persos: Perso[] = [],
  stocks: Stocks = {},
  segment?: TimelineSegment | null,
  persoResources: PersoResource[] = [],
  resources: Resource[] = [],
): { persos: Perso[]; stocks: Stocks; persoResources: PersoResource[] } => {
  const endingState = segment?.endingState;
  if (!endingState) {
    return {
      persos: [...persos],
      stocks: { ...stocks },
      persoResources: [...persoResources],
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

  return {
    persos: nextPersos,
    stocks: {
      ...stocks,
      ...endingState.stocks,
    },
    persoResources: nextPersoResources,
  };
};

const buildInitialConstructionProgress = (
  constructions: LuneConstruction[] = [],
  constructionProgressById: ConstructionProgressById = {},
): Record<string, RuntimeConstructionProgress> =>
  Object.fromEntries(
    normalizeLuneConstructions(constructions).map((construction) => {
      const buildersRequired = Math.max(
        0,
        Number(construction.buildersRequired ?? 0) || 0,
      );
      const progressEntry = constructionProgressById[construction.id];
      const progress: ConstructionProgressSnapshot =
        progressEntry && typeof progressEntry === "object" ? progressEntry : {};
      const initialStatus = progress.status ?? construction.status ?? "todo";
      const rawRemainingBuilders = Number(
        progress.remainingBuilders ??
          (initialStatus === "done" ? 0 : buildersRequired),
      );
      const remainingBuilders =
        initialStatus === "done"
          ? 0
          : Math.max(
              0,
              Math.min(
                buildersRequired,
                Number.isFinite(rawRemainingBuilders)
                  ? rawRemainingBuilders
                  : buildersRequired,
              ),
            );
      const costPaid =
        initialStatus === "done" ? true : Boolean(progress.costPaid ?? false);
      const started =
        initialStatus === "done" ||
        initialStatus === "in-progress" ||
        (initialStatus !== "todo" &&
          (costPaid ||
            remainingBuilders < buildersRequired ||
            progress.startedAtLune !== undefined));

      return [
        construction.id,
        {
          remainingBuilders,
          costPaid,
          completed: initialStatus === "done",
          started,
        },
      ];
    }),
  );

const initializePersoSimulationState = (
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
      art: getInitialPersoCapValue(perso, "capart"),
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

const applyLuneOverrides = ({
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

const buildConstructionPlanForLune = ({
  normalizedConstructions,
  constructionProgressById,
  placedConstructionIds,
}: {
  normalizedConstructions: LuneConstruction[];
  constructionProgressById: Record<string, RuntimeConstructionProgress>;
  placedConstructionIds: Set<string>;
}): {
  constructionsForLune: SimulatedConstruction[];
  activeConstructionsForLune: SimulatedConstruction[];
} => {
  const constructionsForLune = normalizedConstructions.map((construction) => {
    const progressEntry = constructionProgressById[construction.id];
    const progress: ConstructionProgressSnapshot = progressEntry ?? {};
    const remainingBuilders = progress.completed
      ? 0
      : Math.max(
          0,
          Number(
            progress.remainingBuilders ?? construction.buildersRequired ?? 0,
          ) || 0,
        );
    const isStarted =
      Boolean(progress.started) || placedConstructionIds.has(construction.id);
    const status: NonNullable<LuneConstruction["status"]> = progress.completed
      ? "done"
      : isStarted
        ? "in-progress"
        : "todo";

    return {
      ...construction,
      costPaid: Boolean(progress.costPaid),
      carriedOver: Boolean(progress.started),
      remainingBuilders,
      status,
    };
  });

  return {
    constructionsForLune,
    activeConstructionsForLune: constructionsForLune.filter(
      (construction) => construction.status !== "done",
    ),
  };
};

const simulatePersoForLune = ({
  perso,
  lune,
  overrides,
  defaultRation,
  productionMultipliers,
  weatherCoefficients,
  pvCourants,
  capCourantes,
  combatCourants,
  presenceCourante,
  remainingDrugStocksByPerso,
  availableCityResourceStocks,
  availableResourceCodes,
  selectedToolMultipliers,
}: {
  perso: Perso;
  lune: Lune;
  overrides: Lune["overrides"];
  defaultRation: () => Ration;
  productionMultipliers: ProductionMultipliers;
  weatherCoefficients: ProductionMultipliers;
  pvCourants: SimulationState["pvCourants"];
  capCourantes: SimulationState["capCourantes"];
  combatCourants: SimulationState["combatCourants"];
  presenceCourante: SimulationState["presenceCourante"];
  remainingDrugStocksByPerso: PersoDrugStocks;
  availableCityResourceStocks: Record<string, number>;
  availableResourceCodes: Set<string>;
  selectedToolMultipliers: Record<ToolSpecialite, number>;
}): ProcessPersoResult => {
  const basePvDebut = Number(pvCourants[perso.id] ?? 0);
  const storedRation = {
    ...defaultRation(),
    ...(lune.rations[perso.id] ?? {}),
  };
  const override = overrides[perso.id] ?? {};
  const hasOverride = Object.keys(override).length > 0;
  const isAbsent = presenceCourante[perso.id] === false;
  const mortAuDebut = basePvDebut <= 0;
  const selectedDrugCode = normalizeDrugCode(storedRation.drogue);
  const persoDrugStocks =
    remainingDrugStocksByPerso[perso.id] ??
    (remainingDrugStocksByPerso[perso.id] = {});
  const availableDrugs = buildAvailableDrugsMap(persoDrugStocks);
  const resourceStocks = {
    eau: Number(persoDrugStocks["eau"] ?? 0),
    nrt: Number(persoDrugStocks["nrt"] ?? 0),
    med: Number(persoDrugStocks["med"] ?? 0),
  };
  const resolveRationAvailability = (resourceCode: "eau" | "nrt" | "med") => {
    if (isAbsent || mortAuDebut) {
      return false;
    }

    if (!availableResourceCodes.has(resourceCode)) {
      return true;
    }

    return (
      Number(persoDrugStocks[resourceCode] ?? 0) >= 1 ||
      Number(availableCityResourceStocks[resourceCode] ?? 0) >= 1
    );
  };
  const resolveRationSource = (
    resourceCode: "eau" | "nrt" | "med",
  ): "perso" | "ville" | "none" => {
    if (isAbsent || mortAuDebut) {
      return "none";
    }

    if (!availableResourceCodes.has(resourceCode)) {
      return "perso";
    }

    if (Number(persoDrugStocks[resourceCode] ?? 0) >= 1) {
      return "perso";
    }

    if (Number(availableCityResourceStocks[resourceCode] ?? 0) >= 1) {
      return "ville";
    }

    return "none";
  };
  const rationAvailability = {
    eau: resolveRationAvailability("eau"),
    nrt: resolveRationAvailability("nrt"),
    med: resolveRationAvailability("med"),
  };
  const rationSource = {
    eau: resolveRationSource("eau"),
    nrt: resolveRationSource("nrt"),
    med: resolveRationSource("med"),
  };
  const ration = {
    ...storedRation,
    eau: Boolean(storedRation.eau),
    nrt: Boolean(storedRation.nrt),
    med: Boolean(storedRation.med),
  };

  const baseCapsAtStart: PersoCaps = {
    eau: Number(capCourantes[perso.id]?.eau ?? 0),
    nrt: Number(capCourantes[perso.id]?.nrt ?? 0),
    med: Number(capCourantes[perso.id]?.med ?? 0),
    mat: Number(capCourantes[perso.id]?.mat ?? 0),
    art: Number(capCourantes[perso.id]?.art ?? 0),
  };
  const currentCaps = getOrCreatePersoCaps(
    capCourantes,
    perso.id,
    baseCapsAtStart,
  );
  const baseCombatAtStart = Number(combatCourants[perso.id] ?? 0);
  const capStateAtStart = Object.fromEntries(
    (Object.keys(baseCapsAtStart) as Array<keyof PersoCaps>).map(
      (specialite) => {
        const rawCap = Number(baseCapsAtStart[specialite] ?? 0);
        const appliedToolMultiplier = Math.max(
          1,
          Number(selectedToolMultipliers[specialite] ?? 1),
        );

        return [
          specialite,
          {
            rawCap,
            appliedToolMultiplier,
            effectiveCap: rawCap * appliedToolMultiplier,
          },
        ];
      },
    ),
  ) as Record<
    keyof PersoCaps,
    {
      rawCap: number;
      appliedToolMultiplier: number;
      effectiveCap: number;
    }
  >;
  let cDebut: PersoCaps = {
    eau:
      capStateAtStart.eau.effectiveCap *
      productionMultipliers.eau *
      weatherCoefficients.eau,
    nrt:
      capStateAtStart.nrt.effectiveCap *
      productionMultipliers.nrt *
      weatherCoefficients.nrt,
    med:
      capStateAtStart.med.effectiveCap *
      productionMultipliers.med *
      weatherCoefficients.med,
    mat:
      capStateAtStart.mat.effectiveCap *
      productionMultipliers.mat *
      weatherCoefficients.mat,
    art: capStateAtStart.art.effectiveCap,
  };
  let pvDebut = basePvDebut;
  let pvFin = pvDebut;
  let classPv = "";
  let mortText = "";
  let drugStatus = "";
  let drugClassName = "";
  let temporaryPvBonus = 0;
  const production = { eau: 0, nrt: 0, med: 0, mat: 0 };
  const consumption = { eau: 0, nrt: 0, med: 0 };
  let constructionAssignment: ConstructionAssignment | null = null;

  if (isAbsent) {
    mortText = " (ABSENT)";
    drugStatus = "Absent — ignoré dans les calculs";
    drugClassName = "inactive";

    return {
      row: {
        persoId: perso.id,
        nom: perso.nom,
        pvDebut,
        pvFin,
        pvDisplayDebut: pvDebut > 0 ? formatDisplayValue(pvDebut) : 0,
        pvDisplayFin: pvFin > 0 ? formatDisplayValue(pvFin) : 0,
        cDebut,
        ration,
        mortAuDebut,
        isAbsent,
        classPv,
        mortText,
        hasOverride,
        availableDrugs,
        resourceStocks,
        rationAvailability,
        rationSource,
        drugStatus,
        drugClassName,
      },
      production,
      consumption,
      constructionAssignment,
    };
  }

  if (selectedDrugCode && mortAuDebut) {
    drugStatus = "⚠️ Impossible à consommer sur un cadavre";
    drugClassName = "warning";
  } else if (selectedDrugCode) {
    const drugEffect = DRUG_EFFECTS[selectedDrugCode];
    const availableQuantity = Number(availableDrugs[selectedDrugCode] ?? 0);
    const requiredQuantity = getDrugConsumptionQuantity(selectedDrugCode);
    const requiresResource = drugEffect?.requiresResource !== false;

    if (!drugEffect) {
      drugStatus = `⚠️ ${selectedDrugCode.toUpperCase()} inconnue`;
      drugClassName = "warning";
    } else if (requiresResource && availableQuantity < requiredQuantity) {
      drugStatus = `⚠️ ${getDrugLabel(selectedDrugCode)} indisponible (${formatDrugQuantity(availableQuantity)}/${formatDrugQuantity(requiredQuantity)} requis)`;
      drugClassName = "warning";
    } else {
      if (requiresResource) {
        persoDrugStocks[selectedDrugCode] = Math.max(
          0,
          availableQuantity - requiredQuantity,
        );
      }

      if (drugEffect.combatMultiplier || drugEffect.productionMultiplier) {
        drugStatus = `${getDrugLabel(selectedDrugCode)} — ${getDrugSummary(selectedDrugCode)}`;
      }

      if (drugEffect.productionMultiplier) {
        cDebut = {
          eau: cDebut.eau * drugEffect.productionMultiplier,
          nrt: cDebut.nrt * drugEffect.productionMultiplier,
          med: cDebut.med * drugEffect.productionMultiplier,
          mat: cDebut.mat * drugEffect.productionMultiplier,
          art: cDebut.art * drugEffect.productionMultiplier,
        };
      }

      if (drugEffect.instantPvBonus) {
        temporaryPvBonus = Number(drugEffect.instantPvBonus);
        pvDebut += temporaryPvBonus;
        drugStatus = `${getDrugLabel(selectedDrugCode)} — ${getDrugSummary(selectedDrugCode)}`;
      }

      drugClassName = "safe";
    }
  }

  if (!mortAuDebut) {
    if (isProductionTask(ration.tache)) {
      production[ration.tache] += cDebut[ration.tache];
      const taskCapState = capStateAtStart[ration.tache];
      const nextRawCap =
        taskCapState.rawCap + computeIncrement(taskCapState.rawCap);
      currentCaps[ration.tache] = nextRawCap;
    }
    if (ration.tache === "construire" && ration.constructionId) {
      constructionAssignment = {
        persoId: perso.id,
        constructionId: String(ration.constructionId),
        baseCapsAtStart,
        baseCombatAtStart,
      };
    }

    const consumeRationResource = (resourceCode: "eau" | "nrt" | "med") => {
      if (!ration[resourceCode]) {
        return false;
      }

      if (!availableResourceCodes.has(resourceCode)) {
        return true;
      }

      const persoQuantity = Number(persoDrugStocks[resourceCode] ?? 0);
      if (persoQuantity >= 1) {
        persoDrugStocks[resourceCode] = Math.max(0, persoQuantity - 1);
        return true;
      }

      const cityQuantity = Number(
        availableCityResourceStocks[resourceCode] ?? 0,
      );
      if (cityQuantity >= 1) {
        availableCityResourceStocks[resourceCode] = Math.max(
          0,
          cityQuantity - 1,
        );
        return true;
      }

      return false;
    };

    ration.eau = consumeRationResource("eau");
    ration.nrt = consumeRationResource("nrt");
    ration.med = consumeRationResource("med");

    if (ration.eau) {
      consumption.eau += 1;
    }
    if (ration.nrt) {
      consumption.nrt += 1;
    }
    if (ration.med) {
      consumption.med += 1;
    }

    const hasFullRation = ration.eau && ration.nrt && ration.med;
    const degatsManqueRation =
      (ration.eau ? 0 : 1) + (ration.nrt ? 0 : 1) + (ration.med ? 0 : 0.5);
    const pvMax = Math.max(pvDebut, Number(perso.pvmax ?? pvDebut) || 0);
    const pvDelta = hasFullRation ? 1 : -degatsManqueRation;

    pvFin = Math.max(0, Math.min(pvMax, pvDebut + pvDelta));
    pvCourants[perso.id] = pvFin;
    classPv = pvFin <= 0 ? "danger" : pvFin <= 5 ? "warning" : "safe";
    mortText = pvFin <= 0 ? " (DÉCÈS)" : "";
  } else {
    mortText = " (CADAVRE)";
  }

  return {
    row: {
      persoId: perso.id,
      nom: perso.nom,
      pvDebut,
      pvFin,
      pvDisplayDebut: pvDebut > 0 ? formatDisplayValue(pvDebut) : 0,
      pvDisplayFin: pvFin > 0 ? formatDisplayValue(pvFin) : 0,
      cDebut,
      ration,
      mortAuDebut,
      isAbsent,
      classPv,
      mortText,
      hasOverride,
      availableDrugs,
      resourceStocks,
      rationAvailability,
      rationSource,
      drugStatus,
      drugClassName,
    },
    production,
    consumption,
    constructionAssignment,
  };
};

const projectStocksForLune = (
  resourceStocks: Record<string, number>,
  luneTotals: LuneTotals,
): StockSnapshot => ({
  ...resourceStocks,
  eau:
    Number(resourceStocks["eau"] ?? 0) + luneTotals.eau - luneTotals.consoEau,
  nrt:
    Number(resourceStocks["nrt"] ?? 0) + luneTotals.nrt - luneTotals.consoNrt,
  med:
    Number(resourceStocks["med"] ?? 0) + luneTotals.med - luneTotals.consoMed,
  mat: Number(resourceStocks["mat"] ?? 0) + luneTotals.mat,
});

const groupAssignmentsByConstructionId = (
  constructionAssignments: ConstructionAssignment[] = [],
): Record<string, ConstructionAssignment[]> =>
  constructionAssignments.reduce<Record<string, ConstructionAssignment[]>>(
    (acc, assignment) => {
      const assignments = acc[assignment.constructionId] ?? [];
      assignments.push(assignment);
      acc[assignment.constructionId] = assignments;
      return acc;
    },
    {},
  );

const processConstructionProgress = ({
  constructionsForLune,
  constructionAssignments,
  projectedStocks,
  constructionProgressById,
  capCourantes,
  combatCourants,
}: {
  constructionsForLune: SimulatedConstruction[];
  constructionAssignments: ConstructionAssignment[];
  projectedStocks: StockSnapshot;
  constructionProgressById: Record<string, RuntimeConstructionProgress>;
  capCourantes: SimulationState["capCourantes"];
  combatCourants: SimulationState["combatCourants"];
}): Record<string, ConstructionState> => {
  const assignmentsByConstructionId = groupAssignmentsByConstructionId(
    constructionAssignments,
  );
  const constructionStates: Record<string, ConstructionState> = {};

  constructionsForLune.forEach((construction) => {
    const resourceCode = String(construction.resourceCode ?? "mat")
      .trim()
      .toLowerCase();
    const resourceCost = Math.max(0, Number(construction.resourceCost ?? 0));
    const totalBuildersRequired = Math.max(
      1,
      Math.floor(Number(construction.buildersRequired ?? 1) || 1),
    );
    const progressState = constructionProgressById[construction.id] || {
      remainingBuilders: totalBuildersRequired,
      costPaid: false,
      completed: false,
      started: false,
    };
    const assignedList = assignmentsByConstructionId[construction.id] || [];
    const assignedBuilders = assignedList.length;
    const remainingBefore = progressState.completed
      ? 0
      : Math.max(
          0,
          Number(progressState.remainingBuilders ?? totalBuildersRequired) || 0,
        );
    let availableResource = Number(projectedStocks[resourceCode] ?? 0);
    let costPaid = Boolean(progressState.costPaid);
    const isPlacedThisLune = Boolean(construction.isPlacedThisLune);
    let started =
      Boolean(progressState.started) ||
      isPlacedThisLune ||
      costPaid ||
      remainingBefore < totalBuildersRequired;
    const canStartWithResources =
      costPaid || resourceCost <= 0 || availableResource >= resourceCost;

    if (
      !progressState.completed &&
      isPlacedThisLune &&
      !costPaid &&
      canStartWithResources
    ) {
      projectedStocks[resourceCode] = availableResource - resourceCost;
      availableResource = Number(projectedStocks[resourceCode] ?? 0);
      costPaid = true;
      started = true;
    }

    const effectiveBuilders = progressState.completed
      ? 0
      : isPlacedThisLune && costPaid
        ? Math.min(assignedBuilders, remainingBefore)
        : 0;

    assignedList
      .slice(0, effectiveBuilders)
      .forEach(({ persoId, baseCapsAtStart, baseCombatAtStart }) => {
        if (construction.rewardType === "combat") {
          combatCourants[persoId] =
            baseCombatAtStart + computeIncrement(baseCombatAtStart);
        } else {
          const currentValue = Number(
            baseCapsAtStart[construction.rewardType] ?? 0,
          );
          const currentCaps = getOrCreatePersoCaps(capCourantes, persoId);
          currentCaps[construction.rewardType] =
            currentValue + computeIncrement(currentValue);
        }
      });

    const remainingBuilders = progressState.completed
      ? 0
      : Math.max(0, remainingBefore - effectiveBuilders);
    const isCompleted = costPaid && remainingBuilders === 0;
    const hasProgressDetails =
      started || costPaid || remainingBuilders < totalBuildersRequired;
    const statusCode = isCompleted
      ? "done"
      : isPlacedThisLune || Boolean(progressState.started)
        ? "in-progress"
        : "todo";

    const statusParts = [
      `${assignedBuilders}/${Math.max(1, remainingBefore)} bâtisseur(s)`,
    ];
    if (resourceCost > 0) {
      statusParts.push(
        costPaid
          ? `coût payé (${resourceCost} ${resourceCode.toUpperCase()})`
          : `coût ${resourceCost} ${resourceCode.toUpperCase()}`,
      );
    }

    if (isCompleted) {
      statusParts.push("terminé");
    } else if (!isPlacedThisLune) {
      statusParts.push(
        hasProgressDetails
          ? `à faire • ${remainingBuilders} restant(s)`
          : "non posé",
      );
    } else if (!costPaid && !canStartWithResources) {
      statusParts.push("ressource insuffisante pour poser");
    } else if (effectiveBuilders > 0) {
      statusParts.push(`en cours • ${remainingBuilders} restant(s)`);
    } else {
      statusParts.push(`posé • ${remainingBuilders} restant(s)`);
    }

    constructionProgressById[construction.id] = {
      remainingBuilders,
      costPaid,
      completed: isCompleted,
      started: started || effectiveBuilders > 0,
    };

    constructionStates[construction.id] = {
      assignedBuilders,
      buildersRequired: totalBuildersRequired,
      remainingBuilders,
      resourceCode,
      resourceCost,
      rewardType: construction.rewardType,
      isCompleted,
      statusCode,
      statusLabel: statusParts.join(" • "),
    };
  });

  return constructionStates;
};

const buildStockStats = (
  projectedStocks: Record<string, number>,
  previousStocks: Record<string, number> = {},
): TimelineStats => {
  const nextStocks = createStockSnapshot(projectedStocks);
  const startingStocks = createStockSnapshot(previousStocks);

  return {
    stockEau: nextStocks.eau,
    deltaEau: nextStocks.eau - startingStocks.eau,
    stockNrt: nextStocks.nrt,
    deltaNrt: nextStocks.nrt - startingStocks.nrt,
    stockMed: nextStocks.med,
    deltaMed: nextStocks.med - startingStocks.med,
    stockMat: nextStocks.mat,
    deltaMat: nextStocks.mat - startingStocks.mat,
    classEau: nextStocks.eau < 0 ? "danger" : "safe",
    classNrt: nextStocks.nrt < 0 ? "danger" : "safe",
    classMed: nextStocks.med < 0 ? "danger" : "safe",
    classMat: nextStocks.mat < 0 ? "danger" : "safe",
  };
};

const createEmptyLuneTotals = (): LuneTotals => ({
  eau: 0,
  nrt: 0,
  med: 0,
  mat: 0,
  consoEau: 0,
  consoNrt: 0,
  consoMed: 0,
});

const accumulatePersoResult = (
  luneTotals: LuneTotals,
  result: ProcessPersoResult,
): void => {
  luneTotals.eau += result.production.eau;
  luneTotals.nrt += result.production.nrt;
  luneTotals.med += result.production.med;
  luneTotals.mat += result.production.mat;
  luneTotals.consoEau += result.consumption.eau;
  luneTotals.consoNrt += result.consumption.nrt;
  luneTotals.consoMed += result.consumption.med;
};

export const simulateTimeline = (
  persos: Perso[],
  lunes: Lune[],
  stocks: Record<string, number>,
  defaultRation: () => Ration,
  constructions: LuneConstruction[] = [],
  resources: Resource[] = [],
  persoResources: PersoResource[] = [],
  cityMultipliers: CityMultipliersInput = {},
  currentLune = 1,
  constructionProgress: ConstructionProgressById = {},
  outils: Outil[] = [],
): TimelineSegment[] => {
  const timeline: TimelineSegment[] = [];
  const productionMultipliers = normalizeProductionMultipliers(cityMultipliers);
  const availableResourceCodes = buildAvailableResourceCodes(resources);
  const baseDrugStocksByPerso = buildDrugStocksByPerso(
    resources,
    persoResources,
  );
  let remainingDrugStocksByPerso = clonePersoDrugStocks(baseDrugStocksByPerso);
  const baseResourceStocks = Object.fromEntries(
    Object.entries(stocks || {}).map(([code, value]) => [
      code,
      Number(value ?? 0),
    ]),
  );
  const resourceStocks = { ...baseResourceStocks };
  let { pvCourants, capCourantes, combatCourants, presenceCourante } =
    initializePersoSimulationState(persos, remainingDrugStocksByPerso);

  const outilsById = new Map<number, Outil>(
    outils.map((outil) => [Number(outil.id), outil]),
  );
  const bestToolsBySpecialite = Object.fromEntries(
    toolSpecialiteOrder.map((specialite) => [
      specialite,
      getBestToolForSpecialite(outils, specialite),
    ]),
  ) as Record<ToolSpecialite, Outil | null>;
  const normalizedConstructions = normalizeLuneConstructions(constructions);
  const constructionProgressById = buildInitialConstructionProgress(
    normalizedConstructions,
    constructionProgress,
  );
  let hasResetStocksForCurrentLune = false;

  lunes.forEach((lune) => {
    if (
      !hasResetStocksForCurrentLune &&
      Number(lune.id ?? 0) >= Number(currentLune ?? 1)
    ) {
      Object.assign(resourceStocks, baseResourceStocks);
      remainingDrugStocksByPerso = clonePersoDrugStocks(baseDrugStocksByPerso);
      ({ pvCourants, capCourantes, combatCourants, presenceCourante } =
        initializePersoSimulationState(persos, remainingDrugStocksByPerso));
      hasResetStocksForCurrentLune = true;
    }
    const overrides = lune.overrides || {};
    const placedConstructionIds = new Set(
      getPlacedConstructionIdsForLune(lune),
    );
    const { constructionsForLune, activeConstructionsForLune } =
      buildConstructionPlanForLune({
        normalizedConstructions,
        constructionProgressById,
        placedConstructionIds,
      });
    const selectedToolMultipliers = buildSelectedToolMultipliers(
      lune,
      outilsById,
      bestToolsBySpecialite,
    );
    const frozenSegment =
      Number(lune.id ?? 0) < Number(currentLune ?? 1)
        ? getFrozenTimelineSegment(lune)
        : null;

    if (frozenSegment) {
      applyTimelineStateSnapshotToSimulation({
        endingState: frozenSegment.endingState,
        pvCourants,
        capCourantes,
        combatCourants,
        presenceCourante,
        resourceStocks,
        remainingResourceStocksByPerso: remainingDrugStocksByPerso,
      });

      timeline.push({
        lune: {
          ...lune,
          constructions: activeConstructionsForLune,
        },
        ...frozenSegment,
      });
      return;
    }

    const weatherCoefficients = normalizeWeatherCoefficients(lune.meteo);

    applyLuneOverrides({
      persos,
      overrides,
      presenceCourante,
      pvCourants,
      capCourantes,
      combatCourants,
    });

    const availableCityResourceStocks = createStockSnapshot(resourceStocks);
    const rows: TimelineRow[] = [];
    const constructionAssignments: ConstructionAssignment[] = [];
    const luneTotals = createEmptyLuneTotals();

    persos.forEach((perso) => {
      const persoResult = simulatePersoForLune({
        perso,
        lune,
        overrides,
        defaultRation,
        productionMultipliers,
        weatherCoefficients,
        pvCourants,
        capCourantes,
        combatCourants,
        presenceCourante,
        remainingDrugStocksByPerso,
        availableCityResourceStocks,
        availableResourceCodes,
        selectedToolMultipliers,
      });

      rows.push(persoResult.row);
      accumulatePersoResult(luneTotals, persoResult);

      if (persoResult.constructionAssignment) {
        constructionAssignments.push(persoResult.constructionAssignment);
      }
    });

    const startingStocks = createStockSnapshot(resourceStocks);
    const projectedStocks = projectStocksForLune(resourceStocks, luneTotals);
    const constructionStates = processConstructionProgress({
      constructionsForLune: constructionsForLune.map((construction) => ({
        ...construction,
        isPlacedThisLune: placedConstructionIds.has(construction.id),
      })),
      constructionAssignments,
      projectedStocks,
      constructionProgressById,
      capCourantes,
      combatCourants,
    });
    const stockStats = buildStockStats(projectedStocks, startingStocks);

    Object.assign(resourceStocks, projectedStocks);

    timeline.push({
      lune: {
        ...lune,
        constructions: activeConstructionsForLune,
      },
      rows,
      constructionStates,
      stats: stockStats,
      endingState: buildTimelineStateSnapshot({
        persos,
        pvCourants,
        capCourantes,
        combatCourants,
        presenceCourante,
        stocks: projectedStocks,
        remainingResourceStocksByPerso: remainingDrugStocksByPerso,
      }),
    });
  });

  return timeline;
};
