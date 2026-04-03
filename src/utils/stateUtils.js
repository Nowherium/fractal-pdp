export const defaultStocks = {};

export const defaultCityMultipliers = {
  eau: 1,
  nrt: 1,
  med: 1,
  mat: 1,
};

export const defaultWeatherCoefficient = 1;
export const defaultWeatherCoefficients = {
  eau: defaultWeatherCoefficient,
  nrt: defaultWeatherCoefficient,
  med: defaultWeatherCoefficient,
  mat: defaultWeatherCoefficient,
};

const normalizeCityMultiplierValue = (value) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? Math.max(0, numericValue) : 1;
};

export const normalizeCityMultipliers = (cityMultipliers = {}) => ({
  eau: normalizeCityMultiplierValue(cityMultipliers.eau),
  nrt: normalizeCityMultiplierValue(cityMultipliers.nrt),
  med: normalizeCityMultiplierValue(cityMultipliers.med),
  mat: normalizeCityMultiplierValue(cityMultipliers.mat),
});

export const normalizeWeatherCoefficient = (value) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return defaultWeatherCoefficient;
  return Math.min(1, Math.max(0, numericValue));
};

export const normalizeWeatherCoefficients = (value) => {
  if (typeof value === "number" || typeof value === "string") {
    const coefficient = normalizeWeatherCoefficient(value);
    return {
      eau: coefficient,
      nrt: coefficient,
      med: coefficient,
      mat: coefficient,
    };
  }

  const source = value && typeof value === "object" ? value : {};
  return {
    eau: normalizeWeatherCoefficient(source.eau),
    nrt: normalizeWeatherCoefficient(source.nrt),
    med: normalizeWeatherCoefficient(source.med),
    mat: normalizeWeatherCoefficient(source.mat),
  };
};

export const defaultRation = () => ({
  eau: true,
  nrt: true,
  med: true,
  tache: "",
  drogue: null,
  constructionId: null,
});

const constructionRewardTypes = new Set([
  "eau",
  "nrt",
  "med",
  "mat",
  "art",
  "combat",
]);

export const normalizeLuneConstructions = (constructions = []) =>
  (Array.isArray(constructions) ? constructions : []).map(
    (construction, index) => ({
      id: String(construction?.id ?? `construction-${index + 1}`),
      name: String(construction?.name ?? `Construction ${index + 1}`),
      resourceCode: String(construction?.resourceCode ?? "mat")
        .trim()
        .toLowerCase(),
      resourceCost: Math.max(0, Number(construction?.resourceCost ?? 0) || 0),
      buildersRequired: Math.max(
        1,
        Math.floor(Number(construction?.buildersRequired ?? 1) || 1),
      ),
      rewardType: constructionRewardTypes.has(construction?.rewardType)
        ? construction.rewardType
        : "mat",
      status:
        construction?.status === "done" ||
        construction?.status === "in-progress" ||
        construction?.status === "todo"
          ? construction.status
          : "todo",
    }),
  );

export const syncConstructionStatusesWithLunes = (
  constructions = [],
  lunes = [],
) => {
  const placedConstructionIds = new Set(
    (Array.isArray(lunes) ? lunes : []).flatMap((lune) =>
      (Array.isArray(lune?.placedConstructionIds)
        ? lune.placedConstructionIds
        : []
      )
        .map((constructionId) => String(constructionId))
        .filter(Boolean),
    ),
  );

  return normalizeLuneConstructions(constructions).map((construction) => {
    if (construction.status === "done") {
      return construction;
    }

    return {
      ...construction,
      status: placedConstructionIds.has(construction.id)
        ? "in-progress"
        : "todo",
    };
  });
};

const normalizeConstructionIdList = (value = []) =>
  (Array.isArray(value) ? value : [])
    .map((entry) => {
      if (typeof entry === "string" || typeof entry === "number") {
        return String(entry);
      }
      if (entry && typeof entry === "object" && entry.id !== undefined) {
        return String(entry.id);
      }
      return "";
    })
    .filter(Boolean);

const deriveLegacyConstructions = (lunes = []) => {
  const constructionsById = new Map();

  (Array.isArray(lunes) ? lunes : []).forEach((lune) => {
    const legacyEntries = Array.isArray(lune?.constructions)
      ? lune.constructions.filter(
          (construction) =>
            construction &&
            typeof construction === "object" &&
            (construction.resourceCode || construction.rewardType),
        )
      : [];

    normalizeLuneConstructions(legacyEntries).forEach((construction) => {
      if (!constructionsById.has(construction.id)) {
        constructionsById.set(construction.id, construction);
      }
    });
  });

  return Array.from(constructionsById.values());
};

export const normalizeCurrentLune = (value) => {
  const numericValue = Math.floor(Number(value));
  return Number.isFinite(numericValue) && numericValue > 0 ? numericValue : 1;
};

export const normalizeOptionalGroupId = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
};

