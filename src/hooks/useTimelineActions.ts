import type { Ration } from "../types";
import {
  createLune,
  defaultRation,
  defaultWeatherCoefficients,
  normalizeWeatherCoefficient,
  normalizeWeatherCoefficients,
} from "../utils/stateUtils";

export const useTimelineActions = ({
  persos,
  lunes,
  setLunes,
  setOpenOverrides,
  saveLuneEntity,
  deleteLuneEntity,
}) => {
  const addLune = () => {
    const nextLuneId =
      lunes.reduce(
        (maxLuneId, lune) => Math.max(maxLuneId, Number(lune.id) || 0),
        0,
      ) + 1;
    const newLune = createLune(persos, nextLuneId);
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
        nextRation.constructionId = lune.constructions?.[0]?.id ?? null;
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

  const addConstruction = (luneIndex) => {
    const nextLunes = lunes.map((lune, idx) => {
      if (idx !== luneIndex) return lune;

      const existingConstructions = Array.isArray(lune.constructions)
        ? lune.constructions
        : [];
      const nextConstructionId =
        existingConstructions.reduce((maxId, construction) => {
          const numericId = Number(
            String(construction.id || "").replace(/[^0-9]/g, ""),
          );
          return Number.isFinite(numericId)
            ? Math.max(maxId, numericId)
            : maxId;
        }, 0) + 1;

      return {
        ...lune,
        constructions: [
          ...existingConstructions,
          {
            id: `lune-${Number(lune.id) || luneIndex + 1}-construction-${nextConstructionId}`,
            name: `Chantier ${nextConstructionId}`,
            resourceCode: "mat",
            resourceCost: 1,
            buildersRequired: 1,
            rewardType: "mat",
          },
        ],
      };
    });

    setLunes(nextLunes);
    if (nextLunes[luneIndex]) {
      saveLuneEntity(nextLunes[luneIndex]);
    }
  };

  const updateConstruction = (luneIndex, constructionId, field, rawValue) => {
    const nextLunes = lunes.map((lune, idx) => {
      if (idx !== luneIndex) return lune;

      return {
        ...lune,
        constructions: (lune.constructions || []).map((construction) =>
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
      };
    });

    setLunes(nextLunes);
    if (nextLunes[luneIndex]) {
      saveLuneEntity(nextLunes[luneIndex]);
    }
  };

  const removeConstruction = (luneIndex, constructionId) => {
    const nextLunes = lunes.map((lune, idx) => {
      if (idx !== luneIndex) return lune;

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
        constructions: (lune.constructions || []).filter(
          (construction) => construction.id !== constructionId,
        ),
        rations: nextRations,
      };
    });

    setLunes(nextLunes);
    if (nextLunes[luneIndex]) {
      saveLuneEntity(nextLunes[luneIndex]);
    }
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
    updateLuneGlobal,
    toggleOverrideMenu,
    setOverride,
    clearOverrides,
  };
};
