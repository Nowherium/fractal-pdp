import type {
  Action,
  Arme,
  ConstructionProgressById,
  Lune,
  LuneConstruction,
  Outil,
  Perso,
  PersoResource,
  Ration,
  Resource,
  Sac,
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
  actions: Action[] = [],
  armes: Arme[] = [],
  sacs: Sac[] = [],
): TimelineSegment[] => {
  const timeline: TimelineSegment[] = [];
  const productionMultipliers = normalizeProductionMultipliers(cityMultipliers);
  const availableResourceCodes = buildAvailableResourceCodes(resources);
  const resourceCodesById = new Map<number, string>(
    resources.map((resource) => [
      Number(resource.id),
      String(resource.code ?? "")
        .trim()
        .toLowerCase(),
    ]),
  );
  const actionsById = new Map<number, Action>(
    actions.map((action) => [Number(action.id), action]),
  );
  const craftableTargetIds = {
    arme: new Set(armes.map((arme) => Number(arme.id))),
    outil: new Set(outils.map((outil) => Number(outil.id))),
    sac: new Set(sacs.map((sac) => Number(sac.id))),
  };
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
    const startingCarriedResources = clonePersoDrugStocks(
      remainingDrugStocksByPerso,
    );
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
        actionsById,
        resourceCodesById,
        craftableTargetIds,
      });

      rows.push(persoResult.row);
      accumulatePersoResult(luneTotals, persoResult);

      if (persoResult.constructionAssignment) {
        constructionAssignments.push(persoResult.constructionAssignment);
      }
    });

    const startingStocks = createStockSnapshot(resourceStocks);
    const projectedStocks = projectStocksForLune(resourceStocks, luneTotals);

    Object.entries(availableCityResourceStocks).forEach(([code, quantity]) => {
      if (code === "eau" || code === "nrt" || code === "med") {
        return;
      }

      if (code === "mat") {
        projectedStocks[code] = Number(quantity ?? 0) + luneTotals.mat;
        return;
      }

      projectedStocks[code] = Number(quantity ?? 0);
    });

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
      luneTotals,
    });
    const stockStats = buildStockStats(
      projectedStocks,
      startingStocks,
      luneTotals,
      startingCarriedResources,
      remainingDrugStocksByPerso,
    );

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
