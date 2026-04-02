import { Pool } from "pg";

const DATABASE_URL =
  process.env.DATABASE_URL || "postgres://postgres:postgres@db:5432/fractal";

const stockFields = [
  "nrt",
  "eau",
  "med",
  "mat",
  "cha",
  "boi",
  "fer",
  "cok",
  "cui",
  "aci",
  "sou",
  "pie",
  "pet",
  "ess",
  "rbl",
  "bbr",
  "bbl",
  "tby",
  "abt",
  "gen",
  "rhm",
  "whk",
  "vdk",
  "php",
  "fca",
  "cir",
  "ext",
  "opm",
  "coc",
  "chp",
  "cnb",
  "pou",
  "mu0",
  "mu1",
  "mu2",
  "mu3",
  "mu4",
  "mu5",
  "mu6",
  "mu7",
  "mu8",
  "mu9",
  "mun10",
  "bat",
  "arm",
  "mou",
  "alp",
  "ble",
  "avn",
  "bet",
  "pdt",
  "vva",
  "vt3",
  "vt2",
  "vt1",
  "vm1",
  "vm2",
  "sel",
  "crd",
];

const defaultStocks = Object.fromEntries(
  stockFields.map((field) => [field, 0]),
);
Object.assign(defaultStocks, { eau: 82, nrt: 96, med: 15, mat: 20 });

const defaultPersos = [
  {
    id: 1,
    nom: "Klostro",
    pvBase: 18,
    capEau: 2.96,
    capNrt: 2.42,
    capMed: 0.79,
    capMat: 0.14,
    capart: 0,
    cmd: 0,
    combat: 0,
    groupId: 1,
  },
];

const defaultGroup = { id: 1, name: "Default" };
const defaultCity = { id: 1, name: "Ville centrale" };

const defaultRation = () => ({ eau: true, nrt: true, med: true, tache: "" });

const pool = new Pool({ connectionString: DATABASE_URL });

const normalizeNumber = (value) => {
  if (value === null || value === undefined || value === "") return 0;
  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : 0;
};

const normalizePersoRow = (row) => ({
  id: row.id,
  nom: row.nom,
  pvBase: normalizeNumber(row.pvbase),
  capEau: normalizeNumber(row.capeau),
  capNrt: normalizeNumber(row.capnrt),
  capMed: normalizeNumber(row.capmed),
  capMat: normalizeNumber(row.capmat),
  capart: normalizeNumber(row.capart),
  cmd: normalizeNumber(row.cmd),
  combat: normalizeNumber(row.combat),
  groupId:
    row.group_id === null || row.group_id === undefined
      ? null
      : Number(row.group_id),
});

const buildLunes = (luneRows, rationsRows, overridesRows) => {
  const rationsByLune = {};
  const overridesByLune = {};

  rationsRows.forEach((row) => {
    const luneId = Number(row.lune_id);
    const persoId = Number(row.perso_id);
    rationsByLune[luneId] = rationsByLune[luneId] || {};
    rationsByLune[luneId][persoId] = {
      eau: row.eau,
      nrt: row.nrt,
      med: row.med,
      tache: row.tache,
    };
  });

  overridesRows.forEach((row) => {
    const luneId = Number(row.lune_id);
    const persoId = Number(row.perso_id);
    overridesByLune[luneId] = overridesByLune[luneId] || {};
    overridesByLune[luneId][persoId] = row.data;
  });

  return luneRows.map((row) => ({
    id: Number(row.id),
    coutMat: normalizeNumber(row.coutmat),
    rations: rationsByLune[Number(row.id)] || {},
    overrides: overridesByLune[Number(row.id)] || {},
  }));
};

const getNextPersoId = async () => {
  const { rows } = await pool.query("SELECT MAX(id) AS max FROM persos");
  const max = rows[0]?.max;
  return max ? Number(max) + 1 : 1;
};

