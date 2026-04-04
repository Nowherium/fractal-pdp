import { Pool, type PoolClient } from "pg";

const DATABASE_URL =
  process.env["DATABASE_URL"] || "postgres://postgres:postgres@db:5432/fractal";

const pool = new Pool({ connectionString: DATABASE_URL });

type DbRow = {
  id?: unknown;
  code?: unknown;
  name?: unknown;
  nom?: unknown;
  present?: unknown;
  pvmax?: unknown;
  pv?: unknown;
  capeau?: unknown;
  capnrt?: unknown;
  capmed?: unknown;
  capmat?: unknown;
  capart?: unknown;
  capeau_effectif?: unknown;
  capnrt_effectif?: unknown;
  capmed_effectif?: unknown;
  capmat_effectif?: unknown;
  capart_effectif?: unknown;
  poids_total?: unknown;
  poidsmax?: unknown;
  poidsmax_effectif?: unknown;
  cmd?: unknown;
  combat?: unknown;
  combat_effectif?: unknown;
  equipped_arme_id?: unknown;
  equipped_sac_id?: unknown;
  group_id?: unknown;
  att?: unknown;
  degats?: unknown;
  fiabilite?: unknown;
  pvm?: unknown;
  poids?: unknown;
  quantity?: unknown;
  specialite?: unknown;
  bonus?: unknown;
  capacite?: unknown;
  perso_id?: unknown;
  arme_id?: unknown;
  equipee?: unknown;
  outil_id?: unknown;
  sac_id?: unknown;
  equipe?: unknown;
  lune_id?: unknown;
  eau?: unknown;
  nrt?: unknown;
  med?: unknown;
  mat?: unknown;
  tache?: unknown;
  drogue?: unknown;
  construction_id?: unknown;
  data?: unknown;
  constructions?: unknown;
  meteo?: unknown;
  meteo_eau?: unknown;
  meteo_nrt?: unknown;
  meteo_med?: unknown;
  meteo_mat?: unknown;
} & Record<string, unknown>;

type GenericInput = {
  id?: unknown;
  name?: unknown;
  chef?: unknown;
  group_id?: unknown;
  cmd?: unknown;
  nom?: unknown;
} & Record<string, unknown>;

type WeatherSource = {
  eau?: unknown;
  nrt?: unknown;
  med?: unknown;
  mat?: unknown;
  meteo_eau?: unknown;
  meteo_nrt?: unknown;
  meteo_med?: unknown;
  meteo_mat?: unknown;
} & Record<string, unknown>;

type LuneRationPayload = {
  eau: boolean;
  nrt: boolean;
  med: boolean;
  tache: string;
  drogue: string | null;
  constructionId: string | null;
};

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
    present: true,
    pvmax: 18,
    pv: 18,
    capEau: 2.96,
    capNrt: 2.42,
    capMed: 0.79,
    capMat: 0.14,
    capart: 0,
    cmd: 0,
    combat: 0,
    poidsMax: 20,
    groupId: 1,
  },
];

const defaultGroup = { id: 1, name: "Groupe de Klostro" };
const defaultCity = { id: 1, name: "Ville centrale" };
const defaultCityMultipliers = {
  eau: 1,
  nrt: 1,
  med: 1,
  mat: 1,
};
const defaultWeatherCoefficients = {
  eau: 1,
  nrt: 1,
  med: 1,
  mat: 1,
};
const defaultCurrentLune = 1;

const defaultRation = () => ({
  eau: true,
  nrt: true,
  med: true,
  tache: "",
  drogue: null,
  constructionId: null,
});

const normalizeNumber = (value: unknown): number => {
  if (value === null || value === undefined || value === "") return 0;
  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : 0;
};

const normalizeResourceCode = (value: unknown, fallback = ""): string => {
  const normalized = String(value ?? fallback)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  return normalized;
};

