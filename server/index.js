import express from "express";
import cors from "cors";
import { Pool } from "pg";

const PORT = process.env.PORT || 3000;
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
  return Number(value);
};

const normalizePersoRow = (row) => ({
  id: row.id,
  nom: row.nom,
  pvBase: normalizeNumber(row.pvbase),
  capEau: normalizeNumber(row.capeau),
  capNrt: normalizeNumber(row.capnrt),
  capMed: normalizeNumber(row.capmed),
  capMat: normalizeNumber(row.capmat),
  combat: normalizeNumber(row.combat),
  groupId: row.group_id ? Number(row.group_id) : defaultGroup.id,
});

const initDb = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS resources (
      id serial PRIMARY KEY,
      code text UNIQUE NOT NULL,
      name text NOT NULL
    );

    CREATE TABLE IF NOT EXISTS groups (
      group_id serial PRIMARY KEY,
      name text UNIQUE NOT NULL
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
      combat numeric NOT NULL,
      group_id integer NOT NULL DEFAULT ${defaultGroup.id}
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
    `ALTER TABLE persos ADD COLUMN IF NOT EXISTS group_id integer NOT NULL DEFAULT ${defaultGroup.id}`,
  );

  await pool.query(
    `ALTER TABLE persos ADD COLUMN IF NOT EXISTS combat numeric NOT NULL DEFAULT 0`,
  );

  const { rows: existingConstraint } = await pool.query(
    "SELECT conname FROM pg_constraint WHERE conname = 'persos_group_id_fkey' LIMIT 1",
  );
  if (existingConstraint.length === 0) {
    await pool.query(
      "ALTER TABLE persos ADD CONSTRAINT persos_group_id_fkey FOREIGN KEY (group_id) REFERENCES groups(group_id)",
    );
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
    const defaultLuneId = Date.now();
    await pool.query(
      "INSERT INTO persos (id, nom, pvBase, capEau, capNrt, capMed, capMat, combat) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)",
      [
        defaultPersos[0].id,
        defaultPersos[0].nom,
        defaultPersos[0].pvBase,
        defaultPersos[0].capEau,
        defaultPersos[0].capNrt,
        defaultPersos[0].capMed,
        defaultPersos[0].capMat,
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
    "SELECT group_id, name FROM groups ORDER BY group_id ASC",
  );
  const groups = groupRows.map((row) => ({
    id: Number(row.group_id),
    name: row.name,
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
    "SELECT id, nom, pvBase, capEau, capNrt, capMed, capMat, combat, group_id FROM persos ORDER BY id ASC",
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
  const stocks = state.stocks || defaultStocks;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM overrides");
    await client.query("DELETE FROM rations");
    await client.query("DELETE FROM lunes");
    await client.query("DELETE FROM perso_resources");
    await client.query("DELETE FROM persos");

    for (const p of persos) {
      await client.query(
        "INSERT INTO persos (id, nom, pvBase, capEau, capNrt, capMed, capMat, combat, group_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)",
        [
          p.id,
          p.nom,
          p.pvBase,
          p.capEau,
          p.capNrt,
          p.capMed,
          p.capMat,
          p.combat || 0,
          p.groupId || defaultGroup.id,
        ],
      );
    }

    for (const lune of lunes) {
      await client.query("INSERT INTO lunes (id, coutMat) VALUES ($1, $2)", [
        lune.id,
        lune.coutMat,
      ]);
      const rations = lune.rations || {};
      for (const [persoId, ration] of Object.entries(rations)) {
        await client.query(
          "INSERT INTO rations (lune_id, perso_id, eau, nrt, med, tache) VALUES ($1,$2,$3,$4,$5,$6)",
          [
            lune.id,
            Number(persoId),
            ration.eau,
            ration.nrt,
            ration.med,
            ration.tache || "",
          ],
        );
      }
      const overrides = lune.overrides || {};
      for (const [persoId, data] of Object.entries(overrides)) {
        await client.query(
          "INSERT INTO overrides (lune_id, perso_id, data) VALUES ($1,$2,$3)",
          [lune.id, Number(persoId), data],
        );
      }
    }

    await client.query("DELETE FROM city_resources WHERE city_id = $1", [
      defaultCity.id,
    ]);

    for (const field of stockFields) {
      await client.query(
        "INSERT INTO city_resources (city_id, resource_id, quantity) VALUES ($1, (SELECT id FROM resources WHERE code = $2), $3)",
        [defaultCity.id, field, stocks[field] || 0],
      );
    }

    const { rows: allPersos } = await client.query("SELECT id FROM persos");
    const { rows: allResources } = await client.query(
      "SELECT id FROM resources",
    );
    for (const perso of allPersos) {
      for (const resource of allResources) {
        await client.query(
          "INSERT INTO perso_resources (perso_id, resource_id, quantity) VALUES ($1, $2, $3)",
          [perso.id, resource.id, 0],
        );
      }
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/state", async (_req, res) => {
  try {
    const state = await getState();
    res.json(state);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "Impossible de lire l’état depuis la base de données" });
  }
});

app.put("/api/state", async (req, res) => {
  try {
    await insertState(req.body);
    const state = await getState();
    res.json(state);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Impossible de sauvegarder l’état dans la base de données",
    });
  }
});

app.post("/api/reset", async (_req, res) => {
  try {
    const defaultLuneId = Date.now();
    const defaultState = {
      stocks: defaultStocks,
      persos: defaultPersos,
      lunes: [
        {
          id: defaultLuneId,
          coutMat: 0,
          rations: Object.fromEntries(
            defaultPersos.map((p) => [p.id, defaultRation()]),
          ),
          overrides: {},
        },
      ],
    };
    await insertState(defaultState);
    const state = await getState();
    res.json(state);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "Impossible de réinitialiser la base de données" });
  }
});

const start = async () => {
  try {
    await initDb();
    app.listen(PORT, () => {
      console.log(`Backend démarré sur le port ${PORT}`);
    });
  } catch (error) {
    console.error("Échec de l’initialisation de la base de données", error);
    process.exit(1);
  }
};

start();
