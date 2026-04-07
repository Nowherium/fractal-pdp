import type {
  Arme,
  Group,
  Lune,
  Outil,
  Perso,
  PersoArme,
  PersoOutil,
  PersoResource,
  PersoSac,
  Ration,
  Sac,
} from "../../types";
import { normalizeToolSpecialite } from "../toolUtils";
import {
  defaultRation,
  defaultWeatherCoefficients,
  type LuneInput,
  normalizeLuneAutoAssign,
  normalizeLuneToolAssignments,
  normalizeOptionalGroupId,
  normalizeProductionCapacity,
  normalizeWeatherCoefficients,
} from "./shared";
import {
  normalizeConstructionPlacements,
  syncLuneConstructionPlacements,
} from "./constructions";

export const normalizePersos = (persos: Array<Partial<Perso>> = []): Perso[] =>
  persos.map((perso) => {
    const pvmax = Math.max(0, Number(perso.pvmax ?? 0) || 0);
    const pv = Math.max(0, Number(perso.pv ?? pvmax) || 0);
    const capEau = normalizeProductionCapacity(perso.capEau ?? 0);
    const capNrt = normalizeProductionCapacity(perso.capNrt ?? 0);
    const capMed = normalizeProductionCapacity(perso.capMed ?? 0);
    const capMat = normalizeProductionCapacity(perso.capMat ?? 0);
    const capArt = normalizeProductionCapacity(perso.capArt ?? 0);
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
      capArt,
      capEauEffectif: normalizeProductionCapacity(
        perso.capEauEffectif ?? capEau,
      ),
      capNrtEffectif: normalizeProductionCapacity(
        perso.capNrtEffectif ?? capNrt,
      ),
      capMedEffectif: normalizeProductionCapacity(
        perso.capMedEffectif ?? capMed,
      ),
      capMatEffectif: normalizeProductionCapacity(
        perso.capMatEffectif ?? capMat,
      ),
      capArtEffectif: normalizeProductionCapacity(
        perso.capArtEffectif ?? capArt,
      ),
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
        meteo: normalizeWeatherCoefficients(
          lune.meteo ?? defaultWeatherCoefficients,
        ),
        rations,
        overrides: lune.overrides || {},
        constructionPlacements: normalizeConstructionPlacements(
          lune.constructionPlacements ??
            lune.placedConstructionIds ??
            lune.constructions,
          index + 1,
        ),
        constructions: [],
        autoAssign: normalizeLuneAutoAssign(lune.autoAssign, false),
        toolAssignments: normalizeLuneToolAssignments(lune.toolAssignments),
        frozenTimeline:
          lune.frozenTimeline && typeof lune.frozenTimeline === "object"
            ? lune.frozenTimeline
            : null,
      });
    });

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
    autoAssign: true,
    toolAssignments: {},
    frozenTimeline: null,
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
    specialite: normalizeToolSpecialite(outil.specialite),
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