const normalizeResourceName = (
  value: unknown,
  fallback = "Ressource",
): string => {
  const normalized = String(value ?? "").trim();
  return normalized || fallback;
};

const normalizeNonNegativeNumber = (value: unknown): number =>
  Math.max(0, normalizeNumber(value));

const normalizeCurrentLuneValue = (
  value: unknown,
  fallback = defaultCurrentLune,
): number => {
  const normalized = Math.floor(Number(value));
  return Number.isFinite(normalized) && normalized > 0 ? normalized : fallback;
};

const normalizeMultiplier = (value: unknown, fallback = 1): number => {
  const normalized = Number(value);
  return Number.isFinite(normalized) ? Math.max(0, normalized) : fallback;
};

const normalizeWeatherCoefficient = (value: unknown, fallback = 1): number => {
  const normalized = Number(value);
  if (!Number.isFinite(normalized)) return fallback;
  return Math.min(1, Math.max(0, normalized));
};

const normalizeWeatherCoefficients = (
  value: WeatherSource | number | string = {},
) => {
  if (typeof value === "number" || typeof value === "string") {
    const coefficient = normalizeWeatherCoefficient(value, 1);
    return {
      eau: coefficient,
      nrt: coefficient,
      med: coefficient,
      mat: coefficient,
    };
  }

  const source: WeatherSource = value && typeof value === "object" ? value : {};
  return {
    eau: normalizeWeatherCoefficient(
      source.eau ?? source.meteo_eau,
      defaultWeatherCoefficients.eau,
    ),
    nrt: normalizeWeatherCoefficient(
      source.nrt ?? source.meteo_nrt,
      defaultWeatherCoefficients.nrt,
    ),
    med: normalizeWeatherCoefficient(
      source.med ?? source.meteo_med,
      defaultWeatherCoefficients.med,
    ),
    mat: normalizeWeatherCoefficient(
      source.mat ?? source.meteo_mat,
      defaultWeatherCoefficients.mat,
    ),
  };
};

const normalizeWeaponQuantity = (value: unknown): number => {
  if (value === null || value === undefined || value === "") return 1;
  return Math.max(0, Math.floor(normalizeNumber(value)));
};

const normalizeToolSpecialite = (value: unknown): string => {
  const normalized = String(value ?? "").toLowerCase();
  return ["eau", "nrt", "mat", "art"].includes(normalized) ? normalized : "eau";
};

const normalizeOptionalId = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : null;
};

const normalizeBoolean = (value: unknown, fallback = false): boolean => {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["false", "0", "off", "no", "non"].includes(normalized)) {
      return false;
    }
    if (["true", "1", "on", "yes", "oui"].includes(normalized)) {
      return true;
    }
  }

  return Boolean(value);
};

const getGroupCapacity = (cmdValue: unknown): number =>
  Math.max(1, Math.floor(normalizeNumber(cmdValue)) + 1);

type GroupPayload = {
  group_id: number;
  name: string;
  chef: number | null;
};

type ConstructionPlacementLike =
  | string
  | number
  | {
      id?: string | number;
      constructionId?: string | number;
      isPlaced?: boolean;
      luneId?: number;
    };

