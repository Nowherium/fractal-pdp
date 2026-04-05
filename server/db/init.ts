import { readFile } from "node:fs/promises";
import {
  defaultCity,
  defaultGroup,
  defaultPersos,
  defaultStocks,
  pool,
  stockFields,
  withTransaction,
} from "./shared";

const SCHEMA_SQL_URL = new URL("../sql/schema.sql", import.meta.url);

const ensureCoreSchema = async (): Promise<void> => {
  const schemaSql = await readFile(SCHEMA_SQL_URL, "utf8");
  await withTransaction(async (client) => {
    await client.query(schemaSql);
  });
};

const normalizeTimelineData = async (): Promise<void> => {
  await pool.query(
    `UPDATE lunes
     SET meteo = LEAST(1, GREATEST(COALESCE(meteo, 1), 0)),
         meteo_eau = LEAST(1, GREATEST(COALESCE(meteo_eau, meteo, 1), 0)),
         meteo_nrt = LEAST(1, GREATEST(COALESCE(meteo_nrt, meteo, 1), 0)),
         meteo_med = LEAST(1, GREATEST(COALESCE(meteo_med, meteo, 1), 0)),
         meteo_mat = LEAST(1, GREATEST(COALESCE(meteo_mat, meteo, 1), 0)),
         constructions = COALESCE(constructions, '[]'::jsonb)`,
  );

  await pool.query(
    `UPDATE cities
     SET mult_eau = COALESCE(mult_eau, 1),
         mult_nrt = COALESCE(mult_nrt, 1),
         mult_med = COALESCE(mult_med, 1),
         mult_mat = COALESCE(mult_mat, 1),
         current_lune = GREATEST(COALESCE(current_lune, 1), 1),
         constructions = COALESCE(constructions, '[]'::jsonb)`,
  );
};

const normalizePersoAndGroupData = async (): Promise<void> => {
  await pool.query(
    `UPDATE persos
     SET pvmax = GREATEST(COALESCE(pvmax, 0), 0),
         pv = GREATEST(COALESCE(pv, pvmax, 0), 0),
         poidsmax = GREATEST(COALESCE(poidsmax, 20), 0),
         present = COALESCE(present, true)`,
  );
};

const ensureBaseResources = async (): Promise<void> => {
  await Promise.all(
    stockFields.map((field) =>
      pool.query(
        "INSERT INTO resources (code, name) VALUES ($1, $2) ON CONFLICT (code) DO NOTHING",
        [field, field.toUpperCase()],
      ),
    ),
  );
};

const normalizeEquipmentData = async (): Promise<void> => {
  await pool.query(
    `UPDATE armes
     SET quantity = GREATEST(COALESCE(quantity, 1), 0)`,
  );
  await pool.query(
    `UPDATE armes AS a
     SET quantity = GREATEST(a.quantity, usage.assigned_count)
     FROM (
       SELECT arme_id, COUNT(*)::int AS assigned_count
       FROM perso_armes
       GROUP BY arme_id
     ) AS usage
     WHERE a.id = usage.arme_id`,
  );

  await pool.query(
    `UPDATE outils
     SET specialite = LOWER(COALESCE(specialite, 'eau')),
         bonus = CASE
           WHEN bonus IS NULL OR bonus = 0 THEN 1
           ELSE GREATEST(bonus, 0)
         END,
         pv = GREATEST(COALESCE(pv, 0), 0),
         pvmax = GREATEST(COALESCE(pvmax, 0), 0),
         poids = GREATEST(COALESCE(poids, 0), 0),
         quantity = GREATEST(COALESCE(quantity, 1), 0)`,
  );
  await pool.query(
    `UPDATE outils AS o
     SET quantity = GREATEST(o.quantity, usage.assigned_count)
     FROM (
       SELECT outil_id, COUNT(*)::int AS assigned_count
       FROM perso_outils
       GROUP BY outil_id
     ) AS usage
     WHERE o.id = usage.outil_id`,
  );

  await pool.query(
    `UPDATE sacs
     SET pv = GREATEST(COALESCE(pv, 0), 0),
         pvmax = GREATEST(COALESCE(pvmax, 0), 0),
         poids = GREATEST(COALESCE(poids, 0), 0),
         capacite = GREATEST(COALESCE(capacite, 0), 0),
         quantity = GREATEST(COALESCE(quantity, 1), 0)`,
  );
  await pool.query(
    `UPDATE sacs AS s
     SET quantity = GREATEST(s.quantity, usage.assigned_count)
     FROM (
       SELECT sac_id, COUNT(*)::int AS assigned_count
       FROM perso_sacs
       GROUP BY sac_id
     ) AS usage
     WHERE s.id = usage.sac_id`,
  );
};

