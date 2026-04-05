import type { ConstructionProgressById, LuneConstruction } from "../../types";
import type {
  ConstructionAssignment,
  ConstructionProgressSnapshot,
  ConstructionState,
  LuneTotals,
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

export const processConstructionProgress = ({
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

export const buildStockStats = (
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

export const createEmptyLuneTotals = (): LuneTotals => ({
  eau: 0,
  nrt: 0,
  med: 0,
  mat: 0,
  consoEau: 0,
  consoNrt: 0,
  consoMed: 0,
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
};
