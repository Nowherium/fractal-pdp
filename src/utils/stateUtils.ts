import type {
  Arme,
  CityMultipliers,
  ConstructionProgressById,
  ConstructionStatus,
  Group,
  Lune,
  LuneConstruction,
  LunePlacement,
  Outil,
  Perso,
  PersoArme,
  PersoOutil,
  PersoResource,
  PersoSac,
  Ration,
  Resource,
  Sac,
  Stocks,
  WeatherCoefficients,
} from "../types";

type RawState = Record<string, unknown>;
type PlacementEntry = {
  id?: string | number;
  constructionId?: string | number;
  isPlaced?: boolean;
  luneId?: number;
};
type RawConstructionPlacement = string | number | PlacementEntry;
type LuneInput = Partial<Lune> & {
  id?: number;
  placedConstructionIds?: RawConstructionPlacement[];
  constructions?: unknown[];
};

export const defaultStocks: Stocks = {};

export const defaultCityMultipliers: CityMultipliers = {
  eau: 1,
  nrt: 1,
  med: 1,
  mat: 1,
};

export const defaultWeatherCoefficient = 1;
export const defaultWeatherCoefficients: WeatherCoefficients = {
  eau: defaultWeatherCoefficient,
  nrt: defaultWeatherCoefficient,
  med: defaultWeatherCoefficient,
  mat: defaultWeatherCoefficient,
};

const normalizeCityMultiplierValue = (value: unknown): number => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? Math.max(0, numericValue) : 1;
};

export const normalizeCityMultipliers = (
  cityMultipliers: Partial<CityMultipliers> = {},
): CityMultipliers => ({
  eau: normalizeCityMultiplierValue(cityMultipliers.eau),
  nrt: normalizeCityMultiplierValue(cityMultipliers.nrt),
  med: normalizeCityMultiplierValue(cityMultipliers.med),
  mat: normalizeCityMultiplierValue(cityMultipliers.mat),
});

export const normalizeWeatherCoefficient = (value: unknown): number => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return defaultWeatherCoefficient;
  return Math.min(1, Math.max(0, numericValue));
};

