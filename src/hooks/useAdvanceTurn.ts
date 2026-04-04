import { useCallback, type Dispatch, type SetStateAction } from "react";

import { applyTimelineSegmentToState } from "../utils/timelineSimulation";
import type { Lune, Perso, PersoResource, Resource, Stocks } from "../types";
import type { TimelineSegment } from "../utils/timelineTypes";

interface UseAdvanceTurnParams {
  hasNoPersos: boolean;
  currentTimelineSegment: TimelineSegment | null;
  persos: Perso[];
  stocks: Stocks;
  persoResources: PersoResource[];
  resources: Resource[];
  lunes: Lune[];
  currentLune: number;
  addLune: () => void;
  setPersos: Dispatch<SetStateAction<Perso[]>>;
  setPersoResources: Dispatch<SetStateAction<PersoResource[]>>;
  setStocks: Dispatch<SetStateAction<Stocks>>;
  setVisiblePastLunes: Dispatch<SetStateAction<number>>;
  setCurrentLune: Dispatch<SetStateAction<number>>;
  savePersoEntity: (perso: Perso) => void;
  savePersoResourcesEntity: (
    persoId: number,
    nextPersoResources: PersoResource[],
  ) => void;
  saveStockEntity: (code: string, quantity: number) => void;
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
      Number(previousPerso.capart ?? 0) !== Number(perso.capart ?? 0)
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

export const useAdvanceTurn = ({
  hasNoPersos,
  currentTimelineSegment,
  persos,
  stocks,
  persoResources,
  resources,
  lunes,
  currentLune,
  addLune,
  setPersos,
  setPersoResources,
  setStocks,
  setVisiblePastLunes,
  setCurrentLune,
  savePersoEntity,
  savePersoResourcesEntity,
  saveStockEntity,
  saveCurrentLuneEntity,
  showToast,
}: UseAdvanceTurnParams) => {
  const handleAdvanceTurn = useCallback(() => {
    if (hasNoPersos) {
      return;
    }

    if (currentTimelineSegment?.endingState) {
      const advancedState = applyTimelineSegmentToState(
        persos,
        stocks,
        currentTimelineSegment,
        persoResources,
        resources,
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
    addLune,
    currentLune,
    currentTimelineSegment,
    hasNoPersos,
    lunes,
    persos,
    persoResources,
    resources,
    saveCurrentLuneEntity,
    savePersoEntity,
    savePersoResourcesEntity,
    saveStockEntity,
    setCurrentLune,
    setPersoResources,
    setPersos,
    setStocks,
    setVisiblePastLunes,
    showToast,
    stocks,
  ]);

  return { handleAdvanceTurn };
};