const getState = async () => {
  const { rows: resourceRows } = await pool.query(
    "SELECT id, code, name FROM resources ORDER BY id ASC",
  );
  const resources = resourceRows.map((row) => ({
    id: Number(row.id),
    code: row.code,
    name: row.name,
  }));
  const resourceCodeById = Object.fromEntries(
    resources.map((resource) => [resource.id, resource.code]),
  );

  const { rows: cityRows } = await pool.query(
    "SELECT id, name FROM cities ORDER BY id ASC",
  );
  const cities = cityRows.map((row) => ({
    id: Number(row.id),
    name: row.name,
  }));

  const { rows: groupRows } = await pool.query(
    "SELECT group_id, name, chef FROM groups ORDER BY group_id ASC",
  );
  const groups = groupRows.map((row) => ({
    id: Number(row.group_id),
    name: row.name,
    chef: row.chef === null ? null : Number(row.chef),
  }));

  const selectedCityId = cities[0]?.id || defaultCity.id;
  const { rows: cityResourceRows } = await pool.query(
    "SELECT city_id, resource_id, quantity FROM city_resources WHERE city_id = $1",
    [selectedCityId],
  );

  let stocks = Object.fromEntries(
    resources.map((resource) => [resource.code, 0]),
  );
  if (cityResourceRows.length > 0) {
    cityResourceRows.forEach((row) => {
      const code = resourceCodeById[row.resource_id];
      if (code) stocks[code] = normalizeNumber(row.quantity);
    });
  } else {
    stocks = defaultStocks;
  }

  const { rows: cityResourcesRows } = await pool.query(
    "SELECT city_id, resource_id, quantity FROM city_resources ORDER BY city_id, resource_id ASC",
  );
  const cityResources = cityResourcesRows.map((row) => ({
    city_id: Number(row.city_id),
    resource_id: Number(row.resource_id),
    quantity: normalizeNumber(row.quantity),
  }));

  const { rows: persoResourcesRows } = await pool.query(
    "SELECT perso_id, resource_id, quantity FROM perso_resources ORDER BY perso_id, resource_id ASC",
  );
  const persoResources = persoResourcesRows.map((row) => ({
    perso_id: Number(row.perso_id),
    resource_id: Number(row.resource_id),
    quantity: normalizeNumber(row.quantity),
  }));

  const { rows: persoRows } = await pool.query(
    "SELECT id, nom, pvBase, capEau, capNrt, capMed, capMat, capart, cmd, combat, group_id FROM persos ORDER BY id ASC",
  );
  const persos = persoRows.map(normalizePersoRow);

  const { rows: luneRows } = await pool.query(
    "SELECT id, coutMat FROM lunes ORDER BY id ASC",
  );
  const { rows: rationsRows } = await pool.query(
    "SELECT lune_id, perso_id, eau, nrt, med, tache FROM rations",
  );
  const { rows: overridesRows } = await pool.query(
    "SELECT lune_id, perso_id, data FROM overrides",
  );

  const lunes = buildLunes(luneRows, rationsRows, overridesRows);
  const nextPersoId = await getNextPersoId();

  return {
    stocks,
    persos,
    lunes,
    nextPersoId,
    resources,
    cities,
    groups,
    cityResources,
    persoResources,
  };
};

