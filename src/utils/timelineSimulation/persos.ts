import type {
  Lune,
  Perso,
  Ration,
  Resource,
  ToolSpecialite,
} from "../../types";
import type {
  PersoCaps,
  PersoDrugStocks,
  ProcessPersoResult,
  ProductionMultipliers,
  SimulationState,
} from "../timelineTypes";

import {
  DRUG_EFFECTS,
  formatDrugQuantity,
  getDrugConsumptionQuantity,
  getDrugLabel,
  getDrugSummary,
  normalizeDrugCode,
} from "../drugEffects";
import { computeIncrement, formatDisplayValue } from "../timelineHelpers";

import { getOrCreatePersoCaps } from "./state";

const productionTaskKeys = ["nrt", "eau", "med", "mat"] as const;
type ProductionTaskKey = (typeof productionTaskKeys)[number];

const isProductionTask = (task: string): task is ProductionTaskKey =>
  productionTaskKeys.includes(task as ProductionTaskKey);

const getAutoAssignedTask = (
  productionCaps: Pick<PersoCaps, ProductionTaskKey>,
  preferredTask: string,
): ProductionTaskKey => {
  const preferredProductionTask = isProductionTask(preferredTask)
    ? preferredTask
    : null;

  return productionTaskKeys.reduce<ProductionTaskKey>((bestTask, task) => {
    const bestValue = Number(productionCaps[bestTask] ?? 0);
    const taskValue = Number(productionCaps[task] ?? 0);

    if (taskValue > bestValue) {
      return task;
    }

    if (taskValue < bestValue) {
      return bestTask;
    }

    if (preferredProductionTask === task) {
      return task;
    }

    return bestTask;
  }, preferredProductionTask ?? productionTaskKeys[0]);
};

const buildAvailableDrugsMap = (
  remainingStocks: Record<string, number> = {},
): Record<string, number> =>
  Object.fromEntries(
    Object.entries(DRUG_EFFECTS).map(([code, effect]) => [
      code,
      effect.requiresResource === false
        ? Number.POSITIVE_INFINITY
        : Number(remainingStocks[code] ?? 0),
    ]),
  );

export const buildAvailableResourceCodes = (
  resources: Resource[] = [],
): Set<string> =>
  new Set(
    resources
      .map((resource) =>
        String(resource.code ?? "")
          .trim()
          .toLowerCase(),
      )
      .filter(Boolean),
  );

