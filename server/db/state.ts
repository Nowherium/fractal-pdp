import {
  buildGroupsPayload,
  buildLunes,
  buildStocksPayload,
  defaultCity,
  defaultCityMultipliers,
  defaultCurrentLune,
  defaultStocks,
  getNextPersoId,
  normalizeArmeRow,
  normalizeBoolean,
  normalizeConstructionPlacements,
  normalizeCurrentLuneValue,
  normalizeMultiplier,
  normalizeNonNegativeNumber,
  normalizeNumber,
  normalizeOptionalId,
  normalizeOutilRow,
  normalizePersoArmeRow,
  normalizePersoOutilRow,
  normalizePersoRow,
  normalizePersoSacRow,
  normalizeResourceCode,
  normalizeResourceName,
  normalizeSacRow,
  normalizeToolSpecialite,
  normalizeWeatherCoefficients,
  normalizeWeaponQuantity,
  pool,
} from "./shared";

type GenericInput = {
  resources?: unknown;
  persos?: unknown;
  lunes?: unknown;
  stocks?: unknown;
  cityMultipliers?: unknown;
  constructions?: unknown;
  currentLune?: unknown;
  groups?: unknown;
  armes?: unknown;
  persoArmes?: unknown;
  persoOutils?: unknown;
  persoSacs?: unknown;
  persoResources?: unknown;
  outils?: unknown;
  sacs?: unknown;
  id?: unknown;
  code?: unknown;
  name?: unknown;
  nom?: unknown;
  present?: unknown;
  pvmax?: unknown;
  pv?: unknown;
  poidsMax?: unknown;
  capEau?: unknown;
  capNrt?: unknown;
  capMed?: unknown;
  capMat?: unknown;
  capart?: unknown;
  cmd?: unknown;
  combat?: unknown;
  groupId?: unknown;
  meteo?: unknown;
  constructionPlacements?: unknown;
  placedConstructionIds?: unknown;
  rations?: unknown;
  overrides?: unknown;
  specialite?: unknown;
  bonus?: unknown;
  pvm?: unknown;
  poids?: unknown;
  quantity?: unknown;
  capacite?: unknown;
  perso_id?: unknown;
  arme_id?: unknown;
  equipee?: unknown;
  outil_id?: unknown;
  sac_id?: unknown;
  equipe?: unknown;
  resource_id?: unknown;
  eau?: unknown;
  nrt?: unknown;
  med?: unknown;
  mat?: unknown;
  rewardType?: unknown;
  resourceCode?: unknown;
  att?: unknown;
  degats?: unknown;
  fiabilite?: unknown;
} & Record<string, unknown>;
type CityMultiplierInput = {
  eau?: unknown;
  nrt?: unknown;
  med?: unknown;
  mat?: unknown;
} & Record<string, unknown>;
type LuneRationInput = {
  eau?: unknown;
  nrt?: unknown;
  med?: unknown;
  tache?: unknown;
  drogue?: unknown;
  constructionId?: unknown;
};

const asGenericInputArray = (value: unknown): GenericInput[] | null =>
  Array.isArray(value) ? (value as GenericInput[]) : null;

const asUnknownRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;

const normalizeLuneMeteoInput = (value: unknown) =>
  normalizeWeatherCoefficients(
    typeof value === "number" || typeof value === "string"
      ? value
      : value && typeof value === "object"
        ? (value as Record<string, unknown>)
        : {},
  );

