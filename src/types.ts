export type AppPage =
  | "reserve"
  | "effectif"
  | "groupes"
  | "group"
  | "group-view"
  | "perso"
  | "chantiers"
  | "timeline"
  | "armes"
  | "outils"
  | "sacs"
  | "resources";

export interface AppRouteState {
  page: AppPage;
  selectedPersoId: number | null;
  selectedGroupId: number | null;
}

export interface CityMultipliers {
  eau: number;
  nrt: number;
  med: number;
  mat: number;
}

export interface WeatherCoefficients {
  eau: number;
  nrt: number;
  med: number;
  mat: number;
}

export type Stocks = Record<string, number>;

export interface Resource {
  id: number;
  code: string;
  name?: string | null;
  [key: string]: unknown;
}

export interface Perso {
  id: number;
  nom: string;
  present?: boolean;
  pvmax?: number;
  pv?: number;
  capEau?: number;
  capNrt?: number;
  capMed?: number;
  capMat?: number;
  capart?: number;
  cmd?: number;
  groupId?: number | null;
  equippedWeaponId?: number | null;
  equippedBagId?: number | null;
  combat?: number;
  combatEffectif?: number;
  poidsMax?: number;
  poidsMaxEffectif?: number;
  poidsTotal?: number;
  [key: string]: unknown;
}

export interface PersoResource {
  perso_id: number;
  resource_id: number;
  quantity: number;
}

export interface Group {
  id: number;
  name: string;
  chef: number | null;
  [key: string]: unknown;
}

export interface PageTab {
  key: AppPage;
  label: string;
}

export interface Arme {
  id: number;
  name: string;
  quantity?: number;
  att?: number;
  degats?: number;
  fiabilite?: number;
  pv?: number;
  pvm?: number;
  poids?: number;
  [key: string]: unknown;
}

export interface PersoArme {
  perso_id: number;
  arme_id: number;
  equipee: boolean;
}

export interface Outil {
  id: number;
  name: string;
  quantity?: number;
  bonus?: number;
  poids?: number;
  pv?: number;
  pvmax?: number;
  specialite?: string;
  [key: string]: unknown;
}

export interface PersoOutil {
  perso_id: number;
  outil_id: number;
}

export interface Sac {
  id: number;
  name: string;
  quantity?: number;
  pv?: number;
  pvmax?: number;
  poids?: number;
  capacite?: number;
  [key: string]: unknown;
}

export interface PersoSac {
  perso_id: number;
  sac_id: number;
  equipe: boolean;
}

export interface Ration {
  eau: boolean;
  nrt: boolean;
  med: boolean;
  tache: string;
  drogue: string | null;
  constructionId?: string | null;
}

export type ConstructionStatus = "todo" | "in-progress" | "done";

export interface ConstructionDefinition {
  id: string;
  name: string;
  resourceCode: string;
  resourceCost: number;
  buildersRequired: number;
  rewardType: "eau" | "nrt" | "med" | "mat" | "art" | "combat";
}

export interface ConstructionProgress {
  constructionId: string;
  status: ConstructionStatus;
  costPaid?: boolean;
  remainingBuilders?: number;
  startedAtLune?: number | null;
  completedAtLune?: number | null;
}

export type ConstructionProgressById = Record<string, ConstructionProgress>;

export interface LuneConstruction extends ConstructionDefinition {
  status?: ConstructionStatus;
  costPaid?: boolean;
  remainingBuilders?: number;
  carriedOver?: boolean;
}

export interface LunePlacement {
  luneId: number;
  constructionId: string;
  isPlaced: boolean;
}

export interface Lune {
  id: number;
  meteo: WeatherCoefficients;
  rations: Record<string, Ration>;
  overrides: Record<string, Record<string, number | boolean>>;
  constructionPlacements: LunePlacement[];
  constructions: LuneConstruction[];
}
