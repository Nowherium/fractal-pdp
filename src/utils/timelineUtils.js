import {
  DRUG_EFFECTS,
  formatDrugQuantity,
  getDrugConsumptionQuantity,
  getDrugLabel,
  getDrugSummary,
  normalizeDrugCode,
} from "./drugEffects.js";
import { normalizeLuneConstructions } from "./stateUtils.js";

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

const normalizePresenceValue = (value, fallback = true) => {
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

const buildInitialConstructionProgress = (constructions = []) =>
  Object.fromEntries(
    normalizeLuneConstructions(constructions).map((construction) => {
      const buildersRequired = Math.max(
        0,
        Number(construction.buildersRequired ?? 0) || 0,
      );
      const initialStatus = construction.status ?? "todo";

      return [
        construction.id,
        {
          remainingBuilders: initialStatus === "done" ? 0 : buildersRequired,
          costPaid: initialStatus === "done",
          completed: initialStatus === "done",
          started: initialStatus === "done",
        },
      ];
    }),
  );

export const simulateTimeline = (
  persos,
  lunes,
  stocks,
  defaultRation,
  constructions = [],
  resources = [],
  persoResources = [],
  cityMultipliers = {},
) => {
  const timeline = [];
  const pvCourants = {};
  const capCourantes = {};
  const combatCourants = {};
  const presenceCourante = {};
  const productionMultipliers = normalizeProductionMultipliers(cityMultipliers);
  const remainingDrugStocksByPerso = buildDrugStocksByPerso(
    resources,
    persoResources,
  );
  const resourceStocks = Object.fromEntries(
    Object.entries(stocks || {}).map(([code, value]) => [
      code,
      Number(value ?? 0),
    ]),
  );

  persos.forEach((perso) => {
    pvCourants[perso.id] = Math.max(0, Number(perso.pv ?? perso.pvmax ?? 0));
    presenceCourante[perso.id] = normalizePresenceValue(perso.present, true);
    capCourantes[perso.id] = {
      eau: Number(perso.capEauEffectif ?? perso.capEau ?? 0),
      nrt: Number(perso.capNrtEffectif ?? perso.capNrt ?? 0),
      med: Number(perso.capMedEffectif ?? perso.capMed ?? 0),
      mat: Number(perso.capMatEffectif ?? perso.capMat ?? 0),
      art: Number(perso.capArtEffectif ?? perso.capart ?? 0),
    };
    combatCourants[perso.id] = Number(perso.combat ?? 0);
    remainingDrugStocksByPerso[perso.id] =
      remainingDrugStocksByPerso[perso.id] || {};
  });

  let stockEau = Number(resourceStocks.eau ?? 0);
  let stockNrt = Number(resourceStocks.nrt ?? 0);
  let stockMed = Number(resourceStocks.med ?? 0);
  let stockMat = Number(resourceStocks.mat ?? 0);
  const normalizedConstructions = normalizeLuneConstructions(constructions);
  const constructionProgressById = buildInitialConstructionProgress(
    normalizedConstructions,
  );

  lunes.forEach((lune) => {
    const overrides = lune.overrides || {};
    const placedConstructionIds = new Set(
      (Array.isArray(lune.placedConstructionIds)
        ? lune.placedConstructionIds
        : []
      )
        .map((constructionId) => String(constructionId))
        .filter(Boolean),
    );
    const constructionsForLune = normalizedConstructions.map((construction) => {
      const progress = constructionProgressById[construction.id] || {};
      const remainingBuilders = progress.completed
        ? 0
        : Math.max(
            0,
            Number(
              progress.remainingBuilders ?? construction.buildersRequired ?? 0,
            ) || 0,
          );
      const isStarted =
        Boolean(progress.started) || placedConstructionIds.has(construction.id);

      return {
        ...construction,
        costPaid: Boolean(progress.costPaid),
        carriedOver: Boolean(progress.started),
        remainingBuilders,
        status: progress.completed
          ? "done"
          : isStarted
            ? "in-progress"
            : "todo",
      };
    });
    const activeConstructionsForLune = constructionsForLune.filter(
      (construction) => construction.status !== "done",
    );
    const weatherCoefficients = normalizeWeatherCoefficients(lune.meteo);

    persos.forEach((perso) => {
      const override = overrides[perso.id];
      if (!override) return;

      if (override.present !== undefined) {
        presenceCourante[perso.id] = normalizePresenceValue(
          override.present,
          presenceCourante[perso.id],
        );
      }
      if (override.pv !== undefined) {
        pvCourants[perso.id] = Math.max(0, Number(override.pv) || 0);
      }
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
      if (override.combat !== undefined) {
        combatCourants[perso.id] = Number(override.combat) || 0;
      }
    });

    const rows = [];
    const constructionAssignments = [];
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
      const isAbsent = presenceCourante[perso.id] === false;
      const mortAuDebut = basePvDebut <= 0;
      const selectedDrugCode = normalizeDrugCode(ration.drogue);
      const availableDrugs = buildAvailableDrugsMap(
        remainingDrugStocksByPerso[perso.id],
      );

      const baseCapsAtStart = { ...capCourantes[perso.id] };
      const baseCombatAtStart = Number(combatCourants[perso.id] ?? 0);
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

      if (isAbsent) {
        mortText = " (ABSENT)";
        drugStatus = "Absent — ignoré dans les calculs";
        drugClassName = "inactive";

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
          isAbsent,
          classPv,
          mortText,
          hasOverride,
          availableDrugs,
          drugStatus,
          drugClassName,
        });
        return;
      }

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

          if (drugEffect.combatMultiplier || drugEffect.productionMultiplier) {
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
        if (ration.tache === "construire" && ration.constructionId) {
          constructionAssignments.push({
            persoId: perso.id,
            constructionId: String(ration.constructionId),
            baseCapsAtStart,
            baseCombatAtStart,
          });
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
        isAbsent,
        classPv,
        mortText,
        hasOverride,
        availableDrugs,
        drugStatus,
        drugClassName,
      });
    });

    const projectedStocks = {
      ...resourceStocks,
      eau: Number(resourceStocks.eau ?? 0) + luneProdEau - luneConsoEau,
      nrt: Number(resourceStocks.nrt ?? 0) + luneProdNrt - luneConsoNrt,
      med: Number(resourceStocks.med ?? 0) + luneProdMed - luneConsoMed,
      mat: Number(resourceStocks.mat ?? 0) + luneProdMat,
    };

    const assignmentsByConstructionId = constructionAssignments.reduce(
      (acc, assignment) => {
        acc[assignment.constructionId] = acc[assignment.constructionId] || [];
        acc[assignment.constructionId].push(assignment);
        return acc;
      },
      {},
    );

    const constructionStates = {};

    constructionsForLune.forEach((construction) => {
      const resourceCode = String(construction.resourceCode ?? "mat")
        .trim()
        .toLowerCase();
      const resourceCost = Math.max(0, Number(construction.resourceCost ?? 0));
      const totalBuildersRequired = Math.max(
        1,
        Math.floor(Number(construction.buildersRequired ?? 1) || 1),
      );
      const progressState = constructionProgressById[construction.id] || {
        remainingBuilders: totalBuildersRequired,
        costPaid: false,
        completed: false,
        started: false,
      };
      const assignedList = assignmentsByConstructionId[construction.id] || [];
      const assignedBuilders = assignedList.length;
      const remainingBefore = progressState.completed
        ? 0
        : Math.max(
            0,
            Number(progressState.remainingBuilders ?? totalBuildersRequired) ||
              0,
          );
      let availableResource = Number(projectedStocks[resourceCode] ?? 0);
      let costPaid = Boolean(progressState.costPaid);
      const isPlacedThisLune = placedConstructionIds.has(construction.id);
      let started =
        Boolean(progressState.started) ||
        isPlacedThisLune ||
        costPaid ||
        remainingBefore < totalBuildersRequired;
      const canStartWithResources =
        costPaid || resourceCost <= 0 || availableResource >= resourceCost;

      if (
        !progressState.completed &&
        isPlacedThisLune &&
        !costPaid &&
        canStartWithResources
      ) {
        projectedStocks[resourceCode] = availableResource - resourceCost;
        availableResource = Number(projectedStocks[resourceCode] ?? 0);
        costPaid = true;
        started = true;
      }

      const effectiveBuilders = progressState.completed
        ? 0
        : isPlacedThisLune && costPaid
          ? Math.min(assignedBuilders, remainingBefore)
          : 0;

      assignedList
        .slice(0, effectiveBuilders)
        .forEach(({ persoId, baseCapsAtStart, baseCombatAtStart }) => {
          if (construction.rewardType === "combat") {
            combatCourants[persoId] =
              baseCombatAtStart + computeIncrement(baseCombatAtStart);
          } else {
            const currentValue = Number(
              baseCapsAtStart[construction.rewardType] ?? 0,
            );
            capCourantes[persoId][construction.rewardType] =
              currentValue + computeIncrement(currentValue);
          }
        });

      const remainingBuilders = progressState.completed
        ? 0
        : Math.max(0, remainingBefore - effectiveBuilders);
      const isCompleted = costPaid && remainingBuilders === 0;
      const statusCode = isCompleted
        ? "done"
        : started || costPaid || remainingBuilders < totalBuildersRequired
          ? "in-progress"
          : "todo";

      const statusParts = [
        `${assignedBuilders}/${Math.max(1, remainingBefore)} bâtisseur(s)`,
      ];
      if (resourceCost > 0) {
        statusParts.push(
          costPaid
            ? `coût payé (${resourceCost} ${resourceCode.toUpperCase()})`
            : `coût ${resourceCost} ${resourceCode.toUpperCase()}`,
        );
      }

      if (!isPlacedThisLune && statusCode === "in-progress") {
        statusParts.push(`en pause • ${remainingBuilders} restant(s)`);
      } else if (!started) {
        statusParts.push("non posé");
      } else if (!costPaid && !canStartWithResources) {
        statusParts.push("ressource insuffisante pour poser");
      } else if (isCompleted) {
        statusParts.push("terminé");
      } else if (effectiveBuilders > 0) {
        statusParts.push(`en cours • ${remainingBuilders} restant(s)`);
      } else if (isPlacedThisLune) {
        statusParts.push(`posé • ${remainingBuilders} restant(s)`);
      } else {
        statusParts.push("à faire");
      }

      constructionProgressById[construction.id] = {
        remainingBuilders,
        costPaid,
        completed: isCompleted,
        started: started || effectiveBuilders > 0,
      };

      constructionStates[construction.id] = {
        assignedBuilders,
        buildersRequired: totalBuildersRequired,
        remainingBuilders,
        resourceCode,
        resourceCost,
        rewardType: construction.rewardType,
        isCompleted,
        statusCode,
        statusLabel: statusParts.join(" • "),
      };
    });

    Object.assign(resourceStocks, projectedStocks);
    stockEau = Number(projectedStocks.eau ?? 0);
    stockNrt = Number(projectedStocks.nrt ?? 0);
    stockMed = Number(projectedStocks.med ?? 0);
    stockMat = Number(projectedStocks.mat ?? 0);

    timeline.push({
      lune: {
        ...lune,
        constructions: activeConstructionsForLune,
      },
      rows,
      constructionStates,
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