const insertState = async (state) => {
  const persos = Array.isArray(state.persos) ? state.persos : [];
  const lunes = Array.isArray(state.lunes) ? state.lunes : [];
  const stocks = { ...defaultStocks, ...(state.stocks || {}) };
  const groups = Array.isArray(state.groups) ? state.groups : null;

  const persosById = new Map();
  for (const p of persos) {
    const id = Number(p.id);
    if (!Number.isFinite(id)) continue;
    persosById.set(id, {
      id,
      nom: p.nom,
      pvbase: normalizeNumber(p.pvBase),
      capeau: normalizeNumber(p.capEau),
      capnrt: normalizeNumber(p.capNrt),
      capmed: normalizeNumber(p.capMed),
      capmat: normalizeNumber(p.capMat),
      capart: normalizeNumber(p.capart),
      cmd: normalizeNumber(p.cmd),
      combat: normalizeNumber(p.combat),
      group_id:
        p.groupId === null || p.groupId === undefined || p.groupId === ""
          ? null
          : Number(p.groupId),
    });
  }
  const persosPayload = Array.from(persosById.values());
  const persoIds = persosPayload.map((p) => p.id);

  const lunesById = new Map();
  const rationsPayload = [];
  const overridesPayload = [];
  for (const lune of lunes) {
    const luneId = Number(lune.id);
    if (!Number.isFinite(luneId)) continue;
    lunesById.set(luneId, {
      id: luneId,
      coutmat: normalizeNumber(lune.coutMat),
    });

    const rations = lune.rations || {};
    for (const [persoIdRaw, ration] of Object.entries(rations)) {
      const persoId = Number(persoIdRaw);
      if (!Number.isFinite(persoId)) continue;
      rationsPayload.push({
        lune_id: luneId,
        perso_id: persoId,
        eau: ration?.eau ?? true,
        nrt: ration?.nrt ?? true,
        med: ration?.med ?? true,
        tache: ration?.tache || "",
      });
    }

    const overrides = lune.overrides || {};
    for (const [persoIdRaw, data] of Object.entries(overrides)) {
      const persoId = Number(persoIdRaw);
      if (!Number.isFinite(persoId)) continue;
      overridesPayload.push({
        lune_id: luneId,
        perso_id: persoId,
        data: data || {},
      });
    }
  }
  const lunesPayload = Array.from(lunesById.values());
  const luneIds = lunesPayload.map((lune) => lune.id);

  let groupsPayload = null;
  let groupIds = [];
  if (groups) {
    const persoIdsByGroup = new Map();
    for (const perso of persosPayload) {
      if (perso.group_id === null || perso.group_id === undefined) continue;
      if (!persoIdsByGroup.has(perso.group_id)) {
        persoIdsByGroup.set(perso.group_id, []);
      }
      persoIdsByGroup.get(perso.group_id).push(perso.id);
    }

    const groupsById = new Map();
    for (const group of groups) {
      const id = Number(group.id);
      if (!Number.isFinite(id)) continue;
      groupsById.set(id, {
        group_id: id,
        name: group.name || `Groupe ${id}`,
        chef:
          group.chef === null || group.chef === undefined
            ? null
            : Number(group.chef),
      });
    }

    for (const [groupId, memberIds] of persoIdsByGroup.entries()) {
      if (!groupsById.has(groupId)) {
        groupsById.set(groupId, {
          group_id: groupId,
          name:
            groupId === defaultGroup.id
              ? defaultGroup.name
              : `Groupe ${groupId}`,
          chef: memberIds[0],
        });
      }
    }

    groupsPayload = Array.from(groupsById.values()).filter((group) => {
      const memberIds = persoIdsByGroup.get(group.group_id) || [];
      if (memberIds.length === 0) {
        return false;
      }
      if (!Number.isFinite(group.chef)) {
        group.chef = memberIds[0];
      }
      if (!memberIds.includes(group.chef)) {
        throw new Error(
          `Le leader ${group.chef} doit appartenir au groupe ${group.group_id}`,
        );
      }
      const leader = persosById.get(group.chef);
      const capacity = Math.max(
        1,
        Math.floor(normalizeNumber(leader?.cmd)) + 1,
      );
      if (memberIds.length > capacity) {
        throw new Error(
          `Le groupe ${group.name} dépasse la capacité de commandement de ${leader?.nom || group.chef} (${capacity} membres max)`,
        );
      }
      return true;
    });
    groupIds = groupsPayload.map((group) => group.group_id);
  }

  const stocksPayload = stockFields.map((code) => ({
    code,
    quantity: normalizeNumber(stocks[code]),
  }));

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    if (groupsPayload !== null && groupsPayload.length > 0) {
      await client.query(
        `INSERT INTO groups (group_id, name, chef)
         SELECT group_id, name, chef
         FROM json_to_recordset($1::json) AS incoming(group_id integer, name text, chef integer)
         ON CONFLICT (group_id)
         DO UPDATE SET name = EXCLUDED.name, chef = EXCLUDED.chef`,
        [JSON.stringify(groupsPayload)],
      );
    }

    if (persosPayload.length > 0) {
      await client.query(
        `INSERT INTO persos (id, nom, pvBase, capEau, capNrt, capMed, capMat, capart, cmd, combat, group_id)
         SELECT id, nom, pvbase, capeau, capnrt, capmed, capmat, capart, cmd, combat, group_id
         FROM json_to_recordset($1::json) AS incoming(
           id integer,
           nom text,
           pvbase numeric,
           capeau numeric,
           capnrt numeric,
           capmed numeric,
           capmat numeric,
           capart numeric,
           cmd numeric,
           combat numeric,
           group_id integer
         )
         ON CONFLICT (id)
         DO UPDATE SET
           nom = EXCLUDED.nom,
           pvBase = EXCLUDED.pvBase,
           capEau = EXCLUDED.capEau,
           capNrt = EXCLUDED.capNrt,
           capMed = EXCLUDED.capMed,
           capMat = EXCLUDED.capMat,
           capart = EXCLUDED.capart,
           cmd = EXCLUDED.cmd,
           combat = EXCLUDED.combat,
           group_id = EXCLUDED.group_id`,
        [JSON.stringify(persosPayload)],
      );
      await client.query("DELETE FROM persos WHERE NOT (id = ANY($1::int[]))", [
        persoIds,
      ]);
    } else {
      await client.query("DELETE FROM persos");
    }

    if (groupsPayload !== null) {
      await client.query(
        "DELETE FROM groups WHERE NOT (group_id = ANY($1::int[]))",
        [groupIds],
      );
    }

    if (lunesPayload.length > 0) {
      await client.query(
        `INSERT INTO lunes (id, coutMat)
         SELECT id, coutmat
         FROM json_to_recordset($1::json) AS incoming(id bigint, coutmat numeric)
         ON CONFLICT (id)
         DO UPDATE SET coutMat = EXCLUDED.coutMat`,
        [JSON.stringify(lunesPayload)],
      );
      await client.query(
        "DELETE FROM lunes WHERE NOT (id = ANY($1::bigint[]))",
        [luneIds],
      );
    } else {
      await client.query("DELETE FROM lunes");
    }

    if (rationsPayload.length > 0) {
      await client.query(
        `INSERT INTO rations (lune_id, perso_id, eau, nrt, med, tache)
         SELECT lune_id, perso_id, eau, nrt, med, tache
         FROM json_to_recordset($1::json) AS incoming(
           lune_id bigint,
           perso_id integer,
           eau boolean,
           nrt boolean,
           med boolean,
           tache text
         )
         ON CONFLICT (lune_id, perso_id)
         DO UPDATE SET
           eau = EXCLUDED.eau,
           nrt = EXCLUDED.nrt,
           med = EXCLUDED.med,
           tache = EXCLUDED.tache`,
        [JSON.stringify(rationsPayload)],
      );
      await client.query(
        `DELETE FROM rations AS r
         WHERE NOT EXISTS (
           SELECT 1
           FROM json_to_recordset($1::json) AS incoming(
             lune_id bigint,
             perso_id integer,
             eau boolean,
             nrt boolean,
             med boolean,
             tache text
           )
           WHERE incoming.lune_id = r.lune_id
             AND incoming.perso_id = r.perso_id
         )`,
        [JSON.stringify(rationsPayload)],
      );
    } else {
      await client.query("DELETE FROM rations");
    }

    if (overridesPayload.length > 0) {
      await client.query(
        `INSERT INTO overrides (lune_id, perso_id, data)
         SELECT lune_id, perso_id, data
         FROM json_to_recordset($1::json) AS incoming(
           lune_id bigint,
           perso_id integer,
           data jsonb
         )
         ON CONFLICT (lune_id, perso_id)
         DO UPDATE SET data = EXCLUDED.data`,
        [JSON.stringify(overridesPayload)],
      );
      await client.query(
        `DELETE FROM overrides AS o
         WHERE NOT EXISTS (
           SELECT 1
           FROM json_to_recordset($1::json) AS incoming(
             lune_id bigint,
             perso_id integer,
             data jsonb
           )
           WHERE incoming.lune_id = o.lune_id
             AND incoming.perso_id = o.perso_id
         )`,
        [JSON.stringify(overridesPayload)],
      );
    } else {
      await client.query("DELETE FROM overrides");
    }

    await client.query(
      `INSERT INTO city_resources (city_id, resource_id, quantity)
       SELECT $1, r.id, incoming.quantity
       FROM json_to_recordset($2::json) AS incoming(code text, quantity numeric)
       JOIN resources AS r ON r.code = incoming.code
       ON CONFLICT (city_id, resource_id)
       DO UPDATE SET quantity = EXCLUDED.quantity`,
      [defaultCity.id, JSON.stringify(stocksPayload)],
    );

    await client.query(
      `INSERT INTO perso_resources (perso_id, resource_id, quantity)
       SELECT p.id, r.id, 0
       FROM persos AS p
       CROSS JOIN resources AS r
       LEFT JOIN perso_resources pr
         ON pr.perso_id = p.id
        AND pr.resource_id = r.id
       WHERE pr.perso_id IS NULL`,
    );

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

const initDb = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS resources (
      id serial PRIMARY KEY,
      code text UNIQUE NOT NULL,
      name text NOT NULL
    );

    CREATE TABLE IF NOT EXISTS groups (
      group_id serial PRIMARY KEY,
      name text UNIQUE NOT NULL,
      chef integer
    );

    CREATE TABLE IF NOT EXISTS cities (
      id serial PRIMARY KEY,
      name text UNIQUE NOT NULL
    );

    CREATE TABLE IF NOT EXISTS city_resources (
      city_id integer REFERENCES cities(id) ON DELETE CASCADE,
      resource_id integer REFERENCES resources(id) ON DELETE CASCADE,
      quantity numeric NOT NULL DEFAULT 0,
      PRIMARY KEY (city_id, resource_id)
    );

    CREATE TABLE IF NOT EXISTS persos (
      id integer PRIMARY KEY,
      nom text NOT NULL,
      pvBase numeric NOT NULL,
      capEau numeric NOT NULL,
      capNrt numeric NOT NULL,
      capMed numeric NOT NULL,
      capMat numeric NOT NULL,
      capart numeric NOT NULL,
      cmd numeric NOT NULL,
      combat numeric NOT NULL,
      group_id integer
    );

    CREATE TABLE IF NOT EXISTS perso_resources (
      perso_id integer REFERENCES persos(id) ON DELETE CASCADE,
      resource_id integer REFERENCES resources(id) ON DELETE CASCADE,
      quantity numeric NOT NULL DEFAULT 0,
      PRIMARY KEY (perso_id, resource_id)
    );

    CREATE TABLE IF NOT EXISTS lunes (
      id bigint PRIMARY KEY,
      coutMat numeric NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS rations (
      lune_id bigint REFERENCES lunes(id) ON DELETE CASCADE,
      perso_id integer REFERENCES persos(id) ON DELETE CASCADE,
      eau boolean NOT NULL,
      nrt boolean NOT NULL,
      med boolean NOT NULL,
      tache text NOT NULL,
      PRIMARY KEY (lune_id, perso_id)
    );

    CREATE TABLE IF NOT EXISTS overrides (
      lune_id bigint REFERENCES lunes(id) ON DELETE CASCADE,
      perso_id integer REFERENCES persos(id) ON DELETE CASCADE,
      data jsonb NOT NULL,
      PRIMARY KEY (lune_id, perso_id)
    );
  `);

  await pool.query(
    `ALTER TABLE persos DROP COLUMN IF EXISTS incEau, DROP COLUMN IF EXISTS incNrt, DROP COLUMN IF EXISTS incMed, DROP COLUMN IF EXISTS incMat`,
  );

  await Promise.all(
    stockFields.map((field) =>
      pool.query(
        "INSERT INTO resources (code, name) VALUES ($1, $2) ON CONFLICT (code) DO NOTHING",
        [field, field.toUpperCase()],
      ),
    ),
  );

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

  await pool.query(
    `ALTER TABLE persos ADD COLUMN IF NOT EXISTS group_id integer`,
  );

  await pool.query(`ALTER TABLE persos ALTER COLUMN group_id DROP NOT NULL`);

  await pool.query(`ALTER TABLE persos ALTER COLUMN group_id DROP DEFAULT`);

  await pool.query(
    `ALTER TABLE persos ADD COLUMN IF NOT EXISTS capart numeric NOT NULL DEFAULT 0`,
  );

  await pool.query(
    `ALTER TABLE persos ADD COLUMN IF NOT EXISTS cmd numeric NOT NULL DEFAULT 0`,
  );

  await pool.query(
    `ALTER TABLE persos ADD COLUMN IF NOT EXISTS combat numeric NOT NULL DEFAULT 0`,
  );

  await pool.query(`ALTER TABLE groups ADD COLUMN IF NOT EXISTS chef integer`);

  const { rows: existingConstraint } = await pool.query(
    "SELECT conname FROM pg_constraint WHERE conname = 'persos_group_id_fkey' LIMIT 1",
  );
  if (existingConstraint.length === 0) {
    await pool.query(
      "ALTER TABLE persos ADD CONSTRAINT persos_group_id_fkey FOREIGN KEY (group_id) REFERENCES groups(group_id)",
    );
  }

  const { rows: existingPersoGroupPairConstraint } = await pool.query(
    "SELECT conname FROM pg_constraint WHERE conname = 'persos_group_id_id_key' LIMIT 1",
  );
  if (existingPersoGroupPairConstraint.length === 0) {
    await pool.query(
      "ALTER TABLE persos ADD CONSTRAINT persos_group_id_id_key UNIQUE (group_id, id)",
    );
  }

  await pool.query(
    "ALTER TABLE groups DROP CONSTRAINT IF EXISTS groups_chef_fkey",
  );

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
    const defaultLuneId = Date.now();
    await pool.query(
      "INSERT INTO persos (id, nom, pvBase, capEau, capNrt, capMed, capMat, capart, cmd, combat) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)",
      [
        defaultPersos[0].id,
        defaultPersos[0].nom,
        defaultPersos[0].pvBase,
        defaultPersos[0].capEau,
        defaultPersos[0].capNrt,
        defaultPersos[0].capMed,
        defaultPersos[0].capMat,
        defaultPersos[0].capart,
        defaultPersos[0].cmd,
        defaultPersos[0].combat,
      ],
    );

    await pool.query("INSERT INTO lunes (id, coutMat) VALUES ($1, $2)", [
      defaultLuneId,
      0,
    ]);
    await pool.query(
      "INSERT INTO rations (lune_id, perso_id, eau, nrt, med, tache) VALUES ($1, $2, $3, $4, $5, $6)",
      [defaultLuneId, defaultPersos[0].id, true, true, true, ""],
    );
  }

  await pool.query(
    `DELETE FROM groups AS g
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

  const { rows: existingGroupLeaderConstraint } = await pool.query(
    "SELECT conname FROM pg_constraint WHERE conname = 'groups_group_id_chef_fkey' LIMIT 1",
  );
  if (existingGroupLeaderConstraint.length === 0) {
    await pool.query(
      "ALTER TABLE groups ADD CONSTRAINT groups_group_id_chef_fkey FOREIGN KEY (group_id, chef) REFERENCES persos(group_id, id) DEFERRABLE INITIALLY DEFERRED",
    );
  }

  await pool.query("ALTER TABLE groups ALTER COLUMN chef SET NOT NULL");

  const { rows: cityResourceRows } = await pool.query(
    "SELECT city_id FROM city_resources LIMIT 1",
  );
  if (cityResourceRows.length === 0) {
    const { rows: resourceRows2 } = await pool.query(
      "SELECT id, code FROM resources",
    );

    const { rows: stocksExistRows } = await pool.query(
      "SELECT to_regclass('public.stocks') AS exists",
    );
    const stocksExist = stocksExistRows[0]?.exists !== null;
    const stockValues = stocksExist
      ? (
          await pool.query(
            `SELECT ${stockFields.join(", ")} FROM stocks LIMIT 1`,
          )
        ).rows[0] || defaultStocks
      : defaultStocks;

    const cityId = defaultCity.id;
    await Promise.all(
      resourceRows2.map((resource) =>
        pool.query(
          "INSERT INTO city_resources (city_id, resource_id, quantity) VALUES ($1, $2, $3)",
          [cityId, resource.id, stockValues[resource.code] || 0],
        ),
      ),
    );
  }

  await pool.query("DROP TABLE IF EXISTS stocks");

  const { rows: persoResourceRows } = await pool.query(
    "SELECT perso_id FROM perso_resources LIMIT 1",
  );
  if (persoResourceRows.length === 0) {
    const { rows: existingPersos } = await pool.query("SELECT id FROM persos");
    if (existingPersos.length > 0) {
      const { rows: resourceRows2 } = await pool.query(
        "SELECT id FROM resources",
      );
      for (const perso of existingPersos) {
        await Promise.all(
          resourceRows2.map((resource) =>
            pool.query(
              "INSERT INTO perso_resources (perso_id, resource_id, quantity) VALUES ($1, $2, $3)",
              [perso.id, resource.id, 0],
            ),
          ),
        );
      }
    }
  }
};

export {
  initDb,
  getState,
  insertState,
  defaultStocks,
  defaultPersos,
  defaultRation,
};
