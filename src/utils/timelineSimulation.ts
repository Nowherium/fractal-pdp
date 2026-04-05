import type {
  ConstructionProgressById,
  Lune,
  LuneConstruction,
  Outil,
  Perso,
  PersoResource,
  Ration,
  Resource,
} from "../types";
import type {
  CityMultipliersInput,
  ConstructionAssignment,
  TimelineRow,
  TimelineSegment,
} from "./timelineTypes";

import {
  createStockSnapshot,
  normalizeProductionMultipliers,
  normalizeWeatherCoefficients,
} from "./timelineHelpers";
import {
  getPlacedConstructionIdsForLune,
  normalizeLuneConstructions,
} from "./stateUtils";
import {
  accumulatePersoResult,
  buildConstructionPlanForLune,
  buildInitialConstructionProgress,
  buildStockStats,
  createEmptyLuneTotals,
  processConstructionProgress,
  projectStocksForLune,
} from "./timelineSimulation/constructions";
import {
  buildAvailableResourceCodes,
  simulatePersoForLune,
} from "./timelineSimulation/persos";
import {
  applyLuneOverrides,
  applyTimelineStateSnapshotToSimulation,
  buildBestToolsBySpecialite,
  buildDrugStocksByPerso,
  buildSelectedToolMultipliers,
  buildTimelineStateSnapshot,
  clonePersoDrugStocks,
  getFrozenTimelineSegment,
  initializePersoSimulationState,
} from "./timelineSimulation/state";

export {
  applyTimelineSegmentToState,
  buildFrozenTimelineSnapshot,
} from "./timelineSimulation/state";

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
  const bestToolsBySpecialite = buildBestToolsBySpecialite(outils);
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