export const normalizePersoFieldValue = (field, rawValue) => {
  if (field === "nom") return rawValue;
  if (field === "present") return Boolean(rawValue);
  if (field === "groupId") return normalizeOptionalGroupId(rawValue);

  const numericValue = Number(rawValue);
  if (!Number.isFinite(numericValue)) return 0;

  if (field === "pv" || field === "pvmax" || field === "poidsMax") {
    return Math.max(0, numericValue);
  }

  return numericValue;
};

export const buildStocks = (resources, stockValues = {}) =>
  Object.fromEntries(
    resources.map((resource) => [
      resource.code,
      Number(stockValues[resource.code] ?? 0),
    ]),
  );

export const normalizePersos = (persos = []) =>
  persos.map((perso) => {
    const pvmax = Math.max(0, Number(perso.pvmax ?? perso.pvBase ?? 0) || 0);
    const pv = Math.max(0, Number(perso.pv ?? pvmax) || 0);
    const capEau = Number(perso.capEau ?? 0);
    const capNrt = Number(perso.capNrt ?? 0);
    const capMed = Number(perso.capMed ?? 0);
    const capMat = Number(perso.capMat ?? 0);
    const capart = Number(perso.capart ?? 0);
    const combat = Number(perso.combat ?? 0);
    const poidsMaxValue = Number(perso.poidsMax ?? 20);
    const poidsMax = Number.isFinite(poidsMaxValue)
      ? Math.max(0, poidsMaxValue)
      : 20;

    return {
      id: Number(perso.id),
      nom: perso.nom || "Nouveau",
      present: perso.present !== false,
      pvmax,
      pv,
      poidsMax,
      poidsMaxEffectif: Number(perso.poidsMaxEffectif ?? poidsMax),
      capEau,
      capNrt,
      capMed,
      capMat,
      capart,
      capEauEffectif: Number(perso.capEauEffectif ?? capEau),
      capNrtEffectif: Number(perso.capNrtEffectif ?? capNrt),
      capMedEffectif: Number(perso.capMedEffectif ?? capMed),
      capMatEffectif: Number(perso.capMatEffectif ?? capMat),
      capArtEffectif: Number(perso.capArtEffectif ?? capart),
      poidsTotal: Number(perso.poidsTotal ?? 0),
      cmd: Number(perso.cmd ?? 0),
      combat,
      combatEffectif: Number(perso.combatEffectif ?? combat),
      equippedWeaponId: normalizeOptionalGroupId(perso.equippedWeaponId),
      equippedBagId: normalizeOptionalGroupId(perso.equippedBagId),
      groupId: normalizeOptionalGroupId(perso.groupId),
    };
  });

export const normalizeGroups = (groups) => {
  const normalized = Array.isArray(groups) ? groups : [];
  if (normalized.length === 0) return [];

  return normalized.map((group) => ({
    id: Number(group.id),
    name: group.name || `Groupe ${group.id}`,
    chef:
      group.chef === null || group.chef === undefined
        ? null
        : Number(group.chef),
  }));
};

export const normalizeLunes = (lunes = [], persos = []) =>
  [...lunes]
    .sort((left, right) => Number(left?.id ?? 0) - Number(right?.id ?? 0))
    .map((lune, index) => {
      const existingRations = lune.rations || {};
      const rations = Object.fromEntries(
        Object.entries(existingRations).map(([persoId, ration]) => [
          persoId,
          { ...defaultRation(), ...(ration || {}) },
        ]),
      );

      persos.forEach((perso) => {
        if (!rations[perso.id]) rations[perso.id] = defaultRation();
      });

      return {
        id: index + 1,
        meteo: normalizeWeatherCoefficients(lune.meteo),
        rations,
        overrides: lune.overrides || {},
        placedConstructionIds: normalizeConstructionIdList(
          lune.placedConstructionIds ?? lune.constructions,
        ),
        constructions: [],
      };
    });

export const createLune = (persos = [], luneId = 1) => ({
  id: Math.max(1, Math.floor(Number(luneId) || 1)),
  meteo: { ...defaultWeatherCoefficients },
  rations: Object.fromEntries(
    persos.map((perso) => [perso.id, defaultRation()]),
  ),
  overrides: {},
  placedConstructionIds: [],
  constructions: [],
});

export const normalizeArmes = (armes = []) =>
  armes.map((arme) => ({
    id: Number(arme.id),
    name: arme.name || "Arme sans nom",
    att: Number(arme.att ?? 1),
    degats: Number(arme.degats ?? 0),
    fiabilite: Number(arme.fiabilite ?? 0),
    pv: Number(arme.pv ?? 0),
    pvm: Number(arme.pvm ?? 0),
    poids: Number(arme.poids ?? 0),
    quantity: Math.max(0, Math.floor(Number(arme.quantity ?? 1) || 0)),
  }));

