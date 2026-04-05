import {
  defaultCity,
  defaultCityMultipliers,
  defaultCurrentLune,
  buildStocksPayload,
  normalizeCurrentLuneValue,
  normalizeMultiplier,
  pool,
} from "./shared";

type CityMultiplierInput = {
  eau?: unknown;
  nrt?: unknown;
  med?: unknown;
  mat?: unknown;
} & Record<string, unknown>;

type TerrainInput = {
  id?: unknown;
  name?: unknown;
  eau?: unknown;
  nrt?: unknown;
  med?: unknown;
  mat?: unknown;
} & Record<string, unknown>;

const normalizeTerrainPayload = (terrains: unknown): TerrainInput[] =>
  (Array.isArray(terrains) ? terrains : []).map((terrain, index) => {
    const current =
      terrain && typeof terrain === "object"
        ? (terrain as TerrainInput)
        : ({} as TerrainInput);
    const id = Number(current.id);

    return {
      id: Number.isFinite(id) ? id : index + 1,
      name:
        String(current.name ?? `Terrain ${index + 1}`).trim() ||
        `Terrain ${index + 1}`,
      eau: normalizeMultiplier(current.eau, defaultCityMultipliers.eau),
      nrt: normalizeMultiplier(current.nrt, defaultCityMultipliers.nrt),
      med: normalizeMultiplier(current.med, defaultCityMultipliers.med),
      mat: normalizeMultiplier(current.mat, defaultCityMultipliers.mat),
    };
  });

const normalizeCurrentTerrainId = (
  currentTerrainId: unknown,
): number | null => {
  if (
    currentTerrainId === null ||
    currentTerrainId === undefined ||
    currentTerrainId === ""
  ) {
    return null;
  }

  const numericValue = Number(currentTerrainId);
  return Number.isFinite(numericValue) ? numericValue : null;
};

const updateStocks = async (stocks: Record<string, unknown>) => {
  const payload = buildStocksPayload(stocks);

  if (payload.length === 0) {
    return;
  }

  await pool.query(
    `INSERT INTO city_resources (city_id, resource_id, quantity)
     SELECT $1, r.id, incoming.quantity
     FROM json_to_recordset($2::json) AS incoming(code text, quantity numeric)
     JOIN resources AS r ON r.code = incoming.code
     ON CONFLICT (city_id, resource_id)
     DO UPDATE SET quantity = EXCLUDED.quantity`,
    [defaultCity.id, JSON.stringify(payload)],
  );
};

const updateStock = async (code: string, quantity: string | number) => {
  await updateStocks({ [code]: quantity });
};

const updateCityMultipliers = async (
  cityMultipliers: CityMultiplierInput = {},
) => {
  const payload = {
    eau: normalizeMultiplier(cityMultipliers.eau, defaultCityMultipliers.eau),
    nrt: normalizeMultiplier(cityMultipliers.nrt, defaultCityMultipliers.nrt),
    med: normalizeMultiplier(cityMultipliers.med, defaultCityMultipliers.med),
    mat: normalizeMultiplier(cityMultipliers.mat, defaultCityMultipliers.mat),
  };

  await pool.query(
    `INSERT INTO cities (id, name, mult_eau, mult_nrt, mult_med, mult_mat)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (id)
     DO UPDATE SET
       name = EXCLUDED.name,
       mult_eau = EXCLUDED.mult_eau,
       mult_nrt = EXCLUDED.mult_nrt,
       mult_med = EXCLUDED.mult_med,
       mult_mat = EXCLUDED.mult_mat`,
    [
      defaultCity.id,
      defaultCity.name,
      payload.eau,
      payload.nrt,
      payload.med,
      payload.mat,
    ],
  );
};

const updateTerrains = async (terrains: unknown = []) => {
  const payload = normalizeTerrainPayload(terrains);

  await pool.query(
    `INSERT INTO cities (id, name, terrains)
     VALUES ($1, $2, $3::jsonb)
     ON CONFLICT (id)
     DO UPDATE SET
       name = EXCLUDED.name,
       terrains = EXCLUDED.terrains`,
    [defaultCity.id, defaultCity.name, JSON.stringify(payload)],
  );
};

const updateCurrentTerrainId = async (currentTerrainId: unknown) => {
  const payload = normalizeCurrentTerrainId(currentTerrainId);

  await pool.query(
    `INSERT INTO cities (id, name, current_terrain_id)
     VALUES ($1, $2, $3)
     ON CONFLICT (id)
     DO UPDATE SET
       name = EXCLUDED.name,
       current_terrain_id = EXCLUDED.current_terrain_id`,
    [defaultCity.id, defaultCity.name, payload],
  );
};

const updateCurrentLune = async (currentLune: string | number) => {
  const payload = normalizeCurrentLuneValue(currentLune, defaultCurrentLune);

  await pool.query(
    `INSERT INTO cities (id, name, current_lune)
     VALUES ($1, $2, $3)
     ON CONFLICT (id)
     DO UPDATE SET
       name = EXCLUDED.name,
       current_lune = EXCLUDED.current_lune`,
    [defaultCity.id, defaultCity.name, payload],
  );
};

const updateConstructions = async (constructions = []) => {
  const payload = Array.isArray(constructions) ? constructions : [];

  await pool.query(
    `INSERT INTO cities (id, name, constructions)
     VALUES ($1, $2, $3::jsonb)
     ON CONFLICT (id)
     DO UPDATE SET
       name = EXCLUDED.name,
       constructions = EXCLUDED.constructions`,
    [defaultCity.id, defaultCity.name, JSON.stringify(payload)],
  );
};

export {
  updateStock,
  updateCityMultipliers,
  updateTerrains,
  updateCurrentTerrainId,
  updateCurrentLune,
  updateConstructions,
};