const buildGroupsPayload = (
  groups: GenericInput[] | null,
  persosPayload: GenericInput[] | null,
) => {
  if (!Array.isArray(groups)) {
    return { groupsPayload: null, groupIds: [] };
  }

  const toGroupPayload = (group: GenericInput): GroupPayload | null => {
    const id = Number(group.id);
    if (!Number.isFinite(id)) return null;
    return {
      group_id: id,
      name: String(group.name || `Groupe ${id}`),
      chef: normalizeOptionalId(group.chef),
    };
  };

  if (!Array.isArray(persosPayload)) {
    const groupsPayload = groups
      .map(toGroupPayload)
      .filter((group): group is GroupPayload => group !== null);

    return {
      groupsPayload,
      groupIds: groupsPayload.map((group) => group.group_id),
    };
  }

  const normalizedPersos = persosPayload
    .map((perso) => {
      const id = Number(perso.id);
      if (!Number.isFinite(id)) return null;
      return {
        id,
        group_id: normalizeOptionalId(perso.group_id),
        cmd: perso.cmd,
        nom: perso.nom,
      };
    })
    .filter(
      (
        perso,
      ): perso is {
        id: number;
        group_id: number | null;
        cmd: unknown;
        nom: unknown;
      } => perso !== null,
    );

  const persoIdsByGroup = new Map<number, number[]>();
  for (const perso of normalizedPersos) {
    if (perso.group_id === null) continue;
    if (!persoIdsByGroup.has(perso.group_id)) {
      persoIdsByGroup.set(perso.group_id, []);
    }
    const memberIds = persoIdsByGroup.get(perso.group_id);
    if (memberIds) {
      memberIds.push(perso.id);
    }
  }

  const persosById = new Map(
    normalizedPersos.map((perso) => [perso.id, perso]),
  );
  const groupsById = new Map<number, GroupPayload>();

  for (const group of groups) {
    const payload = toGroupPayload(group);
    if (payload) {
      groupsById.set(payload.group_id, payload);
    }
  }

  for (const [groupId, memberIds] of persoIdsByGroup.entries()) {
    if (!groupsById.has(groupId)) {
      groupsById.set(groupId, {
        group_id: groupId,
        name:
          groupId === defaultGroup.id ? defaultGroup.name : `Groupe ${groupId}`,
        chef: memberIds[0] ?? null,
      });
    }
  }

  const groupsPayload = Array.from(groupsById.values()).filter((group) => {
    const memberIds = persoIdsByGroup.get(group.group_id) || [];

    if (memberIds.length === 0) {
      group.chef = null;
      return true;
    }

    if (!Number.isFinite(group.chef)) {
      group.chef = memberIds[0] ?? null;
    }

    const chefId = Number(group.chef);
    if (!Number.isFinite(chefId) || !memberIds.includes(chefId)) {
      throw new Error(
        `Le leader ${group.chef} doit appartenir au groupe ${group.group_id}`,
      );
    }

    const leader = persosById.get(chefId);
    const capacity = getGroupCapacity(leader?.cmd);
    const leaderName = leader?.nom ? String(leader.nom) : String(group.chef);
    if (memberIds.length > capacity) {
      throw new Error(
        `Le groupe ${group.name} dépasse la capacité de commandement de ${leaderName} (${capacity} membres max)`,
      );
    }

    return true;
  });

  return {
    groupsPayload,
    groupIds: groupsPayload.map((group) => group.group_id),
  };
};

const normalizePersoRow = (row: DbRow) => ({
  id: row.id,
  nom: row.nom,
  present: normalizeBoolean(row.present, true),
  pvmax: normalizeNonNegativeNumber(row.pvmax),
  pv: normalizeNonNegativeNumber(row.pv ?? row.pvmax),
  capEau: normalizeNumber(row.capeau),
  capNrt: normalizeNumber(row.capnrt),
  capMed: normalizeNumber(row.capmed),
  capMat: normalizeNumber(row.capmat),
  capart: normalizeNumber(row.capart),
  capEauEffectif: normalizeNumber(row.capeau_effectif ?? row.capeau),
  capNrtEffectif: normalizeNumber(row.capnrt_effectif ?? row.capnrt),
  capMedEffectif: normalizeNumber(row.capmed_effectif ?? row.capmed),
  capMatEffectif: normalizeNumber(row.capmat_effectif ?? row.capmat),
  capArtEffectif: normalizeNumber(row.capart_effectif ?? row.capart),
  poidsTotal: normalizeNumber(row.poids_total ?? 0),
  poidsMax: normalizeNonNegativeNumber(row.poidsmax ?? 20),
  poidsMaxEffectif: normalizeNonNegativeNumber(
    row.poidsmax_effectif ?? row.poidsmax ?? 20,
  ),
  cmd: normalizeNumber(row.cmd),
  combat: normalizeNumber(row.combat),
  combatEffectif: normalizeNumber(row.combat_effectif ?? row.combat),
  equippedWeaponId: normalizeOptionalId(row.equipped_arme_id),
  equippedBagId: normalizeOptionalId(row.equipped_sac_id),
  groupId: normalizeOptionalId(row.group_id),
});