export const normalizeWeatherCoefficients = (
  value: Partial<WeatherCoefficients> | number | string = {},
): WeatherCoefficients => {
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

export const defaultRation = (): Ration => ({
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
const constructionStatuses = new Set(["todo", "in-progress", "done"]);

const normalizeConstructionStatus = (
  value: unknown,
  fallback: ConstructionStatus = "todo",
): ConstructionStatus =>
  constructionStatuses.has(value as ConstructionStatus)
    ? (value as ConstructionStatus)
    : fallback;

export const normalizeLuneConstructions = (
  constructions: Array<Partial<LuneConstruction>> = [],
): LuneConstruction[] =>
  (Array.isArray(constructions) ? constructions : []).map(
    (construction, index) => {
      const rewardType =
        typeof construction?.rewardType === "string"
          ? construction.rewardType
          : "";

      return {
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
        rewardType: constructionRewardTypes.has(
          rewardType as LuneConstruction["rewardType"],
        )
          ? (rewardType as LuneConstruction["rewardType"])
          : "mat",
        status: normalizeConstructionStatus(construction?.status),
      };
    },
  );

/**
 * @param {import("../types").LuneConstruction[]} [constructions=[]]
 * @param {import("../types").Lune[]} [lunes=[]]
 * @param {number} [currentLuneValue=1]
 * @param {import("../types").ConstructionProgressById} [explicitProgress={}]
 * @returns {import("../types").ConstructionProgressById}
 */
export const buildConstructionProgressById = (
  constructions: Array<Partial<LuneConstruction>> = [],
  lunes: LuneInput[] = [],
  currentLuneValue = 1,
  explicitProgress: ConstructionProgressById = {},
): ConstructionProgressById => {
  const normalizedCurrentLune = Math.max(
    1,
    Math.floor(Number(currentLuneValue) || 1),
  );
  const progressSource =
    explicitProgress && typeof explicitProgress === "object"
      ? explicitProgress
      : {};
  const earliestPlacementById = new Map<string, number>();
  const placedFromCurrent = new Set<string>();

  (Array.isArray(lunes) ? lunes : []).forEach((lune) => {
    const luneId = Number(lune?.id ?? 0);
    const constructionIds = getPlacedConstructionIdsForLune(lune);

    constructionIds.forEach((constructionId) => {
      if (
        Number.isFinite(luneId) &&
        luneId > 0 &&
        !earliestPlacementById.has(constructionId)
      ) {
        earliestPlacementById.set(constructionId, luneId);
      }

      if (luneId >= normalizedCurrentLune) {
        placedFromCurrent.add(constructionId);
      }
    });
  });

  return Object.fromEntries(
    normalizeLuneConstructions(constructions).map((construction) => {
      const existingProgress: Partial<ConstructionProgressById[string]> =
        progressSource[String(construction.id)] &&
        typeof progressSource[String(construction.id)] === "object"
          ? progressSource[String(construction.id)]
          : {};
      const buildersRequired = Math.max(
        1,
        Math.floor(Number(construction.buildersRequired ?? 1) || 1),
      );
      const baseStatus = normalizeConstructionStatus(
        existingProgress.status ?? construction.status,
      );
      const rawRemainingBuilders = Number(
        existingProgress.remainingBuilders ??
          construction.remainingBuilders ??
          (baseStatus === "done" ? 0 : buildersRequired),
      );
      const remainingBuilders =
        baseStatus === "done"
          ? 0
          : Math.max(
              0,
              Math.min(
                buildersRequired,
                Number.isFinite(rawRemainingBuilders)
                  ? rawRemainingBuilders
                  : buildersRequired,
              ),
            );
      const costPaid =
        baseStatus === "done"
          ? true
          : Boolean(
              existingProgress.costPaid ?? construction.costPaid ?? false,
            );
      const startedAtLune = Number(
        existingProgress.startedAtLune ??
          earliestPlacementById.get(construction.id),
      );
      const completedAtLune = Number(existingProgress.completedAtLune);
      const hasStarted =
        placedFromCurrent.has(construction.id) ||
        baseStatus === "in-progress" ||
        (baseStatus !== "todo" &&
          (costPaid ||
            remainingBuilders < buildersRequired ||
            (Number.isFinite(startedAtLune) && startedAtLune > 0)));

      const status =
        baseStatus === "done" ? "done" : hasStarted ? "in-progress" : "todo";

      return [
        construction.id,
        {
          constructionId: construction.id,
          status,
          costPaid: status === "done" ? true : costPaid,
          remainingBuilders: status === "done" ? 0 : remainingBuilders,
          startedAtLune:
            Number.isFinite(startedAtLune) && startedAtLune > 0
              ? startedAtLune
              : null,
          completedAtLune:
            status === "done" &&
            Number.isFinite(completedAtLune) &&
            completedAtLune > 0
              ? completedAtLune
              : null,
        },
      ];
    }),
  );
};

/**
 * @param {import("../types").LuneConstruction[]} [constructions=[]]
 * @param {import("../types").ConstructionProgressById} [constructionProgress={}]
 * @returns {import("../types").LuneConstruction[]}
 */
export const mergeConstructionProgressIntoConstructions = (
  constructions: Array<Partial<LuneConstruction>> = [],
  constructionProgress: ConstructionProgressById = {},
): LuneConstruction[] =>
  normalizeLuneConstructions(constructions).map((construction) => {
    const progress = constructionProgress?.[construction.id];
    const status = normalizeConstructionStatus(
      progress?.status ?? construction.status,
    );
    const rawRemainingBuilders = Number(
      progress?.remainingBuilders ??
        construction.remainingBuilders ??
        construction.buildersRequired ??
        1,
    );

    return {
      ...construction,
      status,
      costPaid:
        status === "done"
          ? true
          : Boolean(progress?.costPaid ?? construction.costPaid ?? false),
      remainingBuilders:
        status === "done"
          ? 0
          : Math.max(
              0,
              Math.min(
                construction.buildersRequired,
                Number.isFinite(rawRemainingBuilders)
                  ? rawRemainingBuilders
                  : construction.buildersRequired,
              ),
            ),
    };
  });

export const syncConstructionStatusesWithLunes = (
  constructions: Array<Partial<LuneConstruction>> = [],
  lunes: LuneInput[] = [],
  currentLuneValue = 1,
): LuneConstruction[] => {
  const constructionProgress = buildConstructionProgressById(
    constructions,
    lunes,
    currentLuneValue,
  );

  return mergeConstructionProgressIntoConstructions(
    constructions,
    constructionProgress,
  );
};

const normalizeConstructionPlacementLuneId = (
  value: unknown,
  fallback = 1,
): number => {
  const numericValue = Math.floor(Number(value));
  if (Number.isFinite(numericValue) && numericValue > 0) {
    return numericValue;
  }
  return Math.max(1, Math.floor(Number(fallback) || 1));
};

/**
 * @param {Array<string | number | import("../types").LunePlacement | { id?: string, constructionId?: string, isPlaced?: boolean, luneId?: number }>} [value=[]]
 * @param {number} [luneId=1]
 * @returns {import("../types").LunePlacement[]}
 */
export const normalizeConstructionPlacements = (
  value: RawConstructionPlacement[] = [],
  luneId = 1,
): LunePlacement[] => {
  const placementsByConstructionId = new Map();

  (Array.isArray(value) ? value : []).forEach((entry) => {
    if (typeof entry === "string" || typeof entry === "number") {
      const constructionId = String(entry);
      if (!constructionId) return;
      placementsByConstructionId.set(constructionId, {
        luneId: normalizeConstructionPlacementLuneId(luneId),
        constructionId,
        isPlaced: true,
      });
      return;
    }

    if (!entry || typeof entry !== "object") {
      return;
    }

    const constructionId = String(entry.constructionId ?? entry.id ?? "");
    if (!constructionId) return;

    placementsByConstructionId.set(constructionId, {
      luneId: normalizeConstructionPlacementLuneId(
        entry.luneId,
        luneId ?? entry.luneId,
      ),
      constructionId,
      isPlaced: entry.isPlaced !== false,
    });
  });

  return Array.from(placementsByConstructionId.values());
};

/**
 * @param {import("../types").Lune | import("../types").LunePlacement[] | string[] | number[]} [luneOrPlacements=[]]
 * @returns {string[]}
 */
export const getPlacedConstructionIdsForLune = (
  luneOrPlacements: LuneInput | RawConstructionPlacement[] = [],
): string[] => {
  const placements = Array.isArray(luneOrPlacements)
    ? normalizeConstructionPlacements(luneOrPlacements)
    : normalizeConstructionPlacements(
        luneOrPlacements?.constructionPlacements ??
          luneOrPlacements?.placedConstructionIds ??
          luneOrPlacements?.constructions,
        luneOrPlacements?.id,
      );

  return placements
    .filter((placement) => placement.isPlaced !== false)
    .map((placement) => String(placement.constructionId))
    .filter(Boolean);
};

/**
 * @template T extends { id?: number, constructionPlacements?: import("../types").LunePlacement[], placedConstructionIds?: string[], constructions?: unknown[] }
 * @param {T} lune
 * @returns {Omit<T, "placedConstructionIds"> & { constructionPlacements: import("../types").LunePlacement[] }}
 */
export const syncLuneConstructionPlacements = <
  T extends {
    id?: number;
    constructionPlacements?: LunePlacement[];
    placedConstructionIds?: Array<string | number>;
    constructions?: unknown[];
  },
>(
  lune: T,
): Omit<T, "placedConstructionIds"> & {
  constructionPlacements: LunePlacement[];
} => {
  const source: T = lune && typeof lune === "object" ? lune : ({} as T);
  const { placedConstructionIds: _legacyPlacedConstructionIds, ...restLune } =
    source;
  const placementSource = Array.isArray(source.constructionPlacements)
    ? source.constructionPlacements
    : Array.isArray(source.placedConstructionIds)
      ? source.placedConstructionIds
      : Array.isArray(source.constructions)
        ? (source.constructions as RawConstructionPlacement[])
        : [];
  const constructionPlacements = normalizeConstructionPlacements(
    placementSource,
    source.id,
  );

  return {
    ...restLune,
    constructionPlacements,
  } as Omit<T, "placedConstructionIds"> & {
    constructionPlacements: LunePlacement[];
  };
};

const deriveLegacyConstructions = (
  lunes: LuneInput[] = [],
): LuneConstruction[] => {
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

export const normalizeCurrentLune = (value: unknown): number => {
  const numericValue = Math.floor(Number(value));
  return Number.isFinite(numericValue) && numericValue > 0 ? numericValue : 1;
};

export const normalizeOptionalGroupId = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
};

export const normalizePersoFieldValue = (
  field: string,
  rawValue: unknown,
): string | boolean | number | null => {
  if (field === "nom") return String(rawValue ?? "");
  if (field === "present") return Boolean(rawValue);
  if (field === "groupId") return normalizeOptionalGroupId(rawValue);

  const numericValue = Number(rawValue);
  if (!Number.isFinite(numericValue)) return 0;

  if (field === "pv" || field === "pvmax" || field === "poidsMax") {
    return Math.max(0, numericValue);
  }

  return numericValue;
};

export const buildStocks = (
  resources: Resource[] = [],
  stockValues: Stocks = {},
): Stocks =>
  Object.fromEntries(
    resources.map((resource) => [
      resource.code,
      Number(stockValues[resource.code] ?? 0),
    ]),
  );

export const normalizePersos = (persos: Array<Partial<Perso>> = []): Perso[] =>
  persos.map((perso) => {
    const pvmax = Math.max(0, Number(perso.pvmax ?? 0) || 0);
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

export const normalizeGroups = (
  groups: Array<Partial<Group>> = [],
): Group[] => {
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

/**
 * @param {import("../types").Lune[]} [lunes=[]]
 * @param {import("../types").Perso[]} [persos=[]]
 * @returns {import("../types").Lune[]}
 */
export const normalizeLunes = (
  lunes: LuneInput[] = [],
  persos: Perso[] = [],
): Lune[] =>
  [...lunes]
    .sort((left, right) => Number(left?.id ?? 0) - Number(right?.id ?? 0))
    .map((lune, index) => {
      const existingRations = lune.rations || {};
      const rations = Object.fromEntries(
        Object.entries(existingRations).map(([persoId, ration]) => [
          persoId,
          {
            ...defaultRation(),
            ...((ration && typeof ration === "object"
              ? ration
              : {}) as Partial<Ration>),
          },
        ]),
      );

      persos.forEach((perso) => {
        if (!rations[perso.id]) rations[perso.id] = defaultRation();
      });

      return syncLuneConstructionPlacements({
        id: index + 1,
        meteo: normalizeWeatherCoefficients(lune.meteo),
        rations,
        overrides: lune.overrides || {},
        constructionPlacements: normalizeConstructionPlacements(
          lune.constructionPlacements ??
            lune.placedConstructionIds ??
            lune.constructions,
          index + 1,
        ),
        constructions: [],
      });
    });

/**
 * @param {import("../types").Perso[]} [persos=[]]
 * @param {number} [luneId=1]
 * @returns {import("../types").Lune}
 */
export const createLune = (persos: Perso[] = [], luneId = 1): Lune =>
  syncLuneConstructionPlacements({
    id: Math.max(1, Math.floor(Number(luneId) || 1)),
    meteo: { ...defaultWeatherCoefficients },
    rations: Object.fromEntries(
      persos.map((perso) => [perso.id, defaultRation()]),
    ),
    overrides: {},
    constructionPlacements: [],
    constructions: [],
  });

export const normalizeArmes = (armes: Array<Partial<Arme>> = []): Arme[] =>
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

export const normalizeOutils = (outils: Array<Partial<Outil>> = []): Outil[] =>
  outils.map((outil) => ({
    id: Number(outil.id),
    name: outil.name || "Outil sans nom",
    specialite:
      typeof outil.specialite === "string" &&
      ["eau", "nrt", "mat", "art"].includes(outil.specialite)
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

export const normalizePersoArmes = (
  persoArmes: Array<Partial<PersoArme>> = [],
): PersoArme[] =>
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

export const normalizePersoOutils = (
  persoOutils: Array<Partial<PersoOutil>> = [],
): PersoOutil[] =>
  persoOutils
    .map((entry) => ({
      perso_id: Number(entry.perso_id),
      outil_id: Number(entry.outil_id),
    }))
    .filter(
      (entry) =>
        Number.isFinite(entry.perso_id) && Number.isFinite(entry.outil_id),
    );

export const normalizeSacs = (sacs: Array<Partial<Sac>> = []): Sac[] =>
  sacs.map((sac) => ({
    id: Number(sac.id),
    name: sac.name || "Sac sans nom",
    pv: Math.max(0, Number(sac.pv ?? 0) || 0),
    pvmax: Math.max(0, Number(sac.pvmax ?? 0) || 0),
    poids: Math.max(0, Number(sac.poids ?? 0) || 0),
    capacite: Math.max(0, Number(sac.capacite ?? 0) || 0),
    quantity: Math.max(0, Math.floor(Number(sac.quantity ?? 1) || 0)),
  }));

export const normalizePersoSacs = (
  persoSacs: Array<Partial<PersoSac>> = [],
): PersoSac[] =>
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

export const normalizePersoResources = (
  persoResources: Array<Partial<PersoResource>> = [],
): PersoResource[] =>
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
    constructionProgress: {},
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

export const buildState = (rawState: unknown = {}) => {
  const source =
    rawState && typeof rawState === "object"
      ? (rawState as RawState)
      : ({} as RawState);

  const resources =
    Array.isArray(source.resources) && source.resources.length > 0
      ? (source.resources as Resource[])
      : [];
  const rawPersos = Array.isArray(source.persos) ? source.persos : [];
  const rawLunes = Array.isArray(source.lunes) ? source.lunes : [];
  const rawPersoResources = Array.isArray(source.persoResources)
    ? source.persoResources
    : [];
  const rawGroups = Array.isArray(source.groups) ? source.groups : [];
  const rawArmes = Array.isArray(source.armes) ? source.armes : [];
  const rawPersoArmes = Array.isArray(source.persoArmes)
    ? source.persoArmes
    : [];
  const rawOutils = Array.isArray(source.outils) ? source.outils : [];
  const rawPersoOutils = Array.isArray(source.persoOutils)
    ? source.persoOutils
    : [];
  const rawSacs = Array.isArray(source.sacs) ? source.sacs : [];
  const rawPersoSacs = Array.isArray(source.persoSacs) ? source.persoSacs : [];
  const rawStocks =
    source.stocks && typeof source.stocks === "object"
      ? (source.stocks as Stocks)
      : {};
  const rawCityMultipliers =
    source.cityMultipliers && typeof source.cityMultipliers === "object"
      ? (source.cityMultipliers as Partial<CityMultipliers>)
      : {};
  const rawConstructionProgress =
    source.constructionProgress &&
    typeof source.constructionProgress === "object"
      ? (source.constructionProgress as ConstructionProgressById)
      : {};

  const persos = normalizePersos(rawPersos);
  const lunes = normalizeLunes(rawLunes, persos);
  const currentLune = normalizeCurrentLune(source.currentLune);
  const rawConstructions = Array.isArray(source.constructions)
    ? source.constructions
    : deriveLegacyConstructions(rawLunes);
  const constructionProgress = buildConstructionProgressById(
    rawConstructions,
    lunes,
    currentLune,
    rawConstructionProgress,
  );
  const constructions = mergeConstructionProgressIntoConstructions(
    rawConstructions,
    constructionProgress,
  );
  const nextPersoIdCandidate = Number(source.nextPersoId);

  return {
    resources,
    persos,
    persoResources: normalizePersoResources(rawPersoResources),
    constructions,
    constructionProgress,
    lunes: lunes.length > 0 ? lunes : [createLune(persos, 1)],
    currentLune,
    stocks: { ...buildStocks(resources), ...rawStocks },
    cityMultipliers: normalizeCityMultipliers(rawCityMultipliers),
    nextPersoId: Number.isFinite(nextPersoIdCandidate)
      ? nextPersoIdCandidate
      : Math.max(1, ...persos.map((perso) => perso.id + 1)),
    groups: normalizeGroups(rawGroups),
    armes: normalizeArmes(rawArmes),
    persoArmes: normalizePersoArmes(rawPersoArmes),
    outils: normalizeOutils(rawOutils),
    persoOutils: normalizePersoOutils(rawPersoOutils),
    sacs: normalizeSacs(rawSacs),
    persoSacs: normalizePersoSacs(rawPersoSacs),
  };
};
