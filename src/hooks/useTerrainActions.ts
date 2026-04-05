import type { Dispatch, SetStateAction } from "react";

import type { PersistOptions, Terrain } from "../types";
import {
  createDefaultTerrain,
  type TerrainEditableField,
} from "../utils/terrainUtils";

interface UseTerrainActionsParams {
  terrains: Terrain[];
  currentTerrainId: number | null;
  setTerrains: Dispatch<SetStateAction<Terrain[]>>;
  setCurrentTerrainId: Dispatch<SetStateAction<number | null>>;
  saveTerrainsEntity: (terrains: Terrain[]) => void;
  saveCurrentTerrainEntity: (terrainId: number | null) => void;
}

export const useTerrainActions = ({
  terrains,
  currentTerrainId,
  setTerrains,
  setCurrentTerrainId,
  saveTerrainsEntity,
  saveCurrentTerrainEntity,
}: UseTerrainActionsParams) => {
  const addTerrain = () => {
    const newTerrain = createDefaultTerrain(terrains);
    const nextTerrains = [...terrains, newTerrain];

    setTerrains(nextTerrains);
    saveTerrainsEntity(nextTerrains);
  };

  const updateTerrain = (
    index: number,
    field: TerrainEditableField,
    rawValue: string | number,
    { persist = true }: PersistOptions = {},
  ) => {
    const currentTerrain = terrains[index];
    if (!currentTerrain) {
      return;
    }

    const nextValue =
      field === "name"
        ? String(rawValue ?? "")
        : (() => {
            const numericValue = Number(rawValue);
            return Number.isFinite(numericValue)
              ? Math.max(0, numericValue)
              : 1;
          })();

    const nextTerrain = {
      ...currentTerrain,
      [field]: nextValue,
    };
    const nextTerrains = terrains.map((terrain, currentIndex) =>
      currentIndex !== index ? terrain : nextTerrain,
    );

    setTerrains(nextTerrains);
    if (persist) {
      saveTerrainsEntity(nextTerrains);
    }
  };

  const removeTerrain = (index: number) => {
    const terrainToRemove = terrains[index];
    if (!terrainToRemove) {
      return;
    }

    const nextTerrains = terrains.filter(
      (terrain) => terrain.id !== terrainToRemove.id,
    );

    setTerrains(nextTerrains);
    saveTerrainsEntity(nextTerrains);

    if (currentTerrainId === terrainToRemove.id) {
      setCurrentTerrainId(null);
      saveCurrentTerrainEntity(null);
    }
  };

  return {
    addTerrain,
    updateTerrain,
    removeTerrain,
  };
};