const ensureDefaultGameState = async (): Promise<void> => {
  const { rows: groupRows } = await pool.query(
    "SELECT group_id FROM groups WHERE group_id = $1 LIMIT 1",
    [defaultGroup.id],
  );
  if (groupRows.length === 0) {
    await pool.query("INSERT INTO groups (group_id, name) VALUES ($1, $2)", [
      defaultGroup.id,
      defaultGroup.name,
    ]);
  }

  const { rows: cityRows } = await pool.query(
    "SELECT id FROM cities WHERE id = $1 LIMIT 1",
    [defaultCity.id],
  );
  if (cityRows.length === 0) {
    await pool.query("INSERT INTO cities (id, name) VALUES ($1, $2)", [
      defaultCity.id,
      defaultCity.name,
    ]);
  }

  const { rows: persoRowsExisting } = await pool.query(
    "SELECT id FROM persos LIMIT 1",
  );
  if (persoRowsExisting.length === 0) {
    const defaultLuneId = 1;
    const defaultPerso = defaultPersos[0];

    if (!defaultPerso) {
      return;
    }

    await pool.query(
      "INSERT INTO persos (id, nom, present, pvmax, pv, poidsmax, capEau, capNrt, capMed, capMat, capart, cmd, combat, group_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)",
      [
        defaultPerso.id,
        defaultPerso.nom,
        defaultPerso.present,
        defaultPerso.pvmax,
        defaultPerso.pv,
        defaultPerso.poidsMax,
        defaultPerso.capEau,
        defaultPerso.capNrt,
        defaultPerso.capMed,
        defaultPerso.capMat,
        defaultPerso.capart,
        defaultPerso.cmd,
        defaultPerso.combat,
        defaultPerso.groupId,
      ],
    );

    await pool.query("INSERT INTO lunes (id) VALUES ($1)", [defaultLuneId]);
    await pool.query(
      "INSERT INTO rations (lune_id, perso_id, eau, nrt, med, tache, drogue, construction_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
      [defaultLuneId, defaultPerso.id, true, true, true, "", null, null],
    );
  }

  await pool.query(
    `UPDATE groups AS g
     SET chef = NULL
     WHERE NOT EXISTS (
       SELECT 1 FROM persos AS p WHERE p.group_id = g.group_id
     )`,
  );

  await pool.query(
    `UPDATE groups AS g
     SET chef = leader.id
     FROM (
       SELECT group_id, MIN(id) AS id
       FROM persos
       GROUP BY group_id
     ) AS leader
     WHERE g.group_id = leader.group_id
       AND (
         g.chef IS NULL
         OR NOT EXISTS (
           SELECT 1
           FROM persos AS p
           WHERE p.id = g.chef
             AND p.group_id = g.group_id
         )
       )`,
  );
};

const ensureResourceInventoryRows = async (): Promise<void> => {
  const { rows: resourceRows } = await pool.query(
    "SELECT id, code FROM resources ORDER BY id ASC",
  );

  if (resourceRows.length === 0) {
    return;
  }

  await Promise.all(
    resourceRows.map((resource) =>
      pool.query(
        `INSERT INTO city_resources (city_id, resource_id, quantity)
         VALUES ($1, $2, $3)
         ON CONFLICT (city_id, resource_id) DO NOTHING`,
        [defaultCity.id, resource.id, defaultStocks[resource.code] || 0],
      ),
    ),
  );

  const { rows: existingPersos } = await pool.query(
    "SELECT id FROM persos ORDER BY id ASC",
  );

  for (const perso of existingPersos) {
    await Promise.all(
      resourceRows.map((resource) =>
        pool.query(
          `INSERT INTO perso_resources (perso_id, resource_id, quantity)
           VALUES ($1, $2, $3)
           ON CONFLICT (perso_id, resource_id) DO NOTHING`,
          [perso.id, resource.id, 0],
        ),
      ),
    );
  }
};

const initDb = async () => {
  await ensureCoreSchema();
  await ensureBaseResources();
  await ensureDefaultGameState();

  await normalizeTimelineData();
  await normalizePersoAndGroupData();
  await normalizeEquipmentData();
  await ensureResourceInventoryRows();
};

export { initDb };
