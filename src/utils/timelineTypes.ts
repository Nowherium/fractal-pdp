import type {
  CityMultipliers,
  ConstructionProgressById,
  Lune,
  LuneConstruction,
  Ration,
} from "../types";

export type CityMultipliersInput = Partial<CityMultipliers>;

export type TimelineRow = {
  persoId: number;
  nom: string;
  ration: Ration;
  mortAuDebut: boolean;
  isAbsent?: boolean;
  cDebut: { eau: number; nrt: number; med: number; mat: number; art?: number };
  pvDebut: number;
  pvFin: number;
  classPv?: string;
  pvDisplayDebut: string | number;
  pvDisplayFin: string | number;
  mortText?: string;
  hasOverride?: boolean;
  availableDrugs: Record<string, number>;
  drugStatus?: string;
  drugClassName?: string;
};

export type TimelineStats = {
  classEau: string;
  stockEau: number;
  deltaEau: number;
  classNrt: string;
  stockNrt: number;
  deltaNrt: number;
  classMed: string;
  stockMed: number;
  deltaMed: number;
  classMat: string;
  stockMat: number;
  deltaMat: number;
};

export type ConstructionState = {
  assignedBuilders: number;
  buildersRequired: number;
  remainingBuilders?: number;
  resourceCode: string;
  resourceCost: number;
  rewardType: LuneConstruction["rewardType"];
  isCompleted: boolean;
  statusCode?: NonNullable<LuneConstruction["status"]>;
  statusLabel: string;
};

export type TimelineSegment = {
  actualIndex?: number;
  lune: Lune;
  rows: TimelineRow[];
  stats: TimelineStats;
  constructionStates?: Record<string, ConstructionState>;
};

export type ProductionMultipliers = Pick<
  CityMultipliers,
  "eau" | "nrt" | "med" | "mat"
>;

export type WeatherInput =
  | number
  | string
  | Partial<Record<"eau" | "nrt" | "med" | "mat", unknown>>;

export type StockSnapshot = Record<string, number> & {
  eau: number;
  nrt: number;
  med: number;
  mat: number;
};

export type PersoCaps = {
  eau: number;
  nrt: number;
  med: number;
  mat: number;
  art: number;
};

export type PersoDrugStocks = Record<number, Record<string, number>>;

export type RuntimeConstructionProgress = {
  remainingBuilders: number;
  costPaid: boolean;
  completed: boolean;
  started: boolean;
};

export type ConstructionProgressSnapshot = Partial<
  ConstructionProgressById[string]
> &
  Partial<RuntimeConstructionProgress>;

export type SimulatedConstruction = LuneConstruction & {
  costPaid: boolean;
  carriedOver: boolean;
  remainingBuilders: number;
  status: NonNullable<LuneConstruction["status"]>;
  isPlacedThisLune?: boolean;
};

export type ConstructionAssignment = {
  persoId: number;
  constructionId: string;
  baseCapsAtStart: PersoCaps;
  baseCombatAtStart: number;
};

export type ProductionTotals = {
  eau: number;
  nrt: number;
  med: number;
  mat: number;
};

export type ConsumptionTotals = {
  eau: number;
  nrt: number;
  med: number;
};

export type LuneTotals = ProductionTotals & {
  consoEau: number;
  consoNrt: number;
  consoMed: number;
};

export type SimulationState = {
  pvCourants: Record<number, number>;
  capCourantes: Record<number, PersoCaps>;
  combatCourants: Record<number, number>;
  presenceCourante: Record<number, boolean>;
};

export type ProcessPersoResult = {
  row: TimelineRow;
  production: ProductionTotals;
  consumption: ConsumptionTotals;
  constructionAssignment: ConstructionAssignment | null;
};
