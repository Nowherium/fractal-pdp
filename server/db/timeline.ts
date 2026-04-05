import type { PoolClient } from "pg";
import {
  buildLunes,
  normalizeBoolean,
  normalizeConstructionPlacements,
  normalizeLuneToolAssignments,
  normalizeWeatherCoefficients,
  pool,
} from "./shared";

type LuneInput = {
  id?: unknown;
  meteo?: unknown;
  constructionPlacements?: unknown;
  placedConstructionIds?: unknown;
  toolAssignments?: unknown;
  rations?: unknown;
  overrides?: unknown;
  frozenTimeline?: unknown;
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
  const placements = Array.isArray(lune.constructionPlacements)
    ? normalizeConstructionPlacements(lune.constructionPlacements, luneId)
    : Array.isArray(lune.placedConstructionIds)
      ? normalizeConstructionPlacements(lune.placedConstructionIds, luneId)
      : [];
  const frozenTimeline =
    lune.frozenTimeline && typeof lune.frozenTimeline === "object"
      ? (lune.frozenTimeline as Record<string, unknown>)
      : null;

  return frozenTimeline ? { placements, frozenTimeline } : placements;
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
      constructions: unknown;
      tool_assignments: Record<string, number | null>;
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
      tool_assignments: normalizeLuneToolAssignments(lune.toolAssignments),
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

const getExistingPersoIds = async (
  client: PoolClient,
  persoIds: number[] = [],
): Promise<Set<number>> => {
  if (persoIds.length === 0) {
    return new Set();
  }

  const { rows } = await client.query(
    `SELECT id
     FROM persos
     WHERE id = ANY($1::int[])`,
    [persoIds],
  );

  return new Set(
    rows.map((row) => Number(row.id)).filter((id) => Number.isFinite(id)),
  );
};

const getLuneById = async (client: PoolClient, luneId: number) => {
  const { rows: luneRows } = await client.query(
    "SELECT id, meteo, meteo_eau, meteo_nrt, meteo_med, meteo_mat, constructions, tool_assignments FROM lunes WHERE id = $1 LIMIT 1",
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
    const existingPersoIds = await getExistingPersoIds(client, [
      ...new Set([
        ...rationsPayload.map((ration) => ration.perso_id),
        ...overridesPayload.map((override) => override.perso_id),
      ]),
    ]);
    const filteredRationsPayload = rationsPayload.filter((ration) =>
      existingPersoIds.has(ration.perso_id),
    );
    const filteredOverridesPayload = overridesPayload.filter((override) =>
      existingPersoIds.has(override.perso_id),
    );

    await client.query(
      `INSERT INTO lunes (
         id,
         meteo_eau,
         meteo_nrt,
         meteo_med,
         meteo_mat,
         constructions,
         tool_assignments
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id)
       DO UPDATE SET
         meteo_eau = EXCLUDED.meteo_eau,
         meteo_nrt = EXCLUDED.meteo_nrt,
         meteo_med = EXCLUDED.meteo_med,
         meteo_mat = EXCLUDED.meteo_mat,
         constructions = EXCLUDED.constructions,
         tool_assignments = EXCLUDED.tool_assignments`,
      [
        luneId,
        meteo.eau,
        meteo.nrt,
        meteo.med,
        meteo.mat,
        JSON.stringify(lunesPayload[0]?.constructions || []),
        JSON.stringify(lunesPayload[0]?.tool_assignments || {}),
      ],
    );

    await client.query("DELETE FROM rations WHERE lune_id = $1", [luneId]);
    if (filteredRationsPayload.length > 0) {
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
        [JSON.stringify(filteredRationsPayload)],
      );
    }

    await client.query("DELETE FROM overrides WHERE lune_id = $1", [luneId]);
    if (filteredOverridesPayload.length > 0) {
      await client.query(
        `INSERT INTO overrides (lune_id, perso_id, data)
         SELECT lune_id, perso_id, data
         FROM json_to_recordset($1::json) AS incoming(
           lune_id bigint,
           perso_id integer,
           data jsonb
         )`,
        [JSON.stringify(filteredOverridesPayload)],
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
