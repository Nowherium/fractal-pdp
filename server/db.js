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

const defaultGroup = { id: 1, name: "Default" };
const defaultCity = { id: 1, name: "Ville centrale" };

const defaultRation = () => ({ eau: true, nrt: true, med: true, tache: "" });

const pool = new Pool({ connectionString: DATABASE_URL });

const normalizeNumber = (value) => {
  if (value === null || value === undefined || value === "") return 0;
  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : 0;
};

const normalizeNonNegativeNumber = (value) =>
  Math.max(0, normalizeNumber(value));

const normalizeWeaponQuantity = (value) => {
  if (value === null || value === undefined || value === "") return 1;
  return Math.max(0, Math.floor(normalizeNumber(value)));
};

const normalizeToolSpecialite = (value) => {
  const normalized = String(value ?? "").toLowerCase();
  return ["eau", "nrt", "mat", "art"].includes(normalized) ? normalized : "eau";
};

const normalizeOptionalId = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : null;
};

const getGroupCapacity = (cmdValue) =>
  Math.max(1, Math.floor(normalizeNumber(cmdValue)) + 1);

const buildGroupsPayload = (groups, persosPayload) => {
  if (!Array.isArray(groups)) {
    return { groupsPayload: null, groupIds: [] };
  }

  const persoIdsByGroup = new Map();
  for (const perso of persosPayload) {
    if (perso.group_id === null || perso.group_id === undefined) continue;
    if (!persoIdsByGroup.has(perso.group_id)) {
      persoIdsByGroup.set(perso.group_id, []);
    }
    persoIdsByGroup.get(perso.group_id).push(perso.id);
  }

  const persosById = new Map(persosPayload.map((perso) => [perso.id, perso]));
  const groupsById = new Map();

  for (const group of groups) {
    const id = Number(group.id);
    if (!Number.isFinite(id)) continue;
    groupsById.set(id, {
      group_id: id,
      name: group.name || `Groupe ${id}`,
      chef: normalizeOptionalId(group.chef),
    });
  }

  for (const [groupId, memberIds] of persoIdsByGroup.entries()) {
    if (!groupsById.has(groupId)) {
      groupsById.set(groupId, {
        group_id: groupId,
        name:
          groupId === defaultGroup.id ? defaultGroup.name : `Groupe ${groupId}`,
        chef: memberIds[0],
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
      group.chef = memberIds[0];
    }

    if (!memberIds.includes(group.chef)) {
      throw new Error(
        `Le leader ${group.chef} doit appartenir au groupe ${group.group_id}`,
      );
    }

    const leader = persosById.get(group.chef);
    const capacity = getGroupCapacity(leader?.cmd);
    if (memberIds.length > capacity) {
      throw new Error(
        `Le groupe ${group.name} dépasse la capacité de commandement de ${leader?.nom || group.chef} (${capacity} membres max)`,
      );
    }

    return true;
  });

  return {
    groupsPayload,
    groupIds: groupsPayload.map((group) => group.group_id),
  };
};

const normalizePersoRow = (row) => ({
  id: row.id,
  nom: row.nom,
  pvmax: normalizeNonNegativeNumber(row.pvmax ?? row.pvbase),
  pv: normalizeNonNegativeNumber(row.pv ?? row.pvmax ?? row.pvbase),
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

const normalizeArmeRow = (row) => ({
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

const normalizeOutilRow = (row) => ({
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

const normalizePersoArmeRow = (row) => ({
  perso_id: Number(row.perso_id),
  arme_id: Number(row.arme_id),
  equipee: Boolean(row.equipee),
});

const normalizePersoOutilRow = (row) => ({
  perso_id: Number(row.perso_id),
  outil_id: Number(row.outil_id),
});

const normalizeSacRow = (row) => ({
  id: Number(row.id),
  name: row.name,
  pv: normalizeNonNegativeNumber(row.pv),
  pvmax: normalizeNonNegativeNumber(row.pvmax),
  poids: normalizeNonNegativeNumber(row.poids),
  capacite: normalizeNonNegativeNumber(row.capacite),
  quantity: normalizeWeaponQuantity(row.quantity),
});

const normalizePersoSacRow = (row) => ({
  perso_id: Number(row.perso_id),
  sac_id: Number(row.sac_id),
  equipe: Boolean(row.equipe),
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
    quantity: normalizeNonNegativeNumber(row.quantity),
  }));

  const { rows: armeRows } = await pool.query(
    "SELECT id, name, att, degats, fiabilite, pv, pvm, poids, quantity FROM armes ORDER BY id ASC",
  );
  const armes = armeRows.map(normalizeArmeRow);

  const { rows: persoArmeRows } = await pool.query(
    "SELECT perso_id, arme_id, equipee FROM perso_armes ORDER BY perso_id, arme_id ASC",
  );
  const persoArmes = persoArmeRows.map(normalizePersoArmeRow);

  const { rows: outilRows } = await pool.query(
    "SELECT id, name, specialite, bonus, pv, pvmax, poids, quantity FROM outils ORDER BY id ASC",
  );
  const outils = outilRows.map(normalizeOutilRow);

  const { rows: persoOutilRows } = await pool.query(
    "SELECT perso_id, outil_id FROM perso_outils ORDER BY perso_id, outil_id ASC",
  );
  const persoOutils = persoOutilRows.map(normalizePersoOutilRow);

  const { rows: sacRows } = await pool.query(
    "SELECT id, name, pv, pvmax, poids, capacite, quantity FROM sacs ORDER BY id ASC",
  );
  const sacs = sacRows.map(normalizeSacRow);

  const { rows: persoSacRows } = await pool.query(
    "SELECT perso_id, sac_id, equipe FROM perso_sacs ORDER BY perso_id, sac_id ASC",
  );
  const persoSacs = persoSacRows.map(normalizePersoSacRow);

  const { rows: persoRows } = await pool.query(
    `SELECT
      p.id,
      p.nom,
      p.pvmax,
      p.pv,
      p.poidsmax,
      p.poidsmax + COALESCE(s.capacite, 0) AS poidsmax_effectif,
      p.capEau,
      p.capNrt,
      p.capMed,
      p.capMat,
      p.capart,
      p.capEau * COALESCE(tb.mult_eau, 1) AS capeau_effectif,
      p.capNrt * COALESCE(tb.mult_nrt, 1) AS capnrt_effectif,
      p.capMed AS capmed_effectif,
      p.capMat * COALESCE(tb.mult_mat, 1) AS capmat_effectif,
      p.capart * COALESCE(tb.mult_art, 1) AS capart_effectif,
      COALESCE(pw.total_poids, 0) AS poids_total,
      p.cmd,
      p.combat,
      p.group_id,
      pa.arme_id AS equipped_arme_id,
      ps.sac_id AS equipped_sac_id,
      p.combat * COALESCE(a.att, 1) AS combat_effectif
     FROM persos AS p
     LEFT JOIN perso_armes AS pa
       ON pa.perso_id = p.id AND pa.equipee = true
     LEFT JOIN armes AS a
       ON a.id = pa.arme_id
     LEFT JOIN perso_sacs AS ps
       ON ps.perso_id = p.id AND ps.equipe = true
     LEFT JOIN sacs AS s
       ON s.id = ps.sac_id
     LEFT JOIN (
       SELECT
         po.perso_id,
         CASE
           WHEN COUNT(*) FILTER (WHERE o.specialite = 'eau' AND o.bonus = 0) > 0 THEN 0
           ELSE COALESCE(
             EXP(SUM(CASE WHEN o.specialite = 'eau' AND o.bonus > 0 THEN LN(o.bonus) END)),
             1
           )
         END AS mult_eau,
         CASE
           WHEN COUNT(*) FILTER (WHERE o.specialite = 'nrt' AND o.bonus = 0) > 0 THEN 0
           ELSE COALESCE(
             EXP(SUM(CASE WHEN o.specialite = 'nrt' AND o.bonus > 0 THEN LN(o.bonus) END)),
             1
           )
         END AS mult_nrt,
         CASE
           WHEN COUNT(*) FILTER (WHERE o.specialite = 'mat' AND o.bonus = 0) > 0 THEN 0
           ELSE COALESCE(
             EXP(SUM(CASE WHEN o.specialite = 'mat' AND o.bonus > 0 THEN LN(o.bonus) END)),
             1
           )
         END AS mult_mat,
         CASE
           WHEN COUNT(*) FILTER (WHERE o.specialite = 'art' AND o.bonus = 0) > 0 THEN 0
           ELSE COALESCE(
             EXP(SUM(CASE WHEN o.specialite = 'art' AND o.bonus > 0 THEN LN(o.bonus) END)),
             1
           )
         END AS mult_art
       FROM perso_outils AS po
       JOIN outils AS o ON o.id = po.outil_id
       GROUP BY po.perso_id
     ) AS tb
       ON tb.perso_id = p.id
     LEFT JOIN (
       SELECT carried.perso_id, SUM(carried.poids) AS total_poids
       FROM (
         SELECT pa2.perso_id, COALESCE(a2.poids, 0) AS poids
         FROM perso_armes AS pa2
         JOIN armes AS a2 ON a2.id = pa2.arme_id
         UNION ALL
         SELECT po2.perso_id, COALESCE(o2.poids, 0) AS poids
         FROM perso_outils AS po2
         JOIN outils AS o2 ON o2.id = po2.outil_id
         UNION ALL
         SELECT ps2.perso_id, COALESCE(s2.poids, 0) AS poids
         FROM perso_sacs AS ps2
         JOIN sacs AS s2 ON s2.id = ps2.sac_id
         UNION ALL
         SELECT
           pr2.perso_id,
           CASE
             WHEN r2.code = 'crd' THEN 0
             ELSE GREATEST(COALESCE(pr2.quantity, 0), 0)
           END AS poids
         FROM perso_resources AS pr2
         JOIN resources AS r2 ON r2.id = pr2.resource_id
       ) AS carried
       GROUP BY carried.perso_id
     ) AS pw
       ON pw.perso_id = p.id
     ORDER BY p.id ASC`,
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
    armes,
    persoArmes,
    outils,
    persoOutils,
    sacs,
    persoSacs,
  };
};

const insertState = async (state) => {
  const persos = Array.isArray(state.persos) ? state.persos : [];
  const lunes = Array.isArray(state.lunes) ? state.lunes : [];
  const stocks = { ...defaultStocks, ...(state.stocks || {}) };
  const groups = Array.isArray(state.groups) ? state.groups : null;
  const armes = Array.isArray(state.armes) ? state.armes : null;
  const persoArmes = Array.isArray(state.persoArmes) ? state.persoArmes : null;
  const outils = Array.isArray(state.outils) ? state.outils : null;
  const persoOutils = Array.isArray(state.persoOutils)
    ? state.persoOutils
    : null;
  const sacs = Array.isArray(state.sacs) ? state.sacs : null;
  const persoSacs = Array.isArray(state.persoSacs) ? state.persoSacs : null;
  const persoResources = Array.isArray(state.persoResources)
    ? state.persoResources
    : null;

  const persosById = new Map();
  for (const p of persos) {
    const id = Number(p.id);
    if (!Number.isFinite(id)) continue;
    persosById.set(id, {
      id,
      nom: p.nom,
      pvmax: normalizeNonNegativeNumber(p.pvmax ?? p.pvBase),
      pv: normalizeNonNegativeNumber(p.pv ?? p.pvmax ?? p.pvBase),
      poidsmax: normalizeNonNegativeNumber(p.poidsMax ?? 20),
      capeau: normalizeNumber(p.capEau),
      capnrt: normalizeNumber(p.capNrt),
      capmed: normalizeNumber(p.capMed),
      capmat: normalizeNumber(p.capMat),
      capart: normalizeNumber(p.capart),
      cmd: normalizeNumber(p.cmd),
      combat: normalizeNumber(p.combat),
      group_id: normalizeOptionalId(p.groupId),
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

  const { groupsPayload, groupIds } = buildGroupsPayload(groups, persosPayload);

  const armesPayload =
    armes?.map((arme) => ({
      id: Number(arme.id),
      name: arme.name || "Arme sans nom",
      att: normalizeNumber(arme.att || 1),
      degats: normalizeNumber(arme.degats),
      fiabilite: normalizeNumber(arme.fiabilite),
      pv: normalizeNumber(arme.pv),
      pvm: normalizeNumber(arme.pvm),
      poids: normalizeNumber(arme.poids),
      quantity: normalizeWeaponQuantity(arme.quantity),
    })) || null;
  const armeIds =
    armesPayload?.map((arme) => arme.id).filter(Number.isFinite) || [];

  const outilsPayload =
    outils?.map((outil) => ({
      id: Number(outil.id),
      name: outil.name || "Outil sans nom",
      specialite: normalizeToolSpecialite(outil.specialite),
      bonus: normalizeNonNegativeNumber(outil.bonus ?? 1),
      pv: normalizeNonNegativeNumber(outil.pv),
      pvmax: normalizeNonNegativeNumber(outil.pvmax),
      poids: normalizeNonNegativeNumber(outil.poids),
      quantity: normalizeWeaponQuantity(outil.quantity),
    })) || null;
  const outilIds =
    outilsPayload?.map((outil) => outil.id).filter(Number.isFinite) || [];

  const sacsPayload =
    sacs?.map((sac) => ({
      id: Number(sac.id),
      name: sac.name || "Sac sans nom",
      pv: normalizeNonNegativeNumber(sac.pv),
      pvmax: normalizeNonNegativeNumber(sac.pvmax),
      poids: normalizeNonNegativeNumber(sac.poids),
      capacite: normalizeNonNegativeNumber(sac.capacite),
      quantity: normalizeWeaponQuantity(sac.quantity),
    })) || null;
  const sacIds =
    sacsPayload?.map((sac) => sac.id).filter(Number.isFinite) || [];

  const persoArmesPayload =
    persoArmes?.map((entry) => ({
      perso_id: Number(entry.perso_id),
      arme_id: Number(entry.arme_id),
      equipee: Boolean(entry.equipee),
    })) || null;

  if (persoArmesPayload) {
    const equippedByPerso = new Map();
    const assignedByArme = new Map();
    const quantityByArme = new Map(
      (armesPayload || []).map((arme) => [arme.id, arme.quantity]),
    );

    for (const entry of persoArmesPayload) {
      const availableQuantity = quantityByArme.get(entry.arme_id);
      if (availableQuantity === undefined) {
        throw new Error(`L'arme ${entry.arme_id} est introuvable.`);
      }

      const assignedCount = (assignedByArme.get(entry.arme_id) || 0) + 1;
      assignedByArme.set(entry.arme_id, assignedCount);
      if (assignedCount > availableQuantity) {
        throw new Error(
          `L'arme ${entry.arme_id} dépasse la quantité disponible (${availableQuantity}).`,
        );
      }

      if (!entry.equipee) continue;
      const equippedCount = (equippedByPerso.get(entry.perso_id) || 0) + 1;
      equippedByPerso.set(entry.perso_id, equippedCount);
      if (equippedCount > 1) {
        throw new Error(
          `Le perso ${entry.perso_id} ne peut équiper qu'une seule arme à la fois`,
        );
      }
    }
  }

  const persoOutilsPayload =
    persoOutils?.map((entry) => ({
      perso_id: Number(entry.perso_id),
      outil_id: Number(entry.outil_id),
    })) || null;

  if (persoOutilsPayload) {
    const assignedByOutil = new Map();
    const quantityByOutil = new Map(
      (outilsPayload || []).map((outil) => [outil.id, outil.quantity]),
    );

    for (const entry of persoOutilsPayload) {
      const availableQuantity = quantityByOutil.get(entry.outil_id);
      if (availableQuantity === undefined) {
        throw new Error(`L'outil ${entry.outil_id} est introuvable.`);
      }

      const assignedCount = (assignedByOutil.get(entry.outil_id) || 0) + 1;
      assignedByOutil.set(entry.outil_id, assignedCount);
      if (assignedCount > availableQuantity) {
        throw new Error(
          `L'outil ${entry.outil_id} dépasse la quantité disponible (${availableQuantity}).`,
        );
      }
    }
  }

  const persoSacsPayload =
    persoSacs?.map((entry) => ({
      perso_id: Number(entry.perso_id),
      sac_id: Number(entry.sac_id),
      equipe: Boolean(entry.equipe),
    })) || null;

  if (persoSacsPayload) {
    const equippedByPerso = new Map();
    const assignedBySac = new Map();
    const quantityBySac = new Map(
      (sacsPayload || []).map((sac) => [sac.id, sac.quantity]),
    );

    for (const entry of persoSacsPayload) {
      const availableQuantity = quantityBySac.get(entry.sac_id);
      if (availableQuantity === undefined) {
        throw new Error(`Le sac ${entry.sac_id} est introuvable.`);
      }

      const assignedCount = (assignedBySac.get(entry.sac_id) || 0) + 1;
      assignedBySac.set(entry.sac_id, assignedCount);
      if (assignedCount > availableQuantity) {
        throw new Error(
          `Le sac ${entry.sac_id} dépasse la quantité disponible (${availableQuantity}).`,
        );
      }

      if (!entry.equipe) continue;
      const equippedCount = (equippedByPerso.get(entry.perso_id) || 0) + 1;
      equippedByPerso.set(entry.perso_id, equippedCount);
      if (equippedCount > 1) {
        throw new Error(
          `Le perso ${entry.perso_id} ne peut équiper qu'un seul sac à la fois`,
        );
      }
    }
  }

  const persoResourcesPayload =
    persoResources?.map((entry) => ({
      perso_id: Number(entry.perso_id),
      resource_id: Number(entry.resource_id),
      quantity: normalizeNonNegativeNumber(entry.quantity),
    })) || null;

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

    if (armesPayload !== null) {
      if (armesPayload.length > 0) {
        await client.query(
          `INSERT INTO armes (id, name, att, degats, fiabilite, pv, pvm, poids, quantity)
           SELECT id, name, att, degats, fiabilite, pv, pvm, poids, quantity
           FROM json_to_recordset($1::json) AS incoming(
             id integer,
             name text,
             att numeric,
             degats numeric,
             fiabilite numeric,
             pv numeric,
             pvm numeric,
             poids numeric,
             quantity integer
           )
           ON CONFLICT (id)
           DO UPDATE SET
             name = EXCLUDED.name,
             att = EXCLUDED.att,
             degats = EXCLUDED.degats,
             fiabilite = EXCLUDED.fiabilite,
             pv = EXCLUDED.pv,
             pvm = EXCLUDED.pvm,
             poids = EXCLUDED.poids,
             quantity = EXCLUDED.quantity`,
          [JSON.stringify(armesPayload)],
        );
      }

      if (armeIds.length > 0) {
        await client.query(
          "DELETE FROM armes WHERE NOT (id = ANY($1::int[]))",
          [armeIds],
        );
      } else {
        await client.query("DELETE FROM armes");
      }
    }

    if (outilsPayload !== null) {
      if (outilsPayload.length > 0) {
        await client.query(
          `INSERT INTO outils (id, name, specialite, bonus, pv, pvmax, poids, quantity)
           SELECT id, name, specialite, bonus, pv, pvmax, poids, quantity
           FROM json_to_recordset($1::json) AS incoming(
             id integer,
             name text,
             specialite text,
             bonus numeric,
             pv numeric,
             pvmax numeric,
             poids numeric,
             quantity integer
           )
           ON CONFLICT (id)
           DO UPDATE SET
             name = EXCLUDED.name,
             specialite = EXCLUDED.specialite,
             bonus = EXCLUDED.bonus,
             pv = EXCLUDED.pv,
             pvmax = EXCLUDED.pvmax,
             poids = EXCLUDED.poids,
             quantity = EXCLUDED.quantity`,
          [JSON.stringify(outilsPayload)],
        );
      }

      if (outilIds.length > 0) {
        await client.query(
          "DELETE FROM outils WHERE NOT (id = ANY($1::int[]))",
          [outilIds],
        );
      } else {
        await client.query("DELETE FROM outils");
      }
    }

    if (sacsPayload !== null) {
      if (sacsPayload.length > 0) {
        await client.query(
          `INSERT INTO sacs (id, name, pv, pvmax, poids, capacite, quantity)
           SELECT id, name, pv, pvmax, poids, capacite, quantity
           FROM json_to_recordset($1::json) AS incoming(
             id integer,
             name text,
             pv numeric,
             pvmax numeric,
             poids numeric,
             capacite numeric,
             quantity integer
           )
           ON CONFLICT (id)
           DO UPDATE SET
             name = EXCLUDED.name,
             pv = EXCLUDED.pv,
             pvmax = EXCLUDED.pvmax,
             poids = EXCLUDED.poids,
             capacite = EXCLUDED.capacite,
             quantity = EXCLUDED.quantity`,
          [JSON.stringify(sacsPayload)],
        );
      }

      if (sacIds.length > 0) {
        await client.query("DELETE FROM sacs WHERE NOT (id = ANY($1::int[]))", [
          sacIds,
        ]);
      } else {
        await client.query("DELETE FROM sacs");
      }
    }

    if (persosPayload.length > 0) {
      await client.query(
        `INSERT INTO persos (id, nom, pvmax, pv, poidsmax, capEau, capNrt, capMed, capMat, capart, cmd, combat, group_id)
         SELECT id, nom, pvmax, pv, poidsmax, capeau, capnrt, capmed, capmat, capart, cmd, combat, group_id
         FROM json_to_recordset($1::json) AS incoming(
           id integer,
           nom text,
           pvmax numeric,
           pv numeric,
           poidsmax numeric,
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
           pvmax = EXCLUDED.pvmax,
           pv = EXCLUDED.pv,
           poidsmax = EXCLUDED.poidsmax,
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

    if (persoArmesPayload !== null) {
      if (persoArmesPayload.length > 0) {
        await client.query(
          `INSERT INTO perso_armes (perso_id, arme_id, equipee)
           SELECT perso_id, arme_id, equipee
           FROM json_to_recordset($1::json) AS incoming(
             perso_id integer,
             arme_id integer,
             equipee boolean
           )
           ON CONFLICT (perso_id, arme_id)
           DO UPDATE SET equipee = EXCLUDED.equipee`,
          [JSON.stringify(persoArmesPayload)],
        );

        await client.query(
          `DELETE FROM perso_armes AS pa
           WHERE NOT EXISTS (
             SELECT 1
             FROM json_to_recordset($1::json) AS incoming(
               perso_id integer,
               arme_id integer,
               equipee boolean
             )
             WHERE incoming.perso_id = pa.perso_id
               AND incoming.arme_id = pa.arme_id
           )`,
          [JSON.stringify(persoArmesPayload)],
        );
      } else {
        await client.query("DELETE FROM perso_armes");
      }
    }

    if (persoOutilsPayload !== null) {
      if (persoOutilsPayload.length > 0) {
        await client.query(
          `INSERT INTO perso_outils (perso_id, outil_id)
           SELECT perso_id, outil_id
           FROM json_to_recordset($1::json) AS incoming(
             perso_id integer,
             outil_id integer
           )
           ON CONFLICT (perso_id, outil_id)
           DO NOTHING`,
          [JSON.stringify(persoOutilsPayload)],
        );

        await client.query(
          `DELETE FROM perso_outils AS po
           WHERE NOT EXISTS (
             SELECT 1
             FROM json_to_recordset($1::json) AS incoming(
               perso_id integer,
               outil_id integer
             )
             WHERE incoming.perso_id = po.perso_id
               AND incoming.outil_id = po.outil_id
           )`,
          [JSON.stringify(persoOutilsPayload)],
        );
      } else {
        await client.query("DELETE FROM perso_outils");
      }
    }

    if (persoSacsPayload !== null) {
      if (persoSacsPayload.length > 0) {
        await client.query(
          `INSERT INTO perso_sacs (perso_id, sac_id, equipe)
           SELECT perso_id, sac_id, equipe
           FROM json_to_recordset($1::json) AS incoming(
             perso_id integer,
             sac_id integer,
             equipe boolean
           )
           ON CONFLICT (perso_id, sac_id)
           DO UPDATE SET equipe = EXCLUDED.equipe`,
          [JSON.stringify(persoSacsPayload)],
        );

        await client.query(
          `DELETE FROM perso_sacs AS ps
           WHERE NOT EXISTS (
             SELECT 1
             FROM json_to_recordset($1::json) AS incoming(
               perso_id integer,
               sac_id integer,
               equipe boolean
             )
             WHERE incoming.perso_id = ps.perso_id
               AND incoming.sac_id = ps.sac_id
           )`,
          [JSON.stringify(persoSacsPayload)],
        );
      } else {
        await client.query("DELETE FROM perso_sacs");
      }
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

    if (persoResourcesPayload !== null) {
      if (persoResourcesPayload.length > 0) {
        await client.query(
          `INSERT INTO perso_resources (perso_id, resource_id, quantity)
           SELECT perso_id, resource_id, quantity
           FROM json_to_recordset($1::json) AS incoming(
             perso_id integer,
             resource_id integer,
             quantity numeric
           )
           ON CONFLICT (perso_id, resource_id)
           DO UPDATE SET quantity = EXCLUDED.quantity`,
          [JSON.stringify(persoResourcesPayload)],
        );

        await client.query(
          `DELETE FROM perso_resources AS pr
           WHERE NOT EXISTS (
             SELECT 1
             FROM json_to_recordset($1::json) AS incoming(
               perso_id integer,
               resource_id integer,
               quantity numeric
             )
             WHERE incoming.perso_id = pr.perso_id
               AND incoming.resource_id = pr.resource_id
           )`,
          [JSON.stringify(persoResourcesPayload)],
        );
      } else {
        await client.query("DELETE FROM perso_resources");
      }
    }

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
      pvmax numeric NOT NULL DEFAULT 0,
      pv numeric NOT NULL DEFAULT 0,
      poidsmax numeric NOT NULL DEFAULT 20,
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

    CREATE TABLE IF NOT EXISTS armes (
      id integer PRIMARY KEY,
      name text NOT NULL,
      att numeric NOT NULL DEFAULT 1,
      degats numeric NOT NULL DEFAULT 0,
      fiabilite numeric NOT NULL DEFAULT 100,
      pv numeric NOT NULL DEFAULT 0,
      pvm numeric NOT NULL DEFAULT 0,
      poids numeric NOT NULL DEFAULT 0,
      quantity integer NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS perso_armes (
      perso_id integer REFERENCES persos(id) ON DELETE CASCADE,
      arme_id integer REFERENCES armes(id) ON DELETE CASCADE,
      equipee boolean NOT NULL DEFAULT false,
      PRIMARY KEY (perso_id, arme_id)
    );

    CREATE TABLE IF NOT EXISTS outils (
      id integer PRIMARY KEY,
      name text NOT NULL,
      specialite text NOT NULL,
      bonus numeric NOT NULL DEFAULT 1,
      pv numeric NOT NULL DEFAULT 0,
      pvmax numeric NOT NULL DEFAULT 0,
      poids numeric NOT NULL DEFAULT 0,
      quantity integer NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS perso_outils (
      perso_id integer REFERENCES persos(id) ON DELETE CASCADE,
      outil_id integer REFERENCES outils(id) ON DELETE CASCADE,
      PRIMARY KEY (perso_id, outil_id)
    );

    CREATE TABLE IF NOT EXISTS sacs (
      id integer PRIMARY KEY,
      name text NOT NULL,
      pv numeric NOT NULL DEFAULT 0,
      pvmax numeric NOT NULL DEFAULT 0,
      poids numeric NOT NULL DEFAULT 0,
      capacite numeric NOT NULL DEFAULT 0,
      quantity integer NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS perso_sacs (
      perso_id integer REFERENCES persos(id) ON DELETE CASCADE,
      sac_id integer REFERENCES sacs(id) ON DELETE CASCADE,
      equipe boolean NOT NULL DEFAULT false,
      PRIMARY KEY (perso_id, sac_id)
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

  const { rows: legacyPvBaseColumn } = await pool.query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_name = 'persos' AND column_name = 'pvbase'
     LIMIT 1`,
  );
  if (legacyPvBaseColumn.length > 0) {
    await pool.query(`ALTER TABLE persos RENAME COLUMN pvbase TO pvmax`);
  }

  await pool.query(
    `ALTER TABLE persos ADD COLUMN IF NOT EXISTS pvmax numeric NOT NULL DEFAULT 0`,
  );

  await pool.query(
    `ALTER TABLE persos ADD COLUMN IF NOT EXISTS pv numeric NOT NULL DEFAULT 0`,
  );

  await pool.query(
    `ALTER TABLE persos ADD COLUMN IF NOT EXISTS poidsmax numeric NOT NULL DEFAULT 20`,
  );

  await pool.query(
    `UPDATE persos
     SET pvmax = GREATEST(COALESCE(pvmax, 0), 0),
         pv = GREATEST(COALESCE(pv, pvmax, 0), 0),
         poidsmax = GREATEST(COALESCE(poidsmax, 20), 0)`,
  );

  const { rows: existingPvmaxCheckConstraint } = await pool.query(
    "SELECT conname FROM pg_constraint WHERE conname = 'persos_pvmax_non_negative_check' LIMIT 1",
  );
  if (existingPvmaxCheckConstraint.length === 0) {
    await pool.query(
      "ALTER TABLE persos ADD CONSTRAINT persos_pvmax_non_negative_check CHECK (pvmax >= 0)",
    );
  }

  const { rows: existingPvCheckConstraint } = await pool.query(
    "SELECT conname FROM pg_constraint WHERE conname = 'persos_pv_non_negative_check' LIMIT 1",
  );
  if (existingPvCheckConstraint.length === 0) {
    await pool.query(
      "ALTER TABLE persos ADD CONSTRAINT persos_pv_non_negative_check CHECK (pv >= 0)",
    );
  }

  const { rows: existingPoidsMaxCheckConstraint } = await pool.query(
    "SELECT conname FROM pg_constraint WHERE conname = 'persos_poidsmax_non_negative_check' LIMIT 1",
  );
  if (existingPoidsMaxCheckConstraint.length === 0) {
    await pool.query(
      "ALTER TABLE persos ADD CONSTRAINT persos_poidsmax_non_negative_check CHECK (poidsmax >= 0)",
    );
  }

  await Promise.all(
    stockFields.map((field) =>
      pool.query(
        "INSERT INTO resources (code, name) VALUES ($1, $2) ON CONFLICT (code) DO NOTHING",
        [field, field.toUpperCase()],
      ),
    ),
  );

  await pool.query(
    `ALTER TABLE armes ADD COLUMN IF NOT EXISTS quantity integer NOT NULL DEFAULT 1`,
  );

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

  const { rows: existingArmesQuantityCheckConstraint } = await pool.query(
    "SELECT conname FROM pg_constraint WHERE conname = 'armes_quantity_non_negative_check' LIMIT 1",
  );
  if (existingArmesQuantityCheckConstraint.length === 0) {
    await pool.query(
      "ALTER TABLE armes ADD CONSTRAINT armes_quantity_non_negative_check CHECK (quantity >= 0)",
    );
  }

  await pool.query(
    `ALTER TABLE outils ADD COLUMN IF NOT EXISTS specialite text NOT NULL DEFAULT 'eau'`,
  );
  await pool.query(
    `ALTER TABLE outils ADD COLUMN IF NOT EXISTS bonus numeric NOT NULL DEFAULT 1`,
  );

  await pool.query(`ALTER TABLE outils ALTER COLUMN bonus SET DEFAULT 1`);
  await pool.query(
    `ALTER TABLE outils ADD COLUMN IF NOT EXISTS pv numeric NOT NULL DEFAULT 0`,
  );
  await pool.query(
    `ALTER TABLE outils ADD COLUMN IF NOT EXISTS pvmax numeric NOT NULL DEFAULT 0`,
  );
  await pool.query(
    `ALTER TABLE outils ADD COLUMN IF NOT EXISTS poids numeric NOT NULL DEFAULT 0`,
  );
  await pool.query(
    `ALTER TABLE outils ADD COLUMN IF NOT EXISTS quantity integer NOT NULL DEFAULT 1`,
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

  const { rows: existingOutilsQuantityCheckConstraint } = await pool.query(
    "SELECT conname FROM pg_constraint WHERE conname = 'outils_quantity_non_negative_check' LIMIT 1",
  );
  if (existingOutilsQuantityCheckConstraint.length === 0) {
    await pool.query(
      "ALTER TABLE outils ADD CONSTRAINT outils_quantity_non_negative_check CHECK (quantity >= 0)",
    );
  }

  await pool.query(
    `ALTER TABLE sacs ADD COLUMN IF NOT EXISTS pv numeric NOT NULL DEFAULT 0`,
  );
  await pool.query(
    `ALTER TABLE sacs ADD COLUMN IF NOT EXISTS pvmax numeric NOT NULL DEFAULT 0`,
  );
  await pool.query(
    `ALTER TABLE sacs ADD COLUMN IF NOT EXISTS poids numeric NOT NULL DEFAULT 0`,
  );
  await pool.query(
    `ALTER TABLE sacs ADD COLUMN IF NOT EXISTS capacite numeric NOT NULL DEFAULT 0`,
  );
  await pool.query(
    `ALTER TABLE sacs ADD COLUMN IF NOT EXISTS quantity integer NOT NULL DEFAULT 1`,
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

  const { rows: existingSacsQuantityCheckConstraint } = await pool.query(
    "SELECT conname FROM pg_constraint WHERE conname = 'sacs_quantity_non_negative_check' LIMIT 1",
  );
  if (existingSacsQuantityCheckConstraint.length === 0) {
    await pool.query(
      "ALTER TABLE sacs ADD CONSTRAINT sacs_quantity_non_negative_check CHECK (quantity >= 0)",
    );
  }

  await pool.query(
    "CREATE UNIQUE INDEX IF NOT EXISTS perso_une_arme_equipee_idx ON perso_armes (perso_id) WHERE equipee = true",
  );

  await pool.query(
    "CREATE UNIQUE INDEX IF NOT EXISTS perso_un_sac_equipe_idx ON perso_sacs (perso_id) WHERE equipe = true",
  );

  await pool.query("ALTER TABLE groups ALTER COLUMN chef DROP NOT NULL");

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
      "INSERT INTO persos (id, nom, pvmax, pv, poidsmax, capEau, capNrt, capMed, capMat, capart, cmd, combat, group_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)",
      [
        defaultPersos[0].id,
        defaultPersos[0].nom,
        defaultPersos[0].pvmax,
        defaultPersos[0].pv,
        defaultPersos[0].poidsMax,
        defaultPersos[0].capEau,
        defaultPersos[0].capNrt,
        defaultPersos[0].capMed,
        defaultPersos[0].capMat,
        defaultPersos[0].capart,
        defaultPersos[0].cmd,
        defaultPersos[0].combat,
        defaultPersos[0].groupId,
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

  const { rows: existingGroupLeaderConstraint } = await pool.query(
    "SELECT conname FROM pg_constraint WHERE conname = 'groups_group_id_chef_fkey' LIMIT 1",
  );
  if (existingGroupLeaderConstraint.length === 0) {
    await pool.query(
      "ALTER TABLE groups ADD CONSTRAINT groups_group_id_chef_fkey FOREIGN KEY (group_id, chef) REFERENCES persos(group_id, id) DEFERRABLE INITIALLY DEFERRED",
    );
  }

  await pool.query("ALTER TABLE groups ALTER COLUMN chef DROP NOT NULL");

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
