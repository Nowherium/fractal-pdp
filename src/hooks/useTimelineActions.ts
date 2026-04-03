import type { LuneConstruction, Ration } from "../types";
import {
  createLune,
  defaultRation,
  defaultWeatherCoefficients,
  normalizeWeatherCoefficient,
  normalizeWeatherCoefficients,
  syncConstructionStatusesWithLunes,
} from "../utils/stateUtils";

const sanitizeConstructions = (constructions = [], lunes = []) =>
  syncConstructionStatusesWithLunes(constructions, lunes);

export const useTimelineActions = ({
  persos,
  constructions,
  lunes,
  setConstructions,
  setLunes,
  setOpenOverrides,
  saveLuneEntity,
  deleteLuneEntity,
  saveConstructionsEntity,
}) => {
  const addLune = () => {
    const nextLuneId =
      lunes.reduce(
        (maxLuneId, lune) => Math.max(maxLuneId, Number(lune.id) || 0),
        0,
      ) + 1;
    const inheritedPlacedConstructionIds = Array.isArray(
      lunes[lunes.length - 1]?.placedConstructionIds,
    )
      ? lunes[lunes.length - 1].placedConstructionIds
          .map(String)
          .filter((id) =>
            (constructions || []).some(
              (item) => item.id === id && item.status !== "done",
            ),
          )
      : [];
    const newLune = {
      ...createLune(persos, nextLuneId),
      placedConstructionIds: inheritedPlacedConstructionIds,
    };
    setLunes((previous) => [...previous, newLune]);
    saveLuneEntity(newLune);
  };

  const removeLune = (index) => {
    if (index === 0) {
      return;
    }

    const luneToRemove = lunes[index];
    if (!luneToRemove) return;

    setLunes((previous) => previous.filter((_, idx) => idx !== index));
    deleteLuneEntity(luneToRemove.id);
  };

  const updateRation = (luneIndex, persoId, field, value) => {
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

      if (
        field === "tache" &&
        value === "construire" &&
        !nextRation.constructionId
      ) {
        nextRation.constructionId = constructions?.[0]?.id ?? null;
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
    const existingConstructions = Array.isArray(constructions)
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
      [
        ...existingConstructions,
        {
          id: `construction-${nextConstructionId}`,
          name: `Chantier ${nextConstructionId}`,
          resourceCode: "mat",
          resourceCost: 1,
          buildersRequired: 1,
          rewardType: "mat",
        },
      ],
      lunes,
    );

    setConstructions(nextConstructions);
    saveConstructionsEntity(nextConstructions);
  };

  const updateConstruction = (constructionId, field, rawValue) => {
    if (field === "status") {
      const nextStatus =
        rawValue === "done" || rawValue === "in-progress" ? rawValue : "todo";
      const nextLunes = lunes.map((lune, idx) => {
        const currentIds = Array.isArray(lune.placedConstructionIds)
          ? lune.placedConstructionIds.map(String)
          : [];

        if (nextStatus === "in-progress" && idx >= 0) {
          return {
            ...lune,
            placedConstructionIds: Array.from(
              new Set([...currentIds, String(constructionId)]),
            ),
          };
        }

        if (nextStatus === "todo" || nextStatus === "done") {
          return {
            ...lune,
            placedConstructionIds: currentIds.filter(
              (id) => id !== String(constructionId),
            ),
          };
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
    );

    setConstructions(nextConstructions);
    saveConstructionsEntity(nextConstructions);
  };

  const removeConstruction = (constructionId) => {
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

      return {
        ...lune,
        rations: nextRations,
        placedConstructionIds: Array.isArray(lune.placedConstructionIds)
          ? lune.placedConstructionIds.filter((id) => id !== constructionId)
          : [],
      };
    });

    setConstructions(nextConstructions);
    setLunes(nextLunes);
    saveConstructionsEntity(nextConstructions);
    nextLunes.forEach((lune) => saveLuneEntity(lune));
  };

  const toggleConstructionPlacement = (luneIndex, constructionId, isPlaced) => {
    const normalizedConstructionId = String(constructionId);
    const nextLunes = lunes.map((lune, idx) => {
      if (idx < luneIndex) return lune;

      const currentIds = Array.isArray(lune.placedConstructionIds)
        ? lune.placedConstructionIds.map(String)
        : [];
      const nextIds = isPlaced
        ? Array.from(new Set([...currentIds, normalizedConstructionId]))
        : currentIds.filter((id) => id !== normalizedConstructionId);

      return {
        ...lune,
        placedConstructionIds: nextIds,
      };
    });

    const nextConstructions = sanitizeConstructions(
      constructions || [],
      nextLunes,
    );

    setLunes(nextLunes);
    setConstructions(nextConstructions);
    saveConstructionsEntity(nextConstructions);
    nextLunes.slice(luneIndex).forEach((lune) => saveLuneEntity(lune));
  };

  const updateLuneGlobal = (luneIndex, field, rawValue) => {
    const nextLunes = lunes.map((lune, idx) => {
      if (idx !== luneIndex) return lune;

      if (field === "meteo") {
        return {
          ...lune,
          meteo: normalizeWeatherCoefficients(rawValue),
        };
      }

      if (field.startsWith("meteo.")) {
        const resourceKey = field.replace("meteo.", "");
        return {
          ...lune,
          meteo: {
            ...defaultWeatherCoefficients,
            ...normalizeWeatherCoefficients(lune.meteo),
            [resourceKey]: normalizeWeatherCoefficient(rawValue),
          },
        };
      }

      const value = Math.max(0, Number(rawValue) || 0);
      return { ...lune, [field]: value };
    });

    setLunes(nextLunes);
    if (nextLunes[luneIndex]) {
      saveLuneEntity(nextLunes[luneIndex]);
    }
  };

  const toggleOverrideMenu = (luneIndex, persoId) => {
    const key = `${luneIndex}-${persoId}`;
    setOpenOverrides((previous) => ({ ...previous, [key]: !previous[key] }));
  };

  const setOverride = (luneIndex, persoId, field, rawValue) => {
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
              : field === "pv"
                ? Math.max(0, Number.isFinite(numericValue) ? numericValue : 0)
                : numericValue,
        };
      }

      return { ...lune, overrides: existing };
    });

    setLunes(nextLunes);
    if (nextLunes[luneIndex]) {
      saveLuneEntity(nextLunes[luneIndex]);
    }
  };

  const clearOverrides = (luneIndex, persoId) => {
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
    updateLuneGlobal,
    toggleOverrideMenu,
    setOverride,
    clearOverrides,
  };
};
