import type { ConstructionProgressById, LuneConstruction } from "../../types";
import type {
  ConstructionAssignment,
  ConstructionProgressSnapshot,
  ConstructionState,
  LuneTotals,
  PersoDrugStocks,
  ProcessPersoResult,
  RuntimeConstructionProgress,
  SimulatedConstruction,
  SimulationState,
  StockSnapshot,
  TimelineStats,
} from "../timelineTypes";

import { computeIncrement, createStockSnapshot } from "../timelineHelpers";
import { normalizeLuneConstructions } from "../stateUtils";

import { getOrCreatePersoCaps } from "./state";

export const buildInitialConstructionProgress = (
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

export const buildConstructionPlanForLune = ({
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

export const projectStocksForLune = (
  resourceStocks: Record<string, number>,
  luneTotals: LuneTotals,
): StockSnapshot => ({
  ...resourceStocks,
  eau:
    Number(resourceStocks["eau"] ?? 0) +
    luneTotals.eau -
    luneTotals.cityConsoEau,
  nrt:
    Number(resourceStocks["nrt"] ?? 0) +
    luneTotals.nrt -
    luneTotals.cityConsoNrt,
  med:
    Number(resourceStocks["med"] ?? 0) +
    luneTotals.med -
    luneTotals.cityConsoMed,
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

export const processConstructionProgress = ({
  constructionsForLune,
  constructionAssignments,
  projectedStocks,
  constructionProgressById,
  capCourantes,
  combatCourants,
  luneTotals,
}: {
  constructionsForLune: SimulatedConstruction[];
  constructionAssignments: ConstructionAssignment[];
  projectedStocks: StockSnapshot;
  constructionProgressById: Record<string, RuntimeConstructionProgress>;
  capCourantes: SimulationState["capCourantes"];
  combatCourants: SimulationState["combatCourants"];
  luneTotals: LuneTotals;
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

      switch (resourceCode) {
        case "eau":
          luneTotals.consoEau += resourceCost;
          luneTotals.cityConsoEau += resourceCost;
          break;
        case "nrt":
          luneTotals.consoNrt += resourceCost;
          luneTotals.cityConsoNrt += resourceCost;
          break;
        case "med":
          luneTotals.consoMed += resourceCost;
          luneTotals.cityConsoMed += resourceCost;
          break;
        case "mat":
          luneTotals.consoMat += resourceCost;
          luneTotals.cityConsoMat += resourceCost;
          break;
        default:
          break;
      }

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

const buildCarriedStockSnapshot = (
  carriedResourcesByPerso: PersoDrugStocks = {},
): StockSnapshot => {
  const totals = { eau: 0, nrt: 0, med: 0, mat: 0 };

  Object.values(carriedResourcesByPerso).forEach((carriedResources) => {
    totals["eau"] += Number(carriedResources?.["eau"] ?? 0);
    totals["nrt"] += Number(carriedResources?.["nrt"] ?? 0);
    totals["med"] += Number(carriedResources?.["med"] ?? 0);
    totals["mat"] += Number(carriedResources?.["mat"] ?? 0);
  });

  return createStockSnapshot(totals);
};

export const buildStockStats = (
  projectedStocks: Record<string, number>,
  previousStocks: Record<string, number> = {},
  luneTotals?: LuneTotals,
  startingCarriedResources: PersoDrugStocks = {},
  endingCarriedResources: PersoDrugStocks = {},
): TimelineStats => {
  const nextCityStocks = createStockSnapshot(projectedStocks);
  const startingCityStocks = createStockSnapshot(previousStocks);
  const startingCarriedStocks = buildCarriedStockSnapshot(
    startingCarriedResources,
  );
  const endingCarriedStocks = buildCarriedStockSnapshot(endingCarriedResources);
  const nextStocks = {
    eau: nextCityStocks.eau + endingCarriedStocks.eau,
    nrt: nextCityStocks.nrt + endingCarriedStocks.nrt,
    med: nextCityStocks.med + endingCarriedStocks.med,
    mat: nextCityStocks.mat + endingCarriedStocks.mat,
  };
  const startingStocks = {
    eau: startingCityStocks.eau + startingCarriedStocks.eau,
    nrt: startingCityStocks.nrt + startingCarriedStocks.nrt,
    med: startingCityStocks.med + startingCarriedStocks.med,
    mat: startingCityStocks.mat + startingCarriedStocks.mat,
  };
  const totals = luneTotals ?? createEmptyLuneTotals();

  return {
    startEau: startingStocks.eau,
    prodEau: totals.eau,
    consoEau: totals.consoEau,
    stockEau: nextStocks.eau,
    deltaEau: nextStocks.eau - startingStocks.eau,
    startNrt: startingStocks.nrt,
    prodNrt: totals.nrt,
    consoNrt: totals.consoNrt,
    stockNrt: nextStocks.nrt,
    deltaNrt: nextStocks.nrt - startingStocks.nrt,
    startMed: startingStocks.med,
    prodMed: totals.med,
    consoMed: totals.consoMed,
    stockMed: nextStocks.med,
    deltaMed: nextStocks.med - startingStocks.med,
    startMat: startingStocks.mat,
    prodMat: totals.mat,
    consoMat: totals.consoMat,
    stockMat: nextStocks.mat,
    deltaMat: nextStocks.mat - startingStocks.mat,
    classEau: nextStocks.eau < 0 ? "danger" : "safe",
    classNrt: nextStocks.nrt < 0 ? "danger" : "safe",
    classMed: nextStocks.med < 0 ? "danger" : "safe",
    classMat: nextStocks.mat < 0 ? "danger" : "safe",
  };
};

export const createEmptyLuneTotals = (): LuneTotals => ({
  eau: 0,
  nrt: 0,
  med: 0,
  mat: 0,
  consoEau: 0,
  consoNrt: 0,
  consoMed: 0,
  consoMat: 0,
  cityConsoEau: 0,
  cityConsoNrt: 0,
  cityConsoMed: 0,
  cityConsoMat: 0,
});

export const accumulatePersoResult = (
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
  luneTotals.consoMat += result.consumption.mat;
  luneTotals.cityConsoEau += result.cityConsumption.eau;
  luneTotals.cityConsoNrt += result.cityConsumption.nrt;
  luneTotals.cityConsoMed += result.cityConsumption.med;
  luneTotals.cityConsoMat += result.cityConsumption.mat;
};