const normalizeLuneConstructionPayload = (
  lune: GenericInput,
  luneId: number,
) => {
  if (Array.isArray(lune.constructionPlacements)) {
    return normalizeConstructionPlacements(lune.constructionPlacements, luneId);
  }

  if (Array.isArray(lune.placedConstructionIds)) {
    return normalizeConstructionPlacements(lune.placedConstructionIds, luneId);
  }

  return [];
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
    "SELECT id, name, mult_eau, mult_nrt, mult_med, mult_mat, current_lune, constructions FROM cities ORDER BY id ASC",
  );
  const cities = cityRows.map((row) => ({
    id: Number(row.id),
    name: row.name,
  }));
  const activeCity = cityRows[0];
  const cityMultipliers = {
    eau: normalizeMultiplier(activeCity?.mult_eau, defaultCityMultipliers.eau),
    nrt: normalizeMultiplier(activeCity?.mult_nrt, defaultCityMultipliers.nrt),
    med: normalizeMultiplier(activeCity?.mult_med, defaultCityMultipliers.med),
    mat: normalizeMultiplier(activeCity?.mult_mat, defaultCityMultipliers.mat),
  };
  const currentLune = normalizeCurrentLuneValue(
    activeCity?.current_lune,
    defaultCurrentLune,
  );
  let constructions = Array.isArray(activeCity?.constructions)
    ? activeCity.constructions
    : [];

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
    stocks = { ...defaultStocks };
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
      p.present,
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
    "SELECT id, meteo, meteo_eau, meteo_nrt, meteo_med, meteo_mat, constructions FROM lunes ORDER BY id ASC",
  );
  const { rows: rationsRows } = await pool.query(
    "SELECT lune_id, perso_id, eau, nrt, med, tache, drogue, construction_id FROM rations",
  );
  const { rows: overridesRows } = await pool.query(
    "SELECT lune_id, perso_id, data FROM overrides",
  );

  const lunes = buildLunes(luneRows, rationsRows, overridesRows);
  if (constructions.length === 0) {
    constructions = luneRows.flatMap((row) =>
      Array.isArray(row.constructions)
        ? row.constructions.filter(
            (construction: GenericInput) =>
              construction &&
              typeof construction === "object" &&
              (construction.resourceCode || construction.rewardType),
          )
        : [],
    );
  }
  const nextPersoId = await getNextPersoId();

  return {
    stocks,
    persos,
    constructions,
    lunes,
    currentLune,
    nextPersoId,
    resources,
    cities,
    cityMultipliers,
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

const insertState = async (state: GenericInput) => {
  const resources = asGenericInputArray(state.resources);
  const persos = asGenericInputArray(state.persos);
  const lunes = asGenericInputArray(state.lunes);
  const stocks = asUnknownRecord(state.stocks)
    ? { ...defaultStocks, ...(asUnknownRecord(state.stocks) ?? {}) }
    : null;
  const cityMultipliers = asUnknownRecord(state.cityMultipliers)
    ? (asUnknownRecord(state.cityMultipliers) as CityMultiplierInput)
    : null;
  const constructions = Array.isArray(state.constructions)
    ? state.constructions
    : null;
  const currentLune = normalizeCurrentLuneValue(
    state.currentLune,
    defaultCurrentLune,
  );
  const groups = asGenericInputArray(state.groups);
  const armes = asGenericInputArray(state.armes);
  const persoArmes = asGenericInputArray(state.persoArmes);
  const outils = asGenericInputArray(state.outils);
  const persoOutils = asGenericInputArray(state.persoOutils);
  const sacs = asGenericInputArray(state.sacs);
  const persoSacs = asGenericInputArray(state.persoSacs);
  const persoResources = asGenericInputArray(state.persoResources);

  const resourcesPayload =
    resources?.map((resource: GenericInput, index: number) => ({
      id: Number(resource.id),
      code: normalizeResourceCode(resource.code, `res${index + 1}`),
      name: normalizeResourceName(
        resource.name,
        String(resource.code ?? `res${index + 1}`).toUpperCase(),
      ),
    })) || null;

  const citySettingsPayload =
    cityMultipliers || state.currentLune !== undefined || constructions !== null
      ? {
          eau: normalizeMultiplier(
            cityMultipliers?.eau,
            defaultCityMultipliers.eau,
          ),
          nrt: normalizeMultiplier(
            cityMultipliers?.nrt,
            defaultCityMultipliers.nrt,
          ),
          med: normalizeMultiplier(
            cityMultipliers?.med,
            defaultCityMultipliers.med,
          ),
          mat: normalizeMultiplier(
            cityMultipliers?.mat,
            defaultCityMultipliers.mat,
          ),
          current_lune: currentLune,
          constructions: Array.isArray(constructions) ? constructions : [],
        }
      : null;

  const persosById = new Map();
  for (const p of persos || []) {
    const id = Number(p.id);
    if (!Number.isFinite(id)) continue;
    persosById.set(id, {
      id,
      nom: p.nom,
      present: normalizeBoolean(p.present, true),
      pvmax: normalizeNonNegativeNumber(p.pvmax),
      pv: normalizeNonNegativeNumber(p.pv ?? p.pvmax),
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
  const persosPayload = persos ? Array.from(persosById.values()) : null;
  const persoIds = persosPayload?.map((p) => p.id) || [];

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
  for (const lune of lunes || []) {
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

    const rations =
      lune.rations && typeof lune.rations === "object"
        ? (lune.rations as Record<string, LuneRationInput>)
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
  const lunesPayload = lunes ? Array.from(lunesById.values()) : null;
  const luneIds = lunesPayload?.map((lune) => lune.id) || [];

  const { groupsPayload, groupIds } = buildGroupsPayload(groups, persosPayload);

  const armesPayload =
    armes?.map((arme: GenericInput) => ({
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
    outils?.map((outil: GenericInput) => ({
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
    sacs?.map((sac: GenericInput) => ({
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
    persoArmes?.map((entry: GenericInput) => ({
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
      if (!quantityByArme.has(entry.arme_id)) {
        throw new Error(`L'arme ${entry.arme_id} est introuvable.`);
      }

      const availableQuantity = Number(quantityByArme.get(entry.arme_id) ?? 0);
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
    persoOutils?.map((entry: GenericInput) => ({
      perso_id: Number(entry.perso_id),
      outil_id: Number(entry.outil_id),
    })) || null;

  if (persoOutilsPayload) {
    const assignedByOutil = new Map();
    const quantityByOutil = new Map(
      (outilsPayload || []).map((outil) => [outil.id, outil.quantity]),
    );

    for (const entry of persoOutilsPayload) {
      if (!quantityByOutil.has(entry.outil_id)) {
        throw new Error(`L'outil ${entry.outil_id} est introuvable.`);
      }

      const availableQuantity = Number(
        quantityByOutil.get(entry.outil_id) ?? 0,
      );
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
    persoSacs?.map((entry: GenericInput) => ({
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
      if (!quantityBySac.has(entry.sac_id)) {
        throw new Error(`Le sac ${entry.sac_id} est introuvable.`);
      }

      const availableQuantity = Number(quantityBySac.get(entry.sac_id) ?? 0);
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
    persoResources?.map((entry: GenericInput) => ({
      perso_id: Number(entry.perso_id),
      resource_id: Number(entry.resource_id),
      quantity: normalizeNonNegativeNumber(entry.quantity),
    })) || null;

  const stocksPayload = stocks ? buildStocksPayload(stocks) : null;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    if (resourcesPayload !== null && resourcesPayload.length > 0) {
      await client.query(
        `INSERT INTO resources (id, code, name)
         SELECT id, code, name
         FROM json_to_recordset($1::json) AS incoming(
           id integer,
           code text,
           name text
         )
         ON CONFLICT (id)
         DO UPDATE SET
           code = EXCLUDED.code,
           name = EXCLUDED.name`,
        [JSON.stringify(resourcesPayload)],
      );
    }

    if (citySettingsPayload !== null) {
      await client.query(
        `INSERT INTO cities (id, name, mult_eau, mult_nrt, mult_med, mult_mat, current_lune, constructions)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id)
         DO UPDATE SET
           name = EXCLUDED.name,
           mult_eau = EXCLUDED.mult_eau,
           mult_nrt = EXCLUDED.mult_nrt,
           mult_med = EXCLUDED.mult_med,
           mult_mat = EXCLUDED.mult_mat,
           current_lune = EXCLUDED.current_lune,
           constructions = EXCLUDED.constructions`,
        [
          defaultCity.id,
          defaultCity.name,
          citySettingsPayload.eau,
          citySettingsPayload.nrt,
          citySettingsPayload.med,
          citySettingsPayload.mat,
          citySettingsPayload.current_lune,
          JSON.stringify(citySettingsPayload.constructions || []),
        ],
      );
    }

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

    if (persosPayload !== null) {
      if (persosPayload.length > 0) {
        await client.query(
          `INSERT INTO persos (id, nom, present, pvmax, pv, poidsmax, capEau, capNrt, capMed, capMat, capart, cmd, combat, group_id)
           SELECT id, nom, present, pvmax, pv, poidsmax, capeau, capnrt, capmed, capmat, capart, cmd, combat, group_id
           FROM json_to_recordset($1::json) AS incoming(
             id integer,
             nom text,
             present boolean,
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
             present = EXCLUDED.present,
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
        await client.query(
          "DELETE FROM persos WHERE NOT (id = ANY($1::int[]))",
          [persoIds],
        );
      } else {
        await client.query("DELETE FROM persos");
      }
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

    if (lunesPayload !== null) {
      if (lunesPayload.length > 0) {
        await client.query(
          `INSERT INTO lunes (id, meteo_eau, meteo_nrt, meteo_med, meteo_mat, constructions)
           SELECT id, meteo_eau, meteo_nrt, meteo_med, meteo_mat, constructions
           FROM json_to_recordset($1::json) AS incoming(
             id bigint,
             meteo_eau numeric,
             meteo_nrt numeric,
             meteo_med numeric,
             meteo_mat numeric,
             constructions jsonb
           )
           ON CONFLICT (id)
           DO UPDATE SET
             meteo_eau = EXCLUDED.meteo_eau,
             meteo_nrt = EXCLUDED.meteo_nrt,
             meteo_med = EXCLUDED.meteo_med,
             meteo_mat = EXCLUDED.meteo_mat,
             constructions = EXCLUDED.constructions`,
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
           )
           ON CONFLICT (lune_id, perso_id)
           DO UPDATE SET
             eau = EXCLUDED.eau,
             nrt = EXCLUDED.nrt,
             med = EXCLUDED.med,
             tache = EXCLUDED.tache,
             drogue = EXCLUDED.drogue,
             construction_id = EXCLUDED.construction_id`,
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
    }

    if (stocksPayload !== null) {
      await client.query(
        `INSERT INTO city_resources (city_id, resource_id, quantity)
         SELECT $1, r.id, incoming.quantity
         FROM json_to_recordset($2::json) AS incoming(code text, quantity numeric)
         JOIN resources AS r ON r.code = incoming.code
         ON CONFLICT (city_id, resource_id)
         DO UPDATE SET quantity = EXCLUDED.quantity`,
        [defaultCity.id, JSON.stringify(stocksPayload)],
      );
    }

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

    if (persosPayload !== null || persoResourcesPayload !== null) {
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
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export { getState, insertState };
