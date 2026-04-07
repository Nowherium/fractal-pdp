import type { Arme, LuneConstruction, Outil, Perso, Sac } from "../types";

export const defaultPersoValues = {
  nom: "Nouveau perso",
  present: true,
  pvmax: 5,
  pv: 5,
  capEau: 1,
  capNrt: 1,
  capMed: 0,
  capMat: 1,
  capArt: 0,
  capEauEffectif: 1,
  capNrtEffectif: 1,
  capMedEffectif: 0,
  capMatEffectif: 1,
  capArtEffectif: 0,
  cmd: 0,
  groupId: null,
  equippedWeaponId: null,
  equippedBagId: null,
  combat: 0,
  combatEffectif: 0,
  poidsMax: 20,
  poidsMaxEffectif: 20,
  poidsTotal: 0,
  esclave: false,
} satisfies Omit<Perso, "id">;

export const createDefaultPerso = (id: number): Perso =>
  ({ id, ...defaultPersoValues }) as Perso;

export const defaultArmeValues = {
  name: "Nouvelle arme",
  att: 1,
  degats: 0,
  fiabilite: 0,
  pv: 10,
  pvm: 10,
  poids: 0,
  quantity: 1,
} satisfies Omit<Arme, "id">;

export const createDefaultArme = (id: number): Arme =>
  ({ id, ...defaultArmeValues }) as Arme;

export const defaultOutilValues = {
  name: "Nouvel outil",
  specialite: "eau",
  bonus: 1,
  pv: 5,
  pvmax: 5,
  poids: 0.5,
  quantity: 1,
} satisfies Omit<Outil, "id">;

export const createDefaultOutil = (id: number): Outil =>
  ({ id, ...defaultOutilValues }) as Outil;

export const defaultSacValues = {
  name: "Nouveau sac",
  pv: 5,
  pvmax: 5,
  poids: 1,
  capacite: 6,
  quantity: 1,
} satisfies Omit<Sac, "id">;

export const createDefaultSac = (id: number): Sac =>
  ({ id, ...defaultSacValues }) as Sac;

export const defaultConstructionValues = {
  resourceCode: "mat",
  resourceCost: 20,
  buildersRequired: 3,
  rewardType: "mat",
  status: "todo",
  costPaid: false,
  remainingBuilders: 3,
  carriedOver: false,
} satisfies Omit<LuneConstruction, "id" | "name">;

export const createDefaultConstruction = (
  sequence: number,
): LuneConstruction => ({
  id: `construction-${sequence}`,
  name: `Chantier ${sequence}`,
  ...defaultConstructionValues,
});