export const normalizeOutils = (outils = []) =>
  outils.map((outil) => ({
    id: Number(outil.id),
    name: outil.name || "Outil sans nom",
    specialite: ["eau", "nrt", "mat", "art"].includes(outil.specialite)
      ? outil.specialite
      : "eau",
    bonus: (() => {
      const value = Number(outil.bonus ?? 1);
      return Number.isFinite(value) ? Math.max(0, value) : 1;
    })(),
    pv: Math.max(0, Number(outil.pv ?? 0) || 0),
    pvmax: Math.max(0, Number(outil.pvmax ?? 0) || 0),
    poids: Math.max(0, Number(outil.poids ?? 0) || 0),
    quantity: Math.max(0, Math.floor(Number(outil.quantity ?? 1) || 0)),
  }));

export const normalizePersoArmes = (persoArmes = []) =>
  persoArmes
    .map((entry) => ({
      perso_id: Number(entry.perso_id),
      arme_id: Number(entry.arme_id),
      equipee: Boolean(entry.equipee),
    }))
    .filter(
      (entry) =>
        Number.isFinite(entry.perso_id) && Number.isFinite(entry.arme_id),
    );

export const normalizePersoOutils = (persoOutils = []) =>
  persoOutils
    .map((entry) => ({
      perso_id: Number(entry.perso_id),
      outil_id: Number(entry.outil_id),
    }))
    .filter(
      (entry) =>
        Number.isFinite(entry.perso_id) && Number.isFinite(entry.outil_id),
    );

export const normalizeSacs = (sacs = []) =>
  sacs.map((sac) => ({
    id: Number(sac.id),
    name: sac.name || "Sac sans nom",
    pv: Math.max(0, Number(sac.pv ?? 0) || 0),
    pvmax: Math.max(0, Number(sac.pvmax ?? 0) || 0),
    poids: Math.max(0, Number(sac.poids ?? 0) || 0),
    capacite: Math.max(0, Number(sac.capacite ?? 0) || 0),
    quantity: Math.max(0, Math.floor(Number(sac.quantity ?? 1) || 0)),
  }));

export const normalizePersoSacs = (persoSacs = []) =>
  persoSacs
    .map((entry) => ({
      perso_id: Number(entry.perso_id),
      sac_id: Number(entry.sac_id),
      equipe: Boolean(entry.equipe),
    }))
    .filter(
      (entry) =>
        Number.isFinite(entry.perso_id) && Number.isFinite(entry.sac_id),
    );

export const normalizePersoResources = (persoResources = []) =>
  persoResources
    .map((entry) => ({
      perso_id: Number(entry.perso_id),
      resource_id: Number(entry.resource_id),
      quantity: Math.max(0, Number(entry.quantity ?? 0) || 0),
    }))
    .filter(
      (entry) =>
        Number.isFinite(entry.perso_id) && Number.isFinite(entry.resource_id),
    );

export const buildFallbackState = () => {
  const persos = normalizePersos([]);

  return {
    resources: [],
    persos,
    persoResources: [],
    constructions: [],
    lunes: [createLune(persos, 1)],
    currentLune: 1,
    stocks: defaultStocks,
    cityMultipliers: defaultCityMultipliers,
    nextPersoId: 1,
    groups: [],
    armes: [],
    persoArmes: [],
    outils: [],
    persoOutils: [],
    sacs: [],
    persoSacs: [],
  };
};

export const buildState = (rawState = {}) => {
  const resources =
    Array.isArray(rawState.resources) && rawState.resources.length > 0
      ? rawState.resources
      : [];
  const persos = normalizePersos(rawState.persos || []);
  const lunes = normalizeLunes(rawState.lunes || [], persos);
  const constructions = syncConstructionStatusesWithLunes(
    rawState.constructions || deriveLegacyConstructions(rawState.lunes || []),
    lunes,
  );
  const currentLune = normalizeCurrentLune(rawState.currentLune);

  return {
    resources,
    persos,
    persoResources: normalizePersoResources(rawState.persoResources || []),
    constructions,
    lunes: lunes.length > 0 ? lunes : [createLune(persos, 1)],
    currentLune,
    stocks: { ...buildStocks(resources), ...(rawState.stocks || {}) },
    cityMultipliers: normalizeCityMultipliers(rawState.cityMultipliers || {}),
    nextPersoId:
      rawState.nextPersoId ||
      Math.max(1, ...persos.map((perso) => perso.id + 1)),
    groups: normalizeGroups(rawState.groups || []),
    armes: normalizeArmes(rawState.armes || []),
    persoArmes: normalizePersoArmes(rawState.persoArmes || []),
    outils: normalizeOutils(rawState.outils || []),
    persoOutils: normalizePersoOutils(rawState.persoOutils || []),
    sacs: normalizeSacs(rawState.sacs || []),
    persoSacs: normalizePersoSacs(rawState.persoSacs || []),
  };
};
