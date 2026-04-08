import type {
  CityMultipliers,
  ConstructionProgressById,
  LuneConstruction,
  Resource,
  Stocks,
} from "../../types";
import { normalizeCurrentTerrainId, normalizeTerrains } from "../terrainUtils";
import {
  buildConstructionProgressById,
  mergeConstructionProgressIntoConstructions,
  normalizeLuneConstructions,
} from "./constructions";
import {
  createLune,
  normalizeArmes,
  normalizeGroups,
  normalizeLunes,
  normalizeOutils,
  normalizePersoArmes,
  normalizePersoOutils,
  normalizePersoResources,
  normalizePersoSacs,
  normalizePersos,
  normalizeSacs,
} from "./entities";
import {
  buildStocks,
  defaultCityMultipliers,
  defaultStocks,
  getDefaultNextPersoId,
  normalizeCityMultipliers,
  normalizeCurrentLune,
  type LuneInput,
  type RawState,
} from "./shared";

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
    terrains: [],
    currentTerrainId: null,
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

  const rawActions = Array.isArray(source.actions) ? source.actions : [];

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
  const terrains = normalizeTerrains(
    Array.isArray(source.terrains) ? source.terrains : [],
  );
  const currentTerrainId = normalizeCurrentTerrainId(
    source.currentTerrainId,
    terrains,
  );
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
    terrains,
    currentTerrainId,
    nextPersoId: Number.isFinite(nextPersoIdCandidate)
      ? nextPersoIdCandidate
      : getDefaultNextPersoId(persos),
    groups: normalizeGroups(rawGroups),
    armes: normalizeArmes(rawArmes),
    persoArmes: normalizePersoArmes(rawPersoArmes),
    outils: normalizeOutils(rawOutils),
    persoOutils: normalizePersoOutils(rawPersoOutils),
    sacs: normalizeSacs(rawSacs),
    persoSacs: normalizePersoSacs(rawPersoSacs),
    actions: rawActions,
  };
};
