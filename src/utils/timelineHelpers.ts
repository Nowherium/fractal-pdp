import type {
  CityMultipliersInput,
  ProductionMultipliers,
  StockSnapshot,
  WeatherInput,
} from "./timelineTypes";

export const computeIncrement = (cap: number): number =>
  cap < 4 ? 0.1 : cap <= 6 ? 0.05 : 0.01;

export const formatDisplayValue = (value: number): string | number =>
  Number.isInteger(value) ? value : Number(value).toFixed(2);

const normalizeMultiplier = (value: unknown): number => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? Math.max(0, numericValue) : 1;
};

export const normalizeProductionMultipliers = (
  cityMultipliers: CityMultipliersInput = {},
): ProductionMultipliers => ({
  eau: normalizeMultiplier(cityMultipliers.eau),
  nrt: normalizeMultiplier(cityMultipliers.nrt),
  med: normalizeMultiplier(cityMultipliers.med),
  mat: normalizeMultiplier(cityMultipliers.mat),
});

export const normalizeWeatherCoefficient = (value: unknown): number => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return 1;
  return Math.min(1, Math.max(0, numericValue));
};

export const normalizeWeatherCoefficients = (
  value: WeatherInput,
): ProductionMultipliers => {
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

export const normalizePresenceValue = (
  value: unknown,
  fallback = true,
): boolean => {
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

export const createStockSnapshot = (
  stocks: Record<string, number> = {},
): StockSnapshot => ({
  eau: Number(stocks.eau ?? 0),
  nrt: Number(stocks.nrt ?? 0),
  med: Number(stocks.med ?? 0),
  mat: Number(stocks.mat ?? 0),
});