export const simulatePersoForLune = ({
  perso,
  lune,
  overrides,
  defaultRation,
  productionMultipliers,
  weatherCoefficients,
  pvCourants,
  capCourantes,
  combatCourants,
  presenceCourante,
  remainingDrugStocksByPerso,
  availableCityResourceStocks,
  availableResourceCodes,
  selectedToolMultipliers,
}: {
  perso: Perso;
  lune: Lune;
  overrides: Lune["overrides"];
  defaultRation: () => Ration;
  productionMultipliers: ProductionMultipliers;
  weatherCoefficients: ProductionMultipliers;
  pvCourants: SimulationState["pvCourants"];
  capCourantes: SimulationState["capCourantes"];
  combatCourants: SimulationState["combatCourants"];
  presenceCourante: SimulationState["presenceCourante"];
  remainingDrugStocksByPerso: PersoDrugStocks;
  availableCityResourceStocks: Record<string, number>;
  availableResourceCodes: Set<string>;
  selectedToolMultipliers: Record<ToolSpecialite, number>;
}): ProcessPersoResult => {
  const basePvDebut = Number(pvCourants[perso.id] ?? 0);
  const storedRation = {
    ...defaultRation(),
    ...(lune.rations[perso.id] ?? {}),
  };
  const override = overrides[perso.id] ?? {};
  const hasOverride = Object.keys(override).length > 0;
  const isAbsent = presenceCourante[perso.id] === false;
  const mortAuDebut = basePvDebut <= 0;
  const selectedDrugCode = normalizeDrugCode(storedRation.drogue);
  const persoDrugStocks =
    remainingDrugStocksByPerso[perso.id] ??
    (remainingDrugStocksByPerso[perso.id] = {});
  const availableDrugs = buildAvailableDrugsMap(persoDrugStocks);
  const resourceStocks = {
    eau: Number(persoDrugStocks["eau"] ?? 0),
    nrt: Number(persoDrugStocks["nrt"] ?? 0),
    med: Number(persoDrugStocks["med"] ?? 0),
  };
  const resolveRationAvailability = (resourceCode: "eau" | "nrt" | "med") => {
    if (isAbsent || mortAuDebut) {
      return false;
    }

    if (!availableResourceCodes.has(resourceCode)) {
      return true;
    }

    return (
      Number(persoDrugStocks[resourceCode] ?? 0) >= 1 ||
      Number(availableCityResourceStocks[resourceCode] ?? 0) >= 1
    );
  };
  const resolveRationSource = (
    resourceCode: "eau" | "nrt" | "med",
  ): "perso" | "ville" | "none" => {
    if (isAbsent || mortAuDebut) {
      return "none";
    }

    if (!availableResourceCodes.has(resourceCode)) {
      return "perso";
    }

    if (Number(persoDrugStocks[resourceCode] ?? 0) >= 1) {
      return "perso";
    }

    if (Number(availableCityResourceStocks[resourceCode] ?? 0) >= 1) {
      return "ville";
    }

    return "none";
  };
  const rationAvailability = {
    eau: resolveRationAvailability("eau"),
    nrt: resolveRationAvailability("nrt"),
    med: resolveRationAvailability("med"),
  };
  const rationSource = {
    eau: resolveRationSource("eau"),
    nrt: resolveRationSource("nrt"),
    med: resolveRationSource("med"),
  };
  const ration = {
    ...storedRation,
    eau: Boolean(storedRation.eau),
    nrt: Boolean(storedRation.nrt),
    med: Boolean(storedRation.med),
    dehors: Boolean(storedRation.dehors),
    produit: Boolean(storedRation.produit),
  };

  const baseCapsAtStart: PersoCaps = {
    eau: Number(capCourantes[perso.id]?.eau ?? 0),
    nrt: Number(capCourantes[perso.id]?.nrt ?? 0),
    med: Number(capCourantes[perso.id]?.med ?? 0),
    mat: Number(capCourantes[perso.id]?.mat ?? 0),
    art: Number(capCourantes[perso.id]?.art ?? 0),
    cmd: Number(capCourantes[perso.id]?.cmd ?? 0),
    combat: Number(capCourantes[perso.id]?.combat ?? 0),
  };
  const currentCaps = getOrCreatePersoCaps(
    capCourantes,
    perso.id,
    baseCapsAtStart,
  );
  const baseCombatAtStart = Number(combatCourants[perso.id] ?? 0);
  const capStateAtStart = Object.fromEntries(
    (Object.keys(baseCapsAtStart) as Array<keyof PersoCaps>).map(
      (specialite) => {
        const rawCap = Number(baseCapsAtStart[specialite] ?? 0);
        const appliedToolMultiplier = Math.max(
          1,
          Number(
            specialite !== "cmd" && specialite !== "combat"
              ? (selectedToolMultipliers[specialite] ?? 1)
              : 1,
          ),
        );

        return [
          specialite,
          {
            rawCap,
            appliedToolMultiplier,
            effectiveCap: Number((rawCap * appliedToolMultiplier).toFixed(1)),
          },
        ];
      },
    ),
  ) as Record<
    keyof PersoCaps,
    {
      rawCap: number;
      appliedToolMultiplier: number;
      effectiveCap: number;
    }
  >;
  const effectiveProductionMultipliers = ration.dehors
    ? {
        eau: 1,
        nrt: 1,
        med: 1,
        mat: 1,
      }
    : productionMultipliers;
  let cDebut: PersoCaps = {
    eau:
      capStateAtStart.eau.effectiveCap *
      effectiveProductionMultipliers.eau *
      weatherCoefficients.eau,
    nrt:
      capStateAtStart.nrt.effectiveCap *
      effectiveProductionMultipliers.nrt *
      weatherCoefficients.nrt,
    med:
      capStateAtStart.med.effectiveCap *
      effectiveProductionMultipliers.med *
      weatherCoefficients.med,
    mat:
      capStateAtStart.mat.effectiveCap *
      effectiveProductionMultipliers.mat *
      weatherCoefficients.mat,
    art: capStateAtStart.art.effectiveCap,
  };
  let pvDebut = basePvDebut;
  let pvFin = pvDebut;
  let classPv = "";
  let mortText = "";
  let drugStatus = "";
  let drugClassName = "";
  let temporaryPvBonus = 0;
  const production = { eau: 0, nrt: 0, med: 0, mat: 0 };
  const consumption = { eau: 0, nrt: 0, med: 0, mat: 0 };
  const cityConsumption = { eau: 0, nrt: 0, med: 0, mat: 0 };
  let constructionAssignment = null;

  if (isAbsent) {
    mortText = " (ABSENT)";
    drugStatus = "Absent — ignoré dans les calculs";
    drugClassName = "inactive";

    return {
      row: {
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
        resourceStocks,
        rationAvailability,
        rationSource,
        drugStatus,
        drugClassName,
      },
      production,
      consumption,
      cityConsumption,
      constructionAssignment,
    };
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
        persoDrugStocks[selectedDrugCode] = Math.max(
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

  const hasManualTask =
    typeof storedRation.tache === "string" && storedRation.tache.trim() !== "";

  if (lune.autoAssign && !hasManualTask && !isAbsent && !mortAuDebut) {
    ration.tache = getAutoAssignedTask(
      {
        nrt: cDebut.nrt,
        eau: cDebut.eau,
        med: cDebut.med,
        mat: cDebut.mat,
      },
      storedRation.tache,
    );
    ration.constructionId = null;
  }

  if (!mortAuDebut) {
    if (isProductionTask(ration.tache)) {
      production[ration.tache] += cDebut[ration.tache];
      const taskCapState = capStateAtStart[ration.tache];
      const nextRawCap =
        taskCapState.rawCap + computeIncrement(taskCapState.rawCap);
      currentCaps[ration.tache] = nextRawCap;
    }
    if (ration.tache === "construire" && ration.constructionId) {
      constructionAssignment = {
        persoId: perso.id,
        constructionId: String(ration.constructionId),
        baseCapsAtStart,
        baseCombatAtStart,
      };
    }

    const consumeRationResource = (
      resourceCode: "eau" | "nrt" | "med",
    ): "perso" | "ville" | "none" => {
      if (!ration[resourceCode]) {
        return "none";
      }

      if (!availableResourceCodes.has(resourceCode)) {
        return "perso";
      }

      const persoQuantity = Number(persoDrugStocks[resourceCode] ?? 0);
      if (persoQuantity >= 1) {
        persoDrugStocks[resourceCode] = Math.max(0, persoQuantity - 1);
        return "perso";
      }

      const cityQuantity = Number(
        availableCityResourceStocks[resourceCode] ?? 0,
      );
      if (cityQuantity >= 1) {
        availableCityResourceStocks[resourceCode] = Math.max(
          0,
          cityQuantity - 1,
        );
        return "ville";
      }

      return "none";
    };

    const eauSource = consumeRationResource("eau");
    const nrtSource = consumeRationResource("nrt");
    const medSource = consumeRationResource("med");

    ration.eau = eauSource !== "none";
    ration.nrt = nrtSource !== "none";
    ration.med = medSource !== "none";

    if (ration.eau) {
      consumption.eau += 1;
      if (eauSource === "ville") {
        cityConsumption.eau += 1;
      }
    }
    if (ration.nrt) {
      consumption.nrt += 1;
      if (nrtSource === "ville") {
        cityConsumption.nrt += 1;
      }
    }
    if (ration.med) {
      consumption.med += 1;
      if (medSource === "ville") {
        cityConsumption.med += 1;
      }
    }

    const hasFullRation = ration.eau && ration.nrt && ration.med;
    const degatsManqueRation =
      (ration.eau ? 0 : 1) + (ration.nrt ? 0 : 1) + (ration.med ? 0 : 0.5);
    const pvMax = Math.max(pvDebut, Number(perso.pvmax ?? pvDebut) || 0);
    const pvDelta = hasFullRation ? 1 : -degatsManqueRation;

    pvFin = Math.max(0, Math.min(pvMax, pvDebut + pvDelta));
    pvCourants[perso.id] = pvFin;
    classPv = pvFin <= 0 ? "danger" : pvFin <= 5 ? "warning" : "safe";
    mortText = pvFin <= 0 ? " (DÉCÈS)" : "";
  } else {
    mortText = " (CADAVRE)";
  }

  return {
    row: {
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
      resourceStocks,
      rationAvailability,
      rationSource,
      drugStatus,
      drugClassName,
    },
    production,
    consumption,
    cityConsumption,
    constructionAssignment,
  };
};
