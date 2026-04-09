import type {
  CityMultipliers,
  ConstructionProgressById,
  Lune,
  LuneConstruction,
  Ration,
} from "../types";

export type CityMultipliersInput = Partial<CityMultipliers>;

export type CraftedActionResult = {
  actionId: number | null;
  success: boolean;
  quantity?: number;
  name?: string;
  targetType?: "arme" | "outil" | "sac" | null;
  targetId?: number | null;
  reason?: string;
};

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
  resourceStocks?: Record<"eau" | "nrt" | "med", number>;
  rationAvailability?: Record<"eau" | "nrt" | "med", boolean>;
  rationSource?: Record<"eau" | "nrt" | "med", "perso" | "ville" | "none">;
  drugStatus?: string;
  drugClassName?: string;
  craftedAction?: CraftedActionResult;
};

export type TimelineStats = {
  classEau: string;
  startEau?: number;
  prodEau?: number;
  consoEau?: number;
  stockEau: number;
  deltaEau: number;
  classNrt: string;
  startNrt?: number;
  prodNrt?: number;
  consoNrt?: number;
  stockNrt: number;
  deltaNrt: number;
  classMed: string;
  startMed?: number;
  prodMed?: number;
  consoMed?: number;
  stockMed: number;
  deltaMed: number;
  classMat: string;
  startMat?: number;
  prodMat?: number;
  consoMat?: number;
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

export type TimelinePersoSnapshot = {
  pv: number;
  present: boolean;
  combat: number;
  caps: PersoCaps;
};

export type TimelineStateSnapshot = {
  persos: Record<number, TimelinePersoSnapshot>;
  stocks: StockSnapshot;
  carriedResources?: Record<number, Record<string, number>>;
};

export type TimelineSegment = {
  actualIndex?: number;
  lune: Lune;
  rows: TimelineRow[];
  stats: TimelineStats;
  constructionStates?: Record<string, ConstructionState>;
  endingState?: TimelineStateSnapshot;
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
  cmd?: number;
  combat?: number;
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
  mat: number;
};

export type LuneTotals = ProductionTotals & {
  consoEau: number;
  consoNrt: number;
  consoMed: number;
  consoMat: number;
  cityConsoEau: number;
  cityConsoNrt: number;
  cityConsoMed: number;
  cityConsoMat: number;
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
  cityConsumption: ConsumptionTotals;
  constructionAssignment: ConstructionAssignment | null;
};