const normalizeArmeRow = (row: DbRow) => ({
  id: Number(row.id),
  name: row.name,
  att: normalizeNumber(row.att),
  degats: normalizeNumber(row.degats),
  fiabilite: normalizeNumber(row.fiabilite),
  pv: normalizeNumber(row.pv),
  pvm: normalizeNumber(row.pvm),
  poids: normalizeNumber(row.poids),
  quantity: normalizeWeaponQuantity(row.quantity),
});

const normalizeOutilRow = (row: DbRow) => ({
  id: Number(row.id),
  name: row.name,
  specialite: normalizeToolSpecialite(row.specialite),
  bonus:
    row.bonus === null || row.bonus === undefined
      ? 1
      : normalizeNonNegativeNumber(row.bonus),
  pv: normalizeNonNegativeNumber(row.pv),
  pvmax: normalizeNonNegativeNumber(row.pvmax),
  poids: normalizeNonNegativeNumber(row.poids),
  quantity: normalizeWeaponQuantity(row.quantity),
});

const normalizePersoArmeRow = (row: DbRow) => ({
  perso_id: Number(row.perso_id),
  arme_id: Number(row.arme_id),
  equipee: Boolean(row.equipee),
});

const normalizePersoOutilRow = (row: DbRow) => ({
  perso_id: Number(row.perso_id),
  outil_id: Number(row.outil_id),
});

const normalizeSacRow = (row: DbRow) => ({
  id: Number(row.id),
  name: row.name,
  pv: normalizeNonNegativeNumber(row.pv),
  pvmax: normalizeNonNegativeNumber(row.pvmax),
  poids: normalizeNonNegativeNumber(row.poids),
  capacite: normalizeNonNegativeNumber(row.capacite),
  quantity: normalizeWeaponQuantity(row.quantity),
});

const normalizePersoSacRow = (row: DbRow) => ({
  perso_id: Number(row.perso_id),
  sac_id: Number(row.sac_id),
  equipe: Boolean(row.equipe),
});

const normalizeConstructionPlacements = (
  value: ConstructionPlacementLike[] = [],
  luneId = 1,
) => {
  const placementsByConstructionId = new Map<
    string,
    { luneId: number; constructionId: string; isPlaced: boolean }
  >();

  (Array.isArray(value) ? value : []).forEach(
    (entry: ConstructionPlacementLike) => {
      if (typeof entry === "string" || typeof entry === "number") {
        const constructionId = String(entry);
        if (!constructionId) return;
        placementsByConstructionId.set(constructionId, {
          luneId: normalizeCurrentLuneValue(luneId, 1),
          constructionId,
          isPlaced: true,
        });
        return;
      }

      if (!entry || typeof entry !== "object") {
        return;
      }

      const placementEntry = entry as Exclude<
        ConstructionPlacementLike,
        string | number
      >;
      const constructionId = String(
        placementEntry.constructionId ?? placementEntry.id ?? "",
      );
      if (!constructionId) return;

      placementsByConstructionId.set(constructionId, {
        luneId: normalizeCurrentLuneValue(placementEntry.luneId, luneId),
        constructionId,
        isPlaced: placementEntry.isPlaced !== false,
      });
    },
  );

  return Array.from(placementsByConstructionId.values());
};

