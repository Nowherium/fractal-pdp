import { createLune, defaultRation } from "../utils/stateUtils";

export const useTimelineActions = ({
  persos,
  lunes,
  setLunes,
  setOpenOverrides,
  saveLuneEntity,
  deleteLuneEntity,
}) => {
  const addLune = () => {
    const newLune = createLune(persos);
    setLunes((previous) => [...previous, newLune]);
    saveLuneEntity(newLune);
  };

  const removeLune = (index) => {
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
        [field]: field === "tache" ? value : Boolean(value),
      };
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

  const updateLuneGlobal = (luneIndex, field, rawValue) => {
    const value = Number(rawValue) || 0;
    const nextLunes = lunes.map((lune, idx) =>
      idx !== luneIndex ? lune : { ...lune, [field]: value },
    );

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
            field === "pv"
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
    updateLuneGlobal,
    toggleOverrideMenu,
    setOverride,
    clearOverrides,
  };
};
