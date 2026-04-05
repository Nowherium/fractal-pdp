import type {
  CityMultipliers,
  Lune,
  Perso,
  Ration,
  Resource,
  Stocks,
  WeatherCoefficients,
} from "../../types";

export type RawState = {
  resources?: unknown;
  persos?: unknown;
  lunes?: unknown;
  persoResources?: unknown;
  constructions?: unknown;
  constructionProgress?: unknown;
  currentLune?: unknown;
  stocks?: unknown;
  cityMultipliers?: unknown;
  nextPersoId?: unknown;
  groups?: unknown;
  armes?: unknown;
  persoArmes?: unknown;
  outils?: unknown;
  persoOutils?: unknown;
  sacs?: unknown;
  persoSacs?: unknown;
} & Record<string, unknown>;

export type PlacementEntry = {
  id?: string | number;
  constructionId?: string | number;
  isPlaced?: boolean;
  luneId?: number;
};

export type RawConstructionPlacement = string | number | PlacementEntry;

export type LuneInput = Partial<Lune> & {
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

export const normalizeCurrentLune = (value: unknown): number => {
  const numericValue = Math.floor(Number(value));
  return Number.isFinite(numericValue) && numericValue > 0 ? numericValue : 1;
};

export const normalizeStockQuantity = (value: unknown): number => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return 0;
  }

  return Math.max(0, Number(numericValue.toFixed(1)));
};

export const normalizeProductionCapacity = (value: unknown): number => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return 0;
  }

  return Math.max(0, Number(numericValue.toFixed(2)));
};

export const normalizeOptionalGroupId = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
};

export const normalizeLuneToolAssignments = (
  value: unknown,
): NonNullable<Lune["toolAssignments"]> => {
  const source = value && typeof value === "object" ? value : {};

  return Object.fromEntries(
    ["eau", "nrt", "med", "mat", "art"].flatMap((specialite) => {
      if (!Object.prototype.hasOwnProperty.call(source, specialite)) {
        return [];
      }

      return [
        [
          specialite,
          normalizeOptionalGroupId(
            (source as Record<string, unknown>)[specialite],
          ),
        ],
      ];
    }),
  ) as NonNullable<Lune["toolAssignments"]>;
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

  if (
    field === "capEau" ||
    field === "capNrt" ||
    field === "capMed" ||
    field === "capMat" ||
    field === "capart"
  ) {
    return normalizeProductionCapacity(numericValue);
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

export const getDefaultNextPersoId = (persos: Perso[] = []): number =>
  Math.max(1, ...persos.map((perso) => perso.id + 1));
