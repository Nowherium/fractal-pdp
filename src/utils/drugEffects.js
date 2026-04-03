export const DRUG_EFFECTS = {
  vdk: {
    label: "🍸 VDK",
    summary: "Combat x1,2",
    combatMultiplier: 1.2,
    consumptionQuantity: 1,
  },
  rhm: {
    label: "🥃 RHM",
    summary: "Combat x1,2",
    combatMultiplier: 1.2,
    consumptionQuantity: 1,
  },
  whk: {
    label: "🥃 WHK",
    summary: "Combat x1,2",
    combatMultiplier: 1.2,
    consumptionQuantity: 1,
  },
  php: {
    label: "🍾 PHP",
    summary: "Combat x1,2",
    combatMultiplier: 1.2,
    consumptionQuantity: 1,
  },
  fca: {
    label: "🍷 FCA",
    summary: "Combat x1,2",
    combatMultiplier: 1.2,
    consumptionQuantity: 1,
  },
  cir: {
    label: "🍾 CIR",
    summary: "Combat x1,2",
    combatMultiplier: 1.2,
    consumptionQuantity: 1,
  },
  ext: {
    label: "🍺 EXT",
    summary: "Combat x1,2",
    combatMultiplier: 1.2,
    consumptionQuantity: 1,
  },
  cnb: {
    label: "🌿 CNB",
    summary: "Prod x1,2",
    productionMultiplier: 1.2,
    consumptionQuantity: 0.5,
  },
  plastique: {
    label: "🧪 Plastique",
    summary: "Prod x1,2",
    productionMultiplier: 1.2,
    consumptionQuantity: 0,
    requiresResource: false,
  },
  coc: {
    label: "⚡ COC",
    summary: "+2 PV pendant la lune",
    instantPvBonus: 2,
    consumptionQuantity: 0.5,
  },
};

export const normalizeDrugCode = (value) => {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();
  return normalized || null;
};

export const getDrugLabel = (code) => {
  const normalized = normalizeDrugCode(code);
  if (!normalized) return "Aucune";
  return DRUG_EFFECTS[normalized]?.label || normalized.toUpperCase();
};

export const getDrugConsumptionQuantity = (code) => {
  const normalized = normalizeDrugCode(code);
  if (!normalized) return 1;
  const quantity = Number(DRUG_EFFECTS[normalized]?.consumptionQuantity ?? 1);
  return Number.isFinite(quantity) && quantity >= 0 ? quantity : 1;
};

export const formatDrugQuantity = (value) => {
  const numericValue = Number(value ?? 0);
  if (numericValue === Number.POSITIVE_INFINITY) return "∞";
  if (!Number.isFinite(numericValue)) return "0";
  return Number.isInteger(numericValue)
    ? String(numericValue)
    : numericValue.toFixed(2).replace(/\.0+$|(?<=\.[0-9])0+$/g, "");
};

export const getDrugSummary = (code) => {
  const normalized = normalizeDrugCode(code);
  if (!normalized) return "";
  return DRUG_EFFECTS[normalized]?.summary || "Effet spécial";
};