const buildLunes = (
  luneRows: DbRow[] = [],
  rationsRows: DbRow[] = [],
  overridesRows: DbRow[] = [],
) => {
  const rationsByLune: Record<number, Record<number, LuneRationPayload>> = {};
  const overridesByLune: Record<number, Record<number, GenericInput>> = {};

  rationsRows.forEach((row) => {
    const luneId = Number(row.lune_id);
    const persoId = Number(row.perso_id);
    rationsByLune[luneId] = rationsByLune[luneId] || {};
    rationsByLune[luneId][persoId] = {
      eau: normalizeBoolean(row.eau, true),
      nrt: normalizeBoolean(row.nrt, true),
      med: normalizeBoolean(row.med, true),
      tache: String(row.tache ?? ""),
      drogue: row.drogue ? String(row.drogue) : null,
      constructionId: row.construction_id ? String(row.construction_id) : null,
    };
  });

  overridesRows.forEach((row) => {
    const luneId = Number(row.lune_id);
    const persoId = Number(row.perso_id);
    overridesByLune[luneId] = overridesByLune[luneId] || {};
    overridesByLune[luneId][persoId] =
      row.data && typeof row.data === "object"
        ? (row.data as GenericInput)
        : {};
  });

  return luneRows.map((row) => {
    const constructionPlacements = normalizeConstructionPlacements(
      Array.isArray(row.constructions)
        ? (row.constructions as ConstructionPlacementLike[])
        : [],
      Number(row.id),
    );

    return {
      id: Number(row.id),
      meteo: normalizeWeatherCoefficients({
        eau: row.meteo_eau ?? row.meteo,
        nrt: row.meteo_nrt ?? row.meteo,
        med: row.meteo_med ?? row.meteo,
        mat: row.meteo_mat ?? row.meteo,
      }),
      rations: rationsByLune[Number(row.id)] || {},
      overrides: overridesByLune[Number(row.id)] || {},
      constructionPlacements,
      constructions: [],
    };
  });
};

const getNextPersoId = async () => {
  const { rows } = await pool.query("SELECT MAX(id) AS max FROM persos");
  const max = rows[0]?.max;
  return max ? Number(max) + 1 : 1;
};

const withTransaction = async <T>(
  callback: (client: PoolClient) => Promise<T>,
): Promise<T> => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

const ensureGroupExists = async (
  client: PoolClient,
  groupId: unknown,
  name: string | null = null,
) => {
  const normalizedGroupId = normalizeOptionalId(groupId);
  if (normalizedGroupId === null) return;

  await client.query(
    `INSERT INTO groups (group_id, name, chef)
     VALUES ($1, $2, NULL)
     ON CONFLICT (group_id) DO NOTHING`,
    [normalizedGroupId, name || `Groupe ${normalizedGroupId}`],
  );
};

const ensurePersoExists = async (client: PoolClient, persoId: number) => {
  const { rowCount } = await client.query(
    "SELECT 1 FROM persos WHERE id = $1 LIMIT 1",
    [persoId],
  );

  if (rowCount === 0) {
    throw new Error(`Le perso ${persoId} est introuvable.`);
  }
};

const ensurePersoResourceCoverage = async (
  client: PoolClient,
  persoIds: Array<number | string> = [],
) => {
  const normalizedPersoIds = (persoIds || [])
    .map((id) => Number(id))
    .filter((id) => Number.isFinite(id));

  if (normalizedPersoIds.length === 0) {
    return;
  }

  await client.query(
    `INSERT INTO perso_resources (perso_id, resource_id, quantity)
     SELECT target.perso_id, r.id, 0
     FROM unnest($1::int[]) AS target(perso_id)
     CROSS JOIN resources AS r
     LEFT JOIN perso_resources pr
       ON pr.perso_id = target.perso_id
      AND pr.resource_id = r.id
     WHERE pr.perso_id IS NULL`,
    [normalizedPersoIds],
  );
};

