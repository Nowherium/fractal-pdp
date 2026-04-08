import type {
  ConstructionProgressById,
  ConstructionStatus,
  LuneConstruction,
  LunePlacement,
} from "../../types";
import type { LuneInput, RawConstructionPlacement } from "./shared";

const constructionRewardTypes = new Set([
  "eau",
  "nrt",
  "med",
  "mat",
  "art",
  "combat",
]);
const constructionStatuses = new Set(["todo", "in-progress", "done"]);

const normalizeConstructionStatus = (
  value: unknown,
  fallback: ConstructionStatus = "todo",
): ConstructionStatus =>
  constructionStatuses.has(value as ConstructionStatus)
    ? (value as ConstructionStatus)
    : fallback;

export const normalizeLuneConstructions = (
  constructions: Array<Partial<LuneConstruction>> = [],
): LuneConstruction[] =>
  (Array.isArray(constructions) ? constructions : []).map(
    (construction, index) => {
      const rewardType =
        typeof construction?.rewardType === "string"
          ? construction.rewardType
          : "";

      return {
        id: String(construction?.id ?? `construction-${index + 1}`),
        name: String(construction?.name ?? `Construction ${index + 1}`),
        resourceCode: String(construction?.resourceCode ?? "mat")
          .trim()
          .toLowerCase(),
        resourceCost: Math.max(0, Number(construction?.resourceCost ?? 0) || 0),
        buildersRequired: Math.max(
          1,
          Math.floor(Number(construction?.buildersRequired ?? 1) || 1),
        ),
        rewardType: constructionRewardTypes.has(
          rewardType as LuneConstruction["rewardType"],
        )
          ? (rewardType as LuneConstruction["rewardType"])
          : "mat",
        status: normalizeConstructionStatus(construction?.status),
      };
    },
  );

export const buildConstructionProgressById = (
  constructions: Array<Partial<LuneConstruction>> = [],
  lunes: LuneInput[] = [],
  currentLuneValue = 1,
  explicitProgress: ConstructionProgressById = {},
): ConstructionProgressById => {
  const normalizedCurrentLune = Math.max(
    1,
    Math.floor(Number(currentLuneValue) || 1),
  );
  const progressSource =
    explicitProgress && typeof explicitProgress === "object"
      ? explicitProgress
      : {};
  const earliestPlacementById = new Map<string, number>();
  const placedFromCurrent = new Set<string>();

  (Array.isArray(lunes) ? lunes : []).forEach((lune) => {
    const luneId = Number(lune?.id ?? 0);
    const constructionIds = getPlacedConstructionIdsForLune(lune);

    constructionIds.forEach((constructionId) => {
      if (
        Number.isFinite(luneId) &&
        luneId > 0 &&
        !earliestPlacementById.has(constructionId)
      ) {
        earliestPlacementById.set(constructionId, luneId);
      }

      if (luneId >= normalizedCurrentLune) {
        placedFromCurrent.add(constructionId);
      }
    });
  });

  return Object.fromEntries(
    normalizeLuneConstructions(constructions).map((construction) => {
      const progressEntry = progressSource[String(construction.id)];
      const existingProgress: Partial<ConstructionProgressById[string]> =
        progressEntry && typeof progressEntry === "object" ? progressEntry : {};
      const buildersRequired = Math.max(
        1,
        Math.floor(Number(construction.buildersRequired ?? 1) || 1),
      );
      const baseStatus = normalizeConstructionStatus(
        existingProgress.status ?? construction.status,
      );
      const rawRemainingBuilders = Number(
        existingProgress.remainingBuilders ??
          construction.remainingBuilders ??
          (baseStatus === "done" ? 0 : buildersRequired),
      );
      const remainingBuilders =
        baseStatus === "done"
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
        baseStatus === "done"
          ? true
          : Boolean(
              existingProgress.costPaid ?? construction.costPaid ?? false,
            );
      const startedAtLune = Number(
        existingProgress.startedAtLune ??
          earliestPlacementById.get(construction.id),
      );
      const completedAtLune = Number(existingProgress.completedAtLune);
      const hasStarted =
        placedFromCurrent.has(construction.id) ||
        baseStatus === "in-progress" ||
        (baseStatus !== "todo" &&
          (costPaid ||
            remainingBuilders < buildersRequired ||
            (Number.isFinite(startedAtLune) && startedAtLune > 0)));

      const status =
        baseStatus === "done" ? "done" : hasStarted ? "in-progress" : "todo";

      return [
        construction.id,
        {
          constructionId: construction.id,
          status,
          costPaid: status === "done" ? true : costPaid,
          remainingBuilders: status === "done" ? 0 : remainingBuilders,
          startedAtLune:
            Number.isFinite(startedAtLune) && startedAtLune > 0
              ? startedAtLune
              : null,
          completedAtLune:
            status === "done" &&
            Number.isFinite(completedAtLune) &&
            completedAtLune > 0
              ? completedAtLune
              : null,
        },
      ];
    }),
  );
};

