import type { Dispatch, SetStateAction } from "react";
import type {
  Action,
  Lune,
  LuneConstruction,
  Perso,
  Ration,
  ToolSpecialite,
  WeatherCoefficients,
} from "../types";
import { createDefaultConstruction } from "../utils/entityDefaults";
import {
  createLune,
  defaultRation,
  defaultWeatherCoefficients,
  getPlacedConstructionIdsForLune,
  normalizeConstructionPlacements,
  normalizeOptionalGroupId,
  normalizeWeatherCoefficient,
  normalizeWeatherCoefficients,
  syncConstructionStatusesWithLunes,
  syncLuneConstructionPlacements,
} from "../utils/stateUtils";

const sanitizeConstructions = (
  constructions: Array<Partial<LuneConstruction>> = [],
  lunes: Lune[] = [],
  currentLune = 1,
): LuneConstruction[] =>
  syncConstructionStatusesWithLunes(constructions, lunes, currentLune);

interface UseTimelineActionsParams {
  persos: Perso[];
  constructions: LuneConstruction[];
  actions: Action[];
  lunes: Lune[];
  currentLune: number;
  setConstructions: Dispatch<SetStateAction<LuneConstruction[]>>;
  setLunes: Dispatch<SetStateAction<Lune[]>>;
  setOpenOverrides: Dispatch<SetStateAction<Record<string, boolean>>>;
  saveLuneEntity: (lune: Lune) => void;
  deleteLuneEntity: (luneId: number) => void;
  saveConstructionsEntity: (constructions: LuneConstruction[]) => void;
}