const syncAndValidateGroups = async (client: PoolClient) => {
  await client.query(
    `UPDATE groups AS g
     SET chef = NULL
     WHERE NOT EXISTS (
       SELECT 1 FROM persos AS p WHERE p.group_id = g.group_id
     )`,
  );

  await client.query(
    `UPDATE groups AS g
     SET chef = leader.id
     FROM (
       SELECT DISTINCT ON (p.group_id) p.group_id, p.id
       FROM persos AS p
       WHERE p.group_id IS NOT NULL
       ORDER BY p.group_id, p.id
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

  const { rows } = await client.query(
    `SELECT
       g.group_id,
       g.name,
       COUNT(m.id)::int AS member_count,
       COALESCE(leader.cmd, 0) AS leader_cmd,
       COALESCE(leader.nom, g.chef::text, g.name) AS leader_name
     FROM groups AS g
     LEFT JOIN persos AS m
       ON m.group_id = g.group_id
     LEFT JOIN persos AS leader
       ON leader.id = g.chef
      AND leader.group_id = g.group_id
     GROUP BY g.group_id, g.name, leader.cmd, leader.nom, g.chef`,
  );

  for (const row of rows) {
    if (Number(row.member_count) === 0) continue;
    const capacity = getGroupCapacity(row.leader_cmd);
    if (Number(row.member_count) > capacity) {
      throw new Error(
        `Le groupe ${row.name} dépasse la capacité de commandement de ${row.leader_name} (${capacity} membres max)`,
      );
    }
  }
};

const validateQuantityAgainstAssignments = async (
  client: PoolClient,
  tableName: string,
  relationTable: string,
  relationField: string,
  itemId: number,
  quantity: number,
  label: string,
): Promise<boolean> => {
  const { rows } = await client.query(
    `SELECT COUNT(*)::int AS assigned_count
     FROM ${relationTable}
     WHERE ${relationField} = $1`,
    [itemId],
  );

  const assignedCount = Number(rows[0]?.assigned_count || 0);
  if (assignedCount > quantity) {
    throw new Error(
      `Le ${label} ${itemId} ne peut pas avoir une quantité inférieure aux ${assignedCount} attribution(s) existante(s).`,
    );
  }

  const { rowCount } = await client.query(
    `SELECT 1 FROM ${tableName} WHERE id = $1 LIMIT 1`,
    [itemId],
  );

  return (rowCount ?? 0) > 0;
};

const buildStocksPayload = (stocks: Record<string, unknown> = {}) =>
  Object.entries(stocks || {})
    .map(([code, quantity]) => ({
      code: normalizeResourceCode(code),
      quantity: normalizeNumber(quantity),
    }))
    .filter(({ code }) => code.length > 0);

export {
  pool,
  stockFields,
  defaultStocks,
  defaultPersos,
  defaultGroup,
  defaultCity,
  defaultCityMultipliers,
  defaultWeatherCoefficients,
  defaultCurrentLune,
  defaultRation,
  normalizeNumber,
  normalizeResourceCode,
  normalizeResourceName,
  normalizeNonNegativeNumber,
  normalizeCurrentLuneValue,
  normalizeMultiplier,
  normalizeWeatherCoefficients,
  normalizeWeaponQuantity,
  normalizeToolSpecialite,
  normalizeOptionalId,
  normalizeBoolean,
  getGroupCapacity,
  buildGroupsPayload,
  normalizePersoRow,
  normalizeArmeRow,
  normalizeOutilRow,
  normalizePersoArmeRow,
  normalizePersoOutilRow,
  normalizeSacRow,
  normalizePersoSacRow,
  normalizeConstructionPlacements,
  buildLunes,
  getNextPersoId,
  withTransaction,
  ensureGroupExists,
  ensurePersoExists,
  ensurePersoResourceCoverage,
  syncAndValidateGroups,
  validateQuantityAgainstAssignments,
  buildStocksPayload,
};