export const mergeConstructionProgressIntoConstructions = (
  constructions: Array<Partial<LuneConstruction>> = [],
  constructionProgress: ConstructionProgressById = {},
): LuneConstruction[] =>
  normalizeLuneConstructions(constructions).map((construction) => {
    const progress = constructionProgress?.[construction.id];
    const status = normalizeConstructionStatus(
      progress?.status ?? construction.status,
    );
    const rawRemainingBuilders = Number(
      progress?.remainingBuilders ??
        construction.remainingBuilders ??
        construction.buildersRequired ??
        1,
    );

    return {
      ...construction,
      status,
      costPaid:
        status === "done"
          ? true
          : Boolean(progress?.costPaid ?? construction.costPaid ?? false),
      remainingBuilders:
        status === "done"
          ? 0
          : Math.max(
              0,
              Math.min(
                construction.buildersRequired,
                Number.isFinite(rawRemainingBuilders)
                  ? rawRemainingBuilders
                  : construction.buildersRequired,
              ),
            ),
    };
  });

export const syncConstructionStatusesWithLunes = (
  constructions: Array<Partial<LuneConstruction>> = [],
  lunes: LuneInput[] = [],
  currentLuneValue = 1,
): LuneConstruction[] => {
  const constructionProgress = buildConstructionProgressById(
    constructions,
    lunes,
    currentLuneValue,
  );

  return mergeConstructionProgressIntoConstructions(
    constructions,
    constructionProgress,
  );
};

const normalizeConstructionPlacementLuneId = (
  value: unknown,
  fallback = 1,
): number => {
  const numericValue = Math.floor(Number(value));
  if (Number.isFinite(numericValue) && numericValue > 0) {
    return numericValue;
  }
  return Math.max(1, Math.floor(Number(fallback) || 1));
};

export const normalizeConstructionPlacements = (
  value: RawConstructionPlacement[] = [],
  luneId = 1,
): LunePlacement[] => {
  const placementsByConstructionId = new Map();

  (Array.isArray(value) ? value : []).forEach((entry) => {
    if (typeof entry === "string" || typeof entry === "number") {
      const constructionId = String(entry);
      if (!constructionId) return;
      placementsByConstructionId.set(constructionId, {
        luneId: normalizeConstructionPlacementLuneId(luneId),
        constructionId,
        isPlaced: true,
      });
      return;
    }

    if (!entry || typeof entry !== "object") {
      return;
    }

    const constructionId = String(entry.constructionId ?? entry.id ?? "");
    if (!constructionId) return;

    placementsByConstructionId.set(constructionId, {
      luneId: normalizeConstructionPlacementLuneId(
        entry.luneId,
        luneId ?? entry.luneId,
      ),
      constructionId,
      isPlaced: entry.isPlaced !== false,
    });
  });

  return Array.from(placementsByConstructionId.values());
};

export const getPlacedConstructionIdsForLune = (
  luneOrPlacements: LuneInput | RawConstructionPlacement[] = [],
): string[] => {
  const placements = Array.isArray(luneOrPlacements)
    ? normalizeConstructionPlacements(luneOrPlacements)
    : normalizeConstructionPlacements(
        luneOrPlacements?.constructionPlacements ??
          luneOrPlacements?.placedConstructionIds ??
          luneOrPlacements?.constructions,
        luneOrPlacements?.id,
      );

  return placements
    .filter((placement) => placement.isPlaced !== false)
    .map((placement) => String(placement.constructionId))
    .filter(Boolean);
};

export const syncLuneConstructionPlacements = <
  T extends {
    id?: number;
    constructionPlacements?: LunePlacement[];
    placedConstructionIds?: Array<string | number>;
    constructions?: unknown[];
    actions?: unknown[];
  },
>(
  lune: T,
): Omit<T, "placedConstructionIds"> & {
  constructionPlacements: LunePlacement[];
} => {
  const source: T = lune && typeof lune === "object" ? lune : ({} as T);
  const { placedConstructionIds: _legacyPlacedConstructionIds, ...restLune } =
    source;
  const placementSource = Array.isArray(source.constructionPlacements)
    ? source.constructionPlacements
    : Array.isArray(source.placedConstructionIds)
      ? source.placedConstructionIds
      : Array.isArray(source.constructions)
        ? (source.constructions as RawConstructionPlacement[])
        : [];
  const constructionPlacements = normalizeConstructionPlacements(
    placementSource,
    source.id,
  );

  return {
    ...restLune,
    constructionPlacements,
  } as Omit<T, "placedConstructionIds"> & {
    constructionPlacements: LunePlacement[];
  };
};
