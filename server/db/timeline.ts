import type { PoolClient } from "pg";
import {
  buildLunes,
  normalizeBoolean,
  normalizeConstructionPlacements,
  normalizeWeatherCoefficients,
  pool,
} from "./shared";

type LuneInput = {
  id?: unknown;
  meteo?: unknown;
  constructionPlacements?: unknown;
  placedConstructionIds?: unknown;
  rations?: unknown;
  overrides?: unknown;
} & Record<string, unknown>;
type RationInput = {
  eau?: unknown;
  nrt?: unknown;
  med?: unknown;
  tache?: unknown;
  drogue?: unknown;
  constructionId?: unknown;
};

const asRationRecord = (value: unknown): Record<string, RationInput> =>
  value && typeof value === "object"
    ? (value as Record<string, RationInput>)
    : {};

const asOverrideRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};

const normalizeLuneMeteoInput = (value: unknown) =>
  normalizeWeatherCoefficients(
    typeof value === "number" || typeof value === "string"
      ? value
      : value && typeof value === "object"
        ? (value as Record<string, unknown>)
        : {},
  );

const normalizeLuneConstructionPayload = (lune: LuneInput, luneId: number) => {
  if (Array.isArray(lune.constructionPlacements)) {
    return normalizeConstructionPlacements(lune.constructionPlacements, luneId);
  }

  if (Array.isArray(lune.placedConstructionIds)) {
    return normalizeConstructionPlacements(lune.placedConstructionIds, luneId);
  }

  return [];
};

const buildLunesWritePayload = (lunes: LuneInput[] = []) => {
  const lunesById = new Map<
    number,
    {
      id: number;
      meteo_eau: number;
      meteo_nrt: number;
      meteo_med: number;
      meteo_mat: number;
      constructions: ReturnType<typeof normalizeConstructionPlacements>;
    }
  >();
  const rationsPayload: Array<{
    lune_id: number;
    perso_id: number;
    eau: boolean;
    nrt: boolean;
    med: boolean;
    tache: string;
    drogue: string | null;
    construction_id: string | null;
  }> = [];
  const overridesPayload: Array<{
    lune_id: number;
    perso_id: number;
    data: Record<string, unknown>;
  }> = [];

  for (const lune of Array.isArray(lunes) ? lunes : []) {
    const luneId = Number(lune.id);
    if (!Number.isFinite(luneId)) continue;

    const meteo = normalizeLuneMeteoInput(lune.meteo);
    lunesById.set(luneId, {
      id: luneId,
      meteo_eau: meteo.eau,
      meteo_nrt: meteo.nrt,
      meteo_med: meteo.med,
      meteo_mat: meteo.mat,
      constructions: normalizeLuneConstructionPayload(lune, luneId),
    });

    const rations = asRationRecord(lune.rations);
    for (const [persoIdRaw, ration] of Object.entries(rations)) {
      const persoId = Number(persoIdRaw);
      if (!Number.isFinite(persoId)) continue;
      rationsPayload.push({
        lune_id: luneId,
        perso_id: persoId,
        eau: normalizeBoolean(ration?.eau, true),
        nrt: normalizeBoolean(ration?.nrt, true),
        med: normalizeBoolean(ration?.med, true),
        tache: String(ration?.tache ?? ""),
        drogue: ration?.drogue ? String(ration.drogue) : null,
        construction_id: ration?.constructionId
          ? String(ration.constructionId)
          : null,
      });
    }

    const overrides = asOverrideRecord(lune.overrides);
    for (const [persoIdRaw, data] of Object.entries(overrides)) {
      const persoId = Number(persoIdRaw);
      if (!Number.isFinite(persoId)) continue;
      overridesPayload.push({
        lune_id: luneId,
        perso_id: persoId,
        data:
          data && typeof data === "object"
            ? (data as Record<string, unknown>)
            : {},
      });
    }
  }

  return {
    lunesPayload: Array.from(lunesById.values()),
    rationsPayload,
    overridesPayload,
  };
};

const getLuneById = async (client: PoolClient, luneId: number) => {
  const { rows: luneRows } = await client.query(
    "SELECT id, meteo, meteo_eau, meteo_nrt, meteo_med, meteo_mat, constructions FROM lunes WHERE id = $1 LIMIT 1",
    [luneId],
  );

  if (luneRows.length === 0) {
    return null;
  }

  const { rows: rationRows } = await client.query(
    "SELECT lune_id, perso_id, eau, nrt, med, tache, drogue, construction_id FROM rations WHERE lune_id = $1",
    [luneId],
  );
  const { rows: overrideRows } = await client.query(
    "SELECT lune_id, perso_id, data FROM overrides WHERE lune_id = $1",
    [luneId],
  );

  return buildLunes(luneRows, rationRows, overrideRows)[0] || null;
};

const upsertLune = async (lune: LuneInput) => {
  const luneId = Number(lune?.id);
  if (!Number.isFinite(luneId)) {
    throw new Error("Identifiant de lune invalide.");
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const existingLune = await getLuneById(client, luneId);
    const mergedLune = {
      ...(existingLune || {}),
      ...(lune || {}),
      id: luneId,
    };

    const defaultMeteo = normalizeWeatherCoefficients(1);
    const meteo = normalizeLuneMeteoInput(
      mergedLune["meteo"] ?? existingLune?.meteo ?? defaultMeteo,
    );

    const { lunesPayload, rationsPayload, overridesPayload } =
      buildLunesWritePayload([mergedLune]);

    await client.query(
      `INSERT INTO lunes (id, meteo_eau, meteo_nrt, meteo_med, meteo_mat, constructions)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id)
       DO UPDATE SET
         meteo_eau = EXCLUDED.meteo_eau,
         meteo_nrt = EXCLUDED.meteo_nrt,
         meteo_med = EXCLUDED.meteo_med,
         meteo_mat = EXCLUDED.meteo_mat,
         constructions = EXCLUDED.constructions`,
      [
        luneId,
        meteo.eau,
        meteo.nrt,
        meteo.med,
        meteo.mat,
        JSON.stringify(lunesPayload[0]?.constructions || []),
      ],
    );

    await client.query("DELETE FROM rations WHERE lune_id = $1", [luneId]);
    if (rationsPayload.length > 0) {
      await client.query(
        `INSERT INTO rations (lune_id, perso_id, eau, nrt, med, tache, drogue, construction_id)
         SELECT lune_id, perso_id, eau, nrt, med, tache, drogue, construction_id
         FROM json_to_recordset($1::json) AS incoming(
           lune_id bigint,
           perso_id integer,
           eau boolean,
           nrt boolean,
           med boolean,
           tache text,
           drogue text,
           construction_id text
         )`,
        [JSON.stringify(rationsPayload)],
      );
    }

    await client.query("DELETE FROM overrides WHERE lune_id = $1", [luneId]);
    if (overridesPayload.length > 0) {
      await client.query(
        `INSERT INTO overrides (lune_id, perso_id, data)
         SELECT lune_id, perso_id, data
         FROM json_to_recordset($1::json) AS incoming(
           lune_id bigint,
           perso_id integer,
           data jsonb
         )`,
        [JSON.stringify(overridesPayload)],
      );
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

const deleteLune = async (luneId: number) => {
  await pool.query("DELETE FROM lunes WHERE id = $1", [luneId]);
};

export { upsertLune, deleteLune };
