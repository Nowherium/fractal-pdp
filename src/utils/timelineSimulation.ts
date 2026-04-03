import type {
  ConstructionProgressById,
  Lune,
  LuneConstruction,
  Perso,
  PersoResource,
  Ration,
  Resource,
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
  TimelineRow,
  TimelineSegment,
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

const productionTaskKeys = ["eau", "nrt", "med", "mat"] as const;
type ProductionTaskKey = (typeof productionTaskKeys)[number];

const overrideCapMappings = [
  ["capEau", "eau"],
  ["capNrt", "nrt"],
  ["capMed", "med"],
  ["capMat", "mat"],
  ["capArt", "art"],
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

    if (!Number.isFinite(persoId) || !code || !DRUG_EFFECTS[code]) {
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
      eau: Number(perso.capEauEffectif ?? perso.capEau ?? 0),
      nrt: Number(perso.capNrtEffectif ?? perso.capNrt ?? 0),
      med: Number(perso.capMedEffectif ?? perso.capMed ?? 0),
      mat: Number(perso.capMatEffectif ?? perso.capMat ?? 0),
      art: Number(perso.capArtEffectif ?? perso.capart ?? 0),
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
}): ProcessPersoResult => {
  const basePvDebut = Number(pvCourants[perso.id] ?? 0);
  const ration = { ...defaultRation(), ...(lune.rations[perso.id] ?? {}) };
  const override = overrides[perso.id] ?? {};
  const hasOverride = Object.keys(override).length > 0;
  const isAbsent = presenceCourante[perso.id] === false;
  const mortAuDebut = basePvDebut <= 0;
  const selectedDrugCode = normalizeDrugCode(ration.drogue);
  const persoDrugStocks =
    remainingDrugStocksByPerso[perso.id] ??
    (remainingDrugStocksByPerso[perso.id] = {});
  const availableDrugs = buildAvailableDrugsMap(persoDrugStocks);

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
  let cDebut: PersoCaps = {
    eau:
      baseCapsAtStart.eau * productionMultipliers.eau * weatherCoefficients.eau,
    nrt:
      baseCapsAtStart.nrt * productionMultipliers.nrt * weatherCoefficients.nrt,
    med:
      baseCapsAtStart.med * productionMultipliers.med * weatherCoefficients.med,
    mat:
      baseCapsAtStart.mat * productionMultipliers.mat * weatherCoefficients.mat,
    art: baseCapsAtStart.art,
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
      currentCaps[ration.tache] =
        baseCapsAtStart[ration.tache] +
        computeIncrement(baseCapsAtStart[ration.tache]);
    }
    if (ration.tache === "construire" && ration.constructionId) {
      constructionAssignment = {
        persoId: perso.id,
        constructionId: String(ration.constructionId),
        baseCapsAtStart,
        baseCombatAtStart,
      };
    }

    if (ration.eau) consumption.eau += 1;
    if (ration.nrt) consumption.nrt += 1;
    if (ration.med) consumption.med += 1;

    const degats =
      (ration.eau ? 0 : 1) + (ration.nrt ? 0 : 1) + (ration.med ? 0 : 0.5);
    pvFin = Math.max(0, pvDebut - degats);
    pvCourants[perso.id] =
      temporaryPvBonus > 0
        ? Math.max(0, Math.min(pvFin, Number(perso.pvmax ?? pvFin)))
        : pvFin;
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
): TimelineStats => {
  const nextStocks = createStockSnapshot(projectedStocks);

  return {
    stockEau: nextStocks.eau,
    stockNrt: nextStocks.nrt,
    stockMed: nextStocks.med,
    stockMat: nextStocks.mat,
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
): TimelineSegment[] => {
  const timeline: TimelineSegment[] = [];
  const productionMultipliers = normalizeProductionMultipliers(cityMultipliers);
  const remainingDrugStocksByPerso = buildDrugStocksByPerso(
    resources,
    persoResources,
  );
  const baseResourceStocks = Object.fromEntries(
    Object.entries(stocks || {}).map(([code, value]) => [
      code,
      Number(value ?? 0),
    ]),
  );
  const resourceStocks = { ...baseResourceStocks };
  const { pvCourants, capCourantes, combatCourants, presenceCourante } =
    initializePersoSimulationState(persos, remainingDrugStocksByPerso);

  let {
    eau: stockEau,
    nrt: stockNrt,
    med: stockMed,
    mat: stockMat,
  } = createStockSnapshot(resourceStocks);
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
      stockEau = Number(baseResourceStocks["eau"] ?? 0);
      stockNrt = Number(baseResourceStocks["nrt"] ?? 0);
      stockMed = Number(baseResourceStocks["med"] ?? 0);
      stockMat = Number(baseResourceStocks["mat"] ?? 0);
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
    const weatherCoefficients = normalizeWeatherCoefficients(lune.meteo);

    applyLuneOverrides({
      persos,
      overrides,
      presenceCourante,
      pvCourants,
      capCourantes,
      combatCourants,
    });

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
      });

      rows.push(persoResult.row);
      accumulatePersoResult(luneTotals, persoResult);

      if (persoResult.constructionAssignment) {
        constructionAssignments.push(persoResult.constructionAssignment);
      }
    });

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

    Object.assign(resourceStocks, projectedStocks);
    ({ stockEau, stockNrt, stockMed, stockMat } =
      buildStockStats(projectedStocks));

    timeline.push({
      lune: {
        ...lune,
        constructions: activeConstructionsForLune,
      },
      rows,
      constructionStates,
      stats: buildStockStats({
        eau: stockEau,
        nrt: stockNrt,
        med: stockMed,
        mat: stockMat,
      }),
    });
  });

  return timeline;
};
