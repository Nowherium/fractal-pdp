import type { PoolClient } from "pg";
import {
  buildLunes,
  normalizeBoolean,
  normalizeConstructionPlacements,
  normalizeWeatherCoefficients,
  pool,
} from "./shared";

type LuneInput = Record<string, unknown>;
type RationInput = {
  eau?: unknown;
  nrt?: unknown;
  med?: unknown;
  tache?: unknown;
  drogue?: unknown;
  constructionId?: unknown;
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

    const meteoSource = lune.meteo;
    const meteo = normalizeWeatherCoefficients(
      typeof meteoSource === "number" || typeof meteoSource === "string"
        ? meteoSource
        : meteoSource && typeof meteoSource === "object"
          ? (meteoSource as Record<string, unknown>)
          : {},
    );
    lunesById.set(luneId, {
      id: luneId,
      meteo_eau: meteo.eau,
      meteo_nrt: meteo.nrt,
      meteo_med: meteo.med,
      meteo_mat: meteo.mat,
      constructions: Array.isArray(lune.constructionPlacements)
        ? normalizeConstructionPlacements(lune.constructionPlacements, luneId)
        : Array.isArray(lune.placedConstructionIds)
          ? normalizeConstructionPlacements(lune.placedConstructionIds, luneId)
          : [],
    });

    const rations =
      lune.rations && typeof lune.rations === "object"
        ? (lune.rations as Record<string, RationInput>)
        : {};
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

    const overrides =
      lune.overrides && typeof lune.overrides === "object"
        ? (lune.overrides as Record<string, unknown>)
        : {};
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
    const meteo = normalizeWeatherCoefficients(
      mergedLune.meteo ?? existingLune?.meteo ?? defaultMeteo,
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
