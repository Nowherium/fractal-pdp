import { useCallback, type Dispatch, type SetStateAction } from "react";

import {
  applyTimelineSegmentToState,
  buildFrozenTimelineSnapshot,
} from "../utils/timelineSimulation";
import type {
  Action,
  Arme,
  Lune,
  Outil,
  Perso,
  PersoResource,
  Resource,
  Sac,
  Stocks,
} from "../types";
import type { TimelineSegment } from "../utils/timelineTypes";

interface UseAdvanceTurnParams {
  hasNoPersos: boolean;
  currentTimelineSegment: TimelineSegment | null;
  persos: Perso[];
  actions: Action[];
  armes: Arme[];
  outils: Outil[];
  sacs: Sac[];
  stocks: Stocks;
  persoResources: PersoResource[];
  resources: Resource[];
  lunes: Lune[];
  currentLune: number;
  addLune: () => void;
  setLunes: Dispatch<SetStateAction<Lune[]>>;
  setPersos: Dispatch<SetStateAction<Perso[]>>;
  setArmes: Dispatch<SetStateAction<Arme[]>>;
  setOutils: Dispatch<SetStateAction<Outil[]>>;
  setSacs: Dispatch<SetStateAction<Sac[]>>;
  setPersoResources: Dispatch<SetStateAction<PersoResource[]>>;
  setStocks: Dispatch<SetStateAction<Stocks>>;
  setVisiblePastLunes: Dispatch<SetStateAction<number>>;
  setCurrentLune: Dispatch<SetStateAction<number>>;
  savePersoEntity: (perso: Perso) => void;
  saveArmeEntity: (arme: Arme) => void;
  saveOutilEntity: (outil: Outil) => void;
  saveSacEntity: (sac: Sac) => void;
  savePersoResourcesEntity: (
    persoId: number,
    nextPersoResources: PersoResource[],
  ) => void;
  saveStockEntity: (code: string, quantity: number) => void;
  saveLuneEntity: (lune: Lune) => void;
  saveCurrentLuneEntity: (currentLune: number) => void;
  showToast: (message: string) => void;
}

const persistAdvancedPersos = ({
  previousPersos,
  nextPersos,
  savePersoEntity,
}: {
  previousPersos: Perso[];
  nextPersos: Perso[];
  savePersoEntity: (perso: Perso) => void;
}) => {
  nextPersos.forEach((perso) => {
    const previousPerso = previousPersos.find((item) => item.id === perso.id);
    if (!previousPerso) {
      return;
    }

    if (
      Number(previousPerso.pv ?? 0) !== Number(perso.pv ?? 0) ||
      previousPerso.present !== perso.present ||
      Number(previousPerso.combat ?? 0) !== Number(perso.combat ?? 0) ||
      Number(previousPerso.capEau ?? 0) !== Number(perso.capEau ?? 0) ||
      Number(previousPerso.capNrt ?? 0) !== Number(perso.capNrt ?? 0) ||
      Number(previousPerso.capMed ?? 0) !== Number(perso.capMed ?? 0) ||
      Number(previousPerso.capMat ?? 0) !== Number(perso.capMat ?? 0) ||
      Number(previousPerso.capArt ?? 0) !== Number(perso.capArt ?? 0)
    ) {
      savePersoEntity(perso);
    }
  });
};

const persistAdvancedPersoResources = ({
  previousPersoResources,
  nextPersoResources,
  savePersoResourcesEntity,
}: {
  previousPersoResources: PersoResource[];
  nextPersoResources: PersoResource[];
  savePersoResourcesEntity: (
    persoId: number,
    nextPersoResources: PersoResource[],
  ) => void;
}) => {
  const persoIdsWithResourceChanges = new Set(
    [...previousPersoResources, ...nextPersoResources].map((entry) =>
      Number(entry.perso_id),
    ),
  );

  persoIdsWithResourceChanges.forEach((persoId) => {
    const previousResources = previousPersoResources
      .filter((entry) => Number(entry.perso_id) === persoId)
      .sort((left, right) => left.resource_id - right.resource_id);
    const nextResources = nextPersoResources
      .filter((entry) => Number(entry.perso_id) === persoId)
      .sort((left, right) => left.resource_id - right.resource_id);

    if (JSON.stringify(previousResources) !== JSON.stringify(nextResources)) {
      savePersoResourcesEntity(persoId, nextResources);
    }
  });
};

const persistAdvancedStocks = ({
  previousStocks,
  nextStocks,
  saveStockEntity,
}: {
  previousStocks: Stocks;
  nextStocks: Stocks;
  saveStockEntity: (code: string, quantity: number) => void;
}) => {
  Object.entries(nextStocks).forEach(([code, quantity]) => {
    if (Number(previousStocks[code] ?? 0) !== Number(quantity ?? 0)) {
      saveStockEntity(code, Number(quantity ?? 0));
    }
  });
};

