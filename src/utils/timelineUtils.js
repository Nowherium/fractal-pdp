import {
  DRUG_EFFECTS,
  formatDrugQuantity,
  getDrugConsumptionQuantity,
  getDrugLabel,
  getDrugSummary,
  normalizeDrugCode,
} from "./drugEffects.js";

const computeIncrement = (cap) => (cap < 4 ? 0.1 : cap <= 6 ? 0.05 : 0.01);

const formatDisplayValue = (value) =>
  Number.isInteger(value) ? value : Number(value).toFixed(2);

const normalizeProductionMultipliers = (cityMultipliers = {}) => {
  const normalizeMultiplier = (value) => {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? Math.max(0, numericValue) : 1;
  };

  return {
    eau: normalizeMultiplier(cityMultipliers.eau),
    nrt: normalizeMultiplier(cityMultipliers.nrt),
    med: normalizeMultiplier(cityMultipliers.med),
    mat: normalizeMultiplier(cityMultipliers.mat),
  };
};

const normalizeWeatherCoefficient = (value) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return 1;
  return Math.min(1, Math.max(0, numericValue));
};

const normalizeWeatherCoefficients = (value) => {
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

const buildDrugStocksByPerso = (resources = [], persoResources = []) => {
  const resourceCodesById = new Map(
    resources.map((resource) => [
      Number(resource.id),
      String(resource.code ?? "").toLowerCase(),
    ]),
  );

  return persoResources.reduce((acc, entry) => {
    const persoId = Number(entry.perso_id);
    const resourceId = Number(entry.resource_id);
    const code = resourceCodesById.get(resourceId);

    if (!Number.isFinite(persoId) || !code || !DRUG_EFFECTS[code]) {
      return acc;
    }

    acc[persoId] = acc[persoId] || {};
    acc[persoId][code] =
      Number(acc[persoId][code] ?? 0) +
      Math.max(0, Number(entry.quantity ?? 0));
    return acc;
  }, {});
};

const buildAvailableDrugsMap = (remainingStocks = {}) =>
  Object.fromEntries(
    Object.entries(DRUG_EFFECTS).map(([code, effect]) => [
      code,
      effect.requiresResource === false
        ? Number.POSITIVE_INFINITY
        : Number(remainingStocks[code] ?? 0),
    ]),
  );

export const simulateTimeline = (
  persos,
  lunes,
  stocks,
  defaultRation,
  resources = [],
  persoResources = [],
  cityMultipliers = {},
) => {
  const timeline = [];
  const pvCourants = {};
  const capCourantes = {};
  const productionMultipliers = normalizeProductionMultipliers(cityMultipliers);
  const remainingDrugStocksByPerso = buildDrugStocksByPerso(
    resources,
    persoResources,
  );

  persos.forEach((perso) => {
    pvCourants[perso.id] = Math.max(0, Number(perso.pv ?? perso.pvmax ?? 0));
    capCourantes[perso.id] = {
      eau: Number(perso.capEauEffectif ?? perso.capEau ?? 0),
      nrt: Number(perso.capNrtEffectif ?? perso.capNrt ?? 0),
      med: Number(perso.capMedEffectif ?? perso.capMed ?? 0),
      mat: Number(perso.capMatEffectif ?? perso.capMat ?? 0),
      art: Number(perso.capArtEffectif ?? perso.capart ?? 0),
    };
    remainingDrugStocksByPerso[perso.id] =
      remainingDrugStocksByPerso[perso.id] || {};
  });

  let stockEau = stocks.eau ?? 0;
  let stockNrt = stocks.nrt ?? 0;
  let stockMed = stocks.med ?? 0;
  let stockMat = stocks.mat ?? 0;

  lunes.forEach((lune) => {
    const overrides = lune.overrides || {};
    const weatherCoefficients = normalizeWeatherCoefficients(lune.meteo);

    persos.forEach((perso) => {
      const override = overrides[perso.id];
      if (!override) return;
      if (override.pv !== undefined)
        pvCourants[perso.id] = Math.max(0, Number(override.pv) || 0);
      if (override.capEau !== undefined)
        capCourantes[perso.id].eau = override.capEau;
      if (override.capNrt !== undefined)
        capCourantes[perso.id].nrt = override.capNrt;
      if (override.capMed !== undefined)
        capCourantes[perso.id].med = override.capMed;
      if (override.capMat !== undefined)
        capCourantes[perso.id].mat = override.capMat;
      if (override.capArt !== undefined)
        capCourantes[perso.id].art = override.capArt;
    });

    const rows = [];
    let luneProdEau = 0;
    let luneProdNrt = 0;
    let luneProdMed = 0;
    let luneProdMat = 0;
    let luneConsoEau = 0;
    let luneConsoNrt = 0;
    let luneConsoMed = 0;

    persos.forEach((perso) => {
      const basePvDebut = pvCourants[perso.id];
      const ration = { ...defaultRation(), ...(lune.rations[perso.id] || {}) };
      const override = overrides[perso.id] || {};
      const hasOverride = Object.keys(override).length > 0;
      const mortAuDebut = basePvDebut <= 0;
      const selectedDrugCode = normalizeDrugCode(ration.drogue);
      const availableDrugs = buildAvailableDrugsMap(
        remainingDrugStocksByPerso[perso.id],
      );

      const baseCapsAtStart = { ...capCourantes[perso.id] };
      let cDebut = {
        eau:
          baseCapsAtStart.eau *
          productionMultipliers.eau *
          weatherCoefficients.eau,
        nrt:
          baseCapsAtStart.nrt *
          productionMultipliers.nrt *
          weatherCoefficients.nrt,
        med:
          baseCapsAtStart.med *
          productionMultipliers.med *
          weatherCoefficients.med,
        mat:
          baseCapsAtStart.mat *
          productionMultipliers.mat *
          weatherCoefficients.mat,
        art: baseCapsAtStart.art,
      };
      let pvDebut = basePvDebut;
      let pvFin = pvDebut;
      let classPv = "";
      let mortText = "";
      let drugStatus = "";
      let drugClassName = "";
      let temporaryPvBonus = 0;

      if (selectedDrugCode && mortAuDebut) {
        drugStatus = "⚠️ Impossible à consommer sur un cadavre";
        drugClassName = "warning";
      } else if (selectedDrugCode) {
        const drugEffect = DRUG_EFFECTS[selectedDrugCode];
        const availableQuantity = Number(availableDrugs[selectedDrugCode] ?? 0);
        const requiredQuantity = getDrugConsumptionQuantity(selectedDrugCode);
        const requiresResource = drugEffect?.requiresResource !== false;

        if (!drugEffect) {
          drugStatus = `⚠️ ${selectedDrugCode.toUpperCase()} inconnue`;
          drugClassName = "warning";
        } else if (requiresResource && availableQuantity < requiredQuantity) {
          drugStatus = `⚠️ ${getDrugLabel(selectedDrugCode)} indisponible (${formatDrugQuantity(availableQuantity)}/${formatDrugQuantity(requiredQuantity)} requis)`;
          drugClassName = "warning";
        } else {
          if (requiresResource) {
            remainingDrugStocksByPerso[perso.id][selectedDrugCode] = Math.max(
              0,
              availableQuantity - requiredQuantity,
            );
          }

          if (drugEffect.combatMultiplier) {
            drugStatus = `${getDrugLabel(selectedDrugCode)} — ${getDrugSummary(selectedDrugCode)}`;
          }

          if (drugEffect.productionMultiplier) {
            cDebut = {
              eau: cDebut.eau * drugEffect.productionMultiplier,
              nrt: cDebut.nrt * drugEffect.productionMultiplier,
              med: cDebut.med * drugEffect.productionMultiplier,
              mat: cDebut.mat * drugEffect.productionMultiplier,
              art: cDebut.art * drugEffect.productionMultiplier,
            };
            drugStatus = `${getDrugLabel(selectedDrugCode)} — ${getDrugSummary(selectedDrugCode)}`;
          }

          if (drugEffect.instantPvBonus) {
            temporaryPvBonus = Number(drugEffect.instantPvBonus);
            pvDebut += temporaryPvBonus;
            drugStatus = `${getDrugLabel(selectedDrugCode)} — ${getDrugSummary(selectedDrugCode)}`;
          }

          drugClassName = "safe";
        }
      }

      if (!mortAuDebut) {
        if (ration.tache === "eau") {
          luneProdEau += cDebut.eau;
          capCourantes[perso.id].eau =
            baseCapsAtStart.eau + computeIncrement(baseCapsAtStart.eau);
        }
        if (ration.tache === "nrt") {
          luneProdNrt += cDebut.nrt;
          capCourantes[perso.id].nrt =
            baseCapsAtStart.nrt + computeIncrement(baseCapsAtStart.nrt);
        }
        if (ration.tache === "med") {
          luneProdMed += cDebut.med;
          capCourantes[perso.id].med =
            baseCapsAtStart.med + computeIncrement(baseCapsAtStart.med);
        }
        if (ration.tache === "mat") {
          luneProdMat += cDebut.mat;
          capCourantes[perso.id].mat =
            baseCapsAtStart.mat + computeIncrement(baseCapsAtStart.mat);
        }

        if (ration.eau) luneConsoEau += 1;
        if (ration.nrt) luneConsoNrt += 1;
        if (ration.med) luneConsoMed += 1;

        const degats =
          (ration.eau ? 0 : 1) + (ration.nrt ? 0 : 1) + (ration.med ? 0 : 0.5);
        pvFin = Math.max(0, pvDebut - degats);
        pvCourants[perso.id] =
          temporaryPvBonus > 0
            ? Math.max(0, Math.min(pvFin, Number(perso.pvmax ?? pvFin)))
            : pvFin;
        classPv = pvFin <= 0 ? "danger" : pvFin <= 5 ? "warning" : "safe";
        mortText = pvFin <= 0 ? " (DÉCÈS)" : "";
      } else {
        mortText = " (CADAVRE)";
      }

      rows.push({
        persoId: perso.id,
        nom: perso.nom,
        pvDebut,
        pvFin,
        pvDisplayDebut: pvDebut > 0 ? formatDisplayValue(pvDebut) : 0,
        pvDisplayFin: pvFin > 0 ? formatDisplayValue(pvFin) : 0,
        cDebut,
        ration,
        mortAuDebut,
        classPv,
        mortText,
        hasOverride,
        availableDrugs,
        drugStatus,
        drugClassName,
      });
    });

    stockEau = stockEau + luneProdEau - luneConsoEau;
    stockNrt = stockNrt + luneProdNrt - luneConsoNrt;
    stockMed = stockMed + luneProdMed - luneConsoMed;
    stockMat = stockMat + luneProdMat - (lune.coutMat || 0);

    timeline.push({
      lune,
      rows,
      stats: {
        stockEau,
        stockNrt,
        stockMed,
        stockMat,
        classEau: stockEau < 0 ? "danger" : "safe",
        classNrt: stockNrt < 0 ? "danger" : "safe",
        classMed: stockMed < 0 ? "danger" : "safe",
        classMat: stockMat < 0 ? "danger" : "safe",
      },
    });
  });

  return timeline;
};
