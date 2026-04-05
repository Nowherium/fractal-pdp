import type { CityMultipliers, Terrain } from "../types";

export type TerrainEditableField = "name" | keyof CityMultipliers;

const defaultTerrainMultipliers: CityMultipliers = {
  eau: 1,
  nrt: 1,
  med: 1,
  mat: 1,
};

const normalizeTerrainMultiplier = (value: unknown): number => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? Math.max(0, numericValue) : 1;
};

const normalizeOptionalId = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
};

const multiplyMultiplier = (baseValue: number, terrainValue: number) =>
  Number((baseValue * terrainValue).toFixed(4));

export const createDefaultTerrain = (terrains: Terrain[] = []): Terrain => {
  const nextId =
    terrains.reduce(
      (maxTerrainId, terrain) =>
        Math.max(maxTerrainId, Number(terrain.id) || 0),
      0,
    ) + 1;

  return {
    id: nextId,
    name: `Terrain ${nextId}`,
    ...defaultTerrainMultipliers,
  };
};

export const normalizeTerrains = (
  terrains: Array<Partial<Terrain>> = [],
): Terrain[] =>
  (Array.isArray(terrains) ? terrains : []).map((terrain, index) => ({
    id: Number.isFinite(Number(terrain.id)) ? Number(terrain.id) : index + 1,
    name:
      String(terrain.name ?? `Terrain ${index + 1}`).trim() ||
      `Terrain ${index + 1}`,
    eau: normalizeTerrainMultiplier(terrain.eau),
    nrt: normalizeTerrainMultiplier(terrain.nrt),
    med: normalizeTerrainMultiplier(terrain.med),
    mat: normalizeTerrainMultiplier(terrain.mat),
  }));

export const normalizeCurrentTerrainId = (
  value: unknown,
  terrains: Terrain[] = [],
): number | null => {
  const normalizedId = normalizeOptionalId(value);

  return normalizedId !== null &&
    terrains.some((terrain) => terrain.id === normalizedId)
    ? normalizedId
    : null;
};

export const combineCityAndTerrainMultipliers = (
  cityMultipliers: CityMultipliers,
  terrain?: Partial<CityMultipliers> | null,
): CityMultipliers => ({
  eau: multiplyMultiplier(
    normalizeTerrainMultiplier(cityMultipliers.eau),
    normalizeTerrainMultiplier(terrain?.eau),
  ),
  nrt: multiplyMultiplier(
    normalizeTerrainMultiplier(cityMultipliers.nrt),
    normalizeTerrainMultiplier(terrain?.nrt),
  ),
  med: multiplyMultiplier(
    normalizeTerrainMultiplier(cityMultipliers.med),
    normalizeTerrainMultiplier(terrain?.med),
  ),
  mat: multiplyMultiplier(
    normalizeTerrainMultiplier(cityMultipliers.mat),
    normalizeTerrainMultiplier(terrain?.mat),
  ),
});

export const formatTerrainOptionLabel = (terrain: Terrain): string =>
  `${terrain.name} · NRT x${terrain.nrt.toFixed(2)} · EAU x${terrain.eau.toFixed(2)} · MED x${terrain.med.toFixed(2)} · MAT x${terrain.mat.toFixed(2)}`;