export const useTimelineActions = ({
  persos,
  constructions,
  actions,
  lunes,
  currentLune,
  setConstructions,
  setLunes,
  setOpenOverrides,
  saveLuneEntity,
  deleteLuneEntity,
  saveConstructionsEntity,
}: UseTimelineActionsParams) => {
  const isPastLuneIndex = (luneIndex: number) =>
    Number(lunes[luneIndex]?.id ?? 0) < Number(currentLune ?? 1);

  const addLune = () => {
    const nextLuneId =
      lunes.reduce(
        (maxLuneId, lune) => Math.max(maxLuneId, Number(lune.id) || 0),
        0,
      ) + 1;
    const inheritedPlacedConstructionIds = getPlacedConstructionIdsForLune(
      lunes[lunes.length - 1],
    ).filter((id) =>
      (constructions || []).some(
        (item) => item.id === id && item.status !== "done",
      ),
    );
    const newLune = syncLuneConstructionPlacements({
      ...createLune(persos, nextLuneId),
      constructionPlacements: normalizeConstructionPlacements(
        inheritedPlacedConstructionIds,
        nextLuneId,
      ),
    });
    setLunes((previous) => [...previous, newLune]);
    saveLuneEntity(newLune);
  };

  const removeLune = (index: number) => {
    const luneToRemove = lunes[index];
    if (!luneToRemove || Number(luneToRemove.id) <= Number(currentLune ?? 1)) {
      return;
    }

    setLunes((previous) => previous.filter((_, idx) => idx !== index));
    deleteLuneEntity(luneToRemove.id);
  };

  const updateRation = (
    luneIndex: number,
    persoId: number,
    field:
      | "tache"
      | "eau"
      | "nrt"
      | "med"
      | "dehors"
      | "produit"
      | "drogue"
      | "constructionId"
      | "actionId",
    value: string | boolean,
  ) => {
    if (isPastLuneIndex(luneIndex)) {
      return;
    }

    const nextLunes = lunes.map((lune, idx) => {
      if (idx !== luneIndex) return lune;
      const current = lune.rations[persoId] || defaultRation();
      const nextRation = {
        ...current,
        [field]:
          field === "tache"
            ? value
            : field === "drogue"
              ? value === "" || value === null || value === undefined
                ? null
                : String(value).toLowerCase()
              : field === "constructionId"
                ? value === "" || value === null || value === undefined
                  ? null
                  : String(value)
                : Boolean(value),
      };

      if (field === "tache" && value !== "construire") {
        nextRation.constructionId = null;
      }

      if (field === "tache" && value !== "fabriquer") {
        nextRation.actionId = null;
      }

      if (
        field === "tache" &&
        value === "construire" &&
        !nextRation.constructionId
      ) {
        nextRation.constructionId = constructions?.[0]?.id ?? null;
      }

      if (field === "tache" && value === "fabriquer" && !nextRation.actionId) {
        nextRation.actionId = actions?.[0]?.id ?? null;
      }

      return {
        ...lune,
        rations: { ...lune.rations, [persoId]: nextRation },
      };
    });

    setLunes(nextLunes);
    if (nextLunes[luneIndex]) {
      saveLuneEntity(nextLunes[luneIndex]);
    }
  };

  const addConstruction = () => {
    const existingConstructions: LuneConstruction[] = Array.isArray(
      constructions,
    )
      ? constructions
      : [];
    const nextConstructionId =
      existingConstructions.reduce((maxId, construction) => {
        const numericId = Number(
          String(construction.id || "").replace(/[^0-9]/g, ""),
        );
        return Number.isFinite(numericId) ? Math.max(maxId, numericId) : maxId;
      }, 0) + 1;

    const nextConstructions: LuneConstruction[] = sanitizeConstructions(
      [...existingConstructions, createDefaultConstruction(nextConstructionId)],
      lunes,
      currentLune,
    );

    setConstructions(nextConstructions);
    saveConstructionsEntity(nextConstructions);
  };

  const updateConstruction = (
    constructionId: string,
    field: string,
    rawValue: string | number,
  ) => {
    if (field === "status") {
      const nextStatus: "todo" | "in-progress" | "done" =
        rawValue === "done" || rawValue === "in-progress" ? rawValue : "todo";
      const nextLunes = lunes.map((lune) => {
        const currentIds = getPlacedConstructionIdsForLune(lune);

        if (
          nextStatus === "in-progress" &&
          Number(lune.id ?? 0) >= Number(currentLune ?? 1)
        ) {
          return syncLuneConstructionPlacements({
            ...lune,
            constructionPlacements: normalizeConstructionPlacements(
              Array.from(new Set([...currentIds, String(constructionId)])),
              Number(lune.id ?? currentLune ?? 1),
            ),
          });
        }

        if (nextStatus === "todo" || nextStatus === "done") {
          return syncLuneConstructionPlacements({
            ...lune,
            constructionPlacements: normalizeConstructionPlacements(
              currentIds.filter((id) => id !== String(constructionId)),
              Number(lune.id ?? currentLune ?? 1),
            ),
          });
        }

        return lune;
      });

      const nextConstructions = sanitizeConstructions(
        (constructions || []).map((construction) =>
          construction.id !== constructionId
            ? construction
            : { ...construction, status: nextStatus },
        ),
        nextLunes,
        currentLune,
      ).map((construction) =>
        construction.id === constructionId
          ? { ...construction, status: nextStatus }
          : construction,
      );

      setConstructions(nextConstructions);
      setLunes(nextLunes);
      saveConstructionsEntity(nextConstructions);
      nextLunes.forEach((lune) => saveLuneEntity(lune));
      return;
    }

    const nextConstructions = sanitizeConstructions(
      (constructions || []).map((construction) =>
        construction.id !== constructionId
          ? construction
          : {
              ...construction,
              [field]:
                field === "resourceCost"
                  ? Math.max(0, Number(rawValue) || 0)
                  : field === "buildersRequired"
                    ? Math.max(1, Math.floor(Number(rawValue) || 1))
                    : String(rawValue ?? ""),
            },
      ),
      lunes,
      currentLune,
    );

    setConstructions(nextConstructions);
    saveConstructionsEntity(nextConstructions);
  };

  const removeConstruction = (constructionId: string) => {
    const constructionToRemove = (constructions || []).find(
      (construction) => construction.id === constructionId,
    );
    if (!constructionToRemove) {
      return;
    }

    const confirmed = window.confirm(
      `Supprimer définitivement le chantier "${constructionToRemove.name}" ?`,
    );
    if (!confirmed) {
      return;
    }

    const nextConstructions = sanitizeConstructions(
      (constructions || []).filter(
        (construction) => construction.id !== constructionId,
      ),
      lunes,
      currentLune,
    );

    const nextLunes = lunes.map((lune) => {
      const nextRations = Object.fromEntries(
        Object.entries(lune.rations || {}).map(([persoId, ration]) => {
          const currentRation: Ration =
            ration && typeof ration === "object"
              ? (ration as Ration)
              : defaultRation();

          return [
            persoId,
            currentRation.constructionId === constructionId
              ? { ...currentRation, constructionId: null, tache: "" }
              : currentRation,
          ];
        }),
      );

      return syncLuneConstructionPlacements({
        ...lune,
        rations: nextRations,
        constructionPlacements: normalizeConstructionPlacements(
          getPlacedConstructionIdsForLune(lune).filter(
            (id) => id !== constructionId,
          ),
          Number(lune.id ?? currentLune ?? 1),
        ),
      });
    });

    setConstructions(nextConstructions);
    setLunes(nextLunes);
    saveConstructionsEntity(nextConstructions);
    nextLunes.forEach((lune) => saveLuneEntity(lune));
  };

  const toggleConstructionPlacement = (
    luneIndex: number,
    constructionId: string,
    isPlaced: boolean,
  ) => {
    if (isPastLuneIndex(luneIndex)) {
      return;
    }

    const normalizedConstructionId = String(constructionId);
    const nextLunes = lunes.map((lune, idx) => {
      if (idx < luneIndex) return lune;

      const currentIds = getPlacedConstructionIdsForLune(lune);
      const nextIds = isPlaced
        ? Array.from(new Set([...currentIds, normalizedConstructionId]))
        : currentIds.filter((id) => id !== normalizedConstructionId);

      return syncLuneConstructionPlacements({
        ...lune,
        constructionPlacements: normalizeConstructionPlacements(
          nextIds,
          Number(lune.id ?? currentLune ?? 1),
        ),
      });
    });

    const nextConstructions = sanitizeConstructions(
      constructions || [],
      nextLunes,
      currentLune,
    );

    setLunes(nextLunes);
    setConstructions(nextConstructions);
    saveConstructionsEntity(nextConstructions);
    nextLunes.slice(luneIndex).forEach((lune) => saveLuneEntity(lune));
  };

  const updateLuneWeather = (
    luneIndex: number,
    resourceKey: keyof WeatherCoefficients,
    rawValue: string | number,
  ) => {
    if (isPastLuneIndex(luneIndex)) {
      return;
    }

    const nextLunes = lunes.map((lune, idx) => {
      if (idx !== luneIndex) return lune;

      return {
        ...lune,
        meteo: {
          ...defaultWeatherCoefficients,
          ...normalizeWeatherCoefficients(lune.meteo),
          [resourceKey]: normalizeWeatherCoefficient(rawValue),
        },
      };
    });

    setLunes(nextLunes);
    if (nextLunes[luneIndex]) {
      saveLuneEntity(nextLunes[luneIndex]);
    }
  };

  const toggleLuneAutoAssign = (luneIndex: number, checked: boolean) => {
    if (isPastLuneIndex(luneIndex)) {
      return;
    }

    const nextLunes = lunes.map((lune, idx) =>
      idx !== luneIndex ? lune : { ...lune, autoAssign: checked },
    );

    setLunes(nextLunes);
    if (nextLunes[luneIndex]) {
      saveLuneEntity(nextLunes[luneIndex]);
    }
  };

  const updateLuneToolAssignment = (
    luneIndex: number,
    specialite: ToolSpecialite,
    rawValue: string | number,
  ) => {
    if (isPastLuneIndex(luneIndex)) {
      return;
    }

    const nextLunes = lunes.map((lune, idx) => {
      if (idx !== luneIndex) return lune;

      return {
        ...lune,
        toolAssignments: {
          ...(lune.toolAssignments ?? {}),
          [specialite]: normalizeOptionalGroupId(rawValue),
        },
      };
    });

    setLunes(nextLunes);
    if (nextLunes[luneIndex]) {
      saveLuneEntity(nextLunes[luneIndex]);
    }
  };

  const toggleOverrideMenu = (luneIndex: number, persoId: number) => {
    if (isPastLuneIndex(luneIndex)) {
      return;
    }

    const key = `${luneIndex}-${persoId}`;
    setOpenOverrides((previous) => ({ ...previous, [key]: !previous[key] }));
  };

  const setOverride = (
    luneIndex: number,
    persoId: number,
    field: string,
    rawValue: string | number | boolean | null,
  ) => {
    if (isPastLuneIndex(luneIndex)) {
      return;
    }

    const nextLunes = lunes.map((lune, idx) => {
      if (idx !== luneIndex) return lune;
      const existing = { ...(lune.overrides || {}) };
      const current = { ...(existing[persoId] || {}) };

      if (rawValue === "") {
        delete current[field];
        if (Object.keys(current).length > 0) {
          existing[persoId] = current;
        } else {
          delete existing[persoId];
        }
      } else {
        const numericValue = Number(rawValue);
        existing[persoId] = {
          ...current,
          [field]:
            field === "present"
              ? rawValue === true || rawValue === "true"
              : Math.max(0, Number.isFinite(numericValue) ? numericValue : 0),
        };
      }

      return { ...lune, overrides: existing };
    });

    setLunes(nextLunes);
    if (nextLunes[luneIndex]) {
      saveLuneEntity(nextLunes[luneIndex]);
    }
  };

  const clearOverrides = (luneIndex: number, persoId: number) => {
    if (isPastLuneIndex(luneIndex)) {
      return;
    }

    const nextLunes = lunes.map((lune, idx) => {
      if (idx !== luneIndex) return lune;
      const overrides = { ...(lune.overrides || {}) };
      delete overrides[persoId];
      return { ...lune, overrides };
    });

    setLunes(nextLunes);
    if (nextLunes[luneIndex]) {
      saveLuneEntity(nextLunes[luneIndex]);
    }

    setOpenOverrides((previous) => {
      const key = `${luneIndex}-${persoId}`;
      const next = { ...previous };
      delete next[key];
      return next;
    });
  };

  return {
    addLune,
    removeLune,
    updateRation,
    addConstruction,
    updateConstruction,
    removeConstruction,
    toggleConstructionPlacement,
    updateLuneWeather,
    toggleLuneAutoAssign,
    updateLuneToolAssignment,
    toggleOverrideMenu,
    setOverride,
    clearOverrides,
  };
};