const persistAdvancedInventory = <TItem extends { id: number }>({
  previousItems,
  nextItems,
  saveEntity,
}: {
  previousItems: TItem[];
  nextItems: TItem[];
  saveEntity: (item: TItem) => void;
}) => {
  nextItems.forEach((item) => {
    const previousItem = previousItems.find(
      (candidate) => Number(candidate.id) === Number(item.id),
    );

    if (previousItem && JSON.stringify(previousItem) !== JSON.stringify(item)) {
      saveEntity(item);
    }
  });
};

export const useAdvanceTurn = ({
  hasNoPersos,
  currentTimelineSegment,
  persos,
  actions,
  armes,
  outils,
  sacs,
  stocks,
  persoResources,
  resources,
  lunes,
  currentLune,
  addLune,
  setLunes,
  setPersos,
  setArmes,
  setOutils,
  setSacs,
  setPersoResources,
  setStocks,
  setVisiblePastLunes,
  setCurrentLune,
  savePersoEntity,
  saveArmeEntity,
  saveOutilEntity,
  saveSacEntity,
  savePersoResourcesEntity,
  saveStockEntity,
  saveLuneEntity,
  saveCurrentLuneEntity,
  showToast,
}: UseAdvanceTurnParams) => {
  const handleAdvanceTurn = useCallback(() => {
    if (hasNoPersos) {
      return;
    }

    if (currentTimelineSegment) {
      const frozenTimeline = buildFrozenTimelineSnapshot(
        currentTimelineSegment,
      );
      const nextLunes = lunes.map((lune) =>
        Number(lune.id) === Number(currentLune)
          ? { ...lune, frozenTimeline }
          : lune,
      );
      const frozenCurrentLune = nextLunes.find(
        (lune) => Number(lune.id) === Number(currentLune),
      );

      if (frozenCurrentLune) {
        setLunes(nextLunes);
        saveLuneEntity(frozenCurrentLune);
      }
    }

    if (currentTimelineSegment?.endingState) {
      const advancedState = applyTimelineSegmentToState(
        persos,
        stocks,
        currentTimelineSegment,
        persoResources,
        resources,
        actions,
        armes,
        outils,
        sacs,
      );

      setPersos(advancedState.persos);
      persistAdvancedPersos({
        previousPersos: persos,
        nextPersos: advancedState.persos,
        savePersoEntity,
      });

      setPersoResources(advancedState.persoResources);
      persistAdvancedPersoResources({
        previousPersoResources: persoResources,
        nextPersoResources: advancedState.persoResources,
        savePersoResourcesEntity,
      });

      setArmes(advancedState.armes);
      persistAdvancedInventory({
        previousItems: armes,
        nextItems: advancedState.armes,
        saveEntity: saveArmeEntity,
      });

      setOutils(advancedState.outils);
      persistAdvancedInventory({
        previousItems: outils,
        nextItems: advancedState.outils,
        saveEntity: saveOutilEntity,
      });

      setSacs(advancedState.sacs);
      persistAdvancedInventory({
        previousItems: sacs,
        nextItems: advancedState.sacs,
        saveEntity: saveSacEntity,
      });

      setStocks(advancedState.stocks);
      persistAdvancedStocks({
        previousStocks: stocks,
        nextStocks: advancedState.stocks,
        saveStockEntity,
      });
    }

    const nextCurrentLune = Number(currentLune ?? 1) + 1;
    const maxLuneId = lunes.reduce(
      (maxValue, lune) => Math.max(maxValue, Number(lune.id) || 0),
      0,
    );

    if (maxLuneId < nextCurrentLune) {
      addLune();
    }

    setVisiblePastLunes(0);
    setCurrentLune(nextCurrentLune);
    saveCurrentLuneEntity(nextCurrentLune);
    showToast(`Passage à la lune ${nextCurrentLune}.`);
  }, [
    actions,
    addLune,
    armes,
    currentLune,
    currentTimelineSegment,
    hasNoPersos,
    lunes,
    outils,
    persos,
    persoResources,
    sacs,
    resources,
    saveArmeEntity,
    saveCurrentLuneEntity,
    saveLuneEntity,
    saveOutilEntity,
    savePersoEntity,
    savePersoResourcesEntity,
    saveSacEntity,
    saveStockEntity,
    setArmes,
    setCurrentLune,
    setLunes,
    setOutils,
    setPersoResources,
    setPersos,
    setSacs,
    setStocks,
    setVisiblePastLunes,
    showToast,
    stocks,
  ]);

  return { handleAdvanceTurn };
};
