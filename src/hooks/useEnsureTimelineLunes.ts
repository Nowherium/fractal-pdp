import { useEffect, type Dispatch, type SetStateAction } from "react";

import type { Lune, LuneConstruction, Perso } from "../types";
import {
  createLune,
  getPlacedConstructionIdsForLune,
  normalizeConstructionPlacements,
  syncLuneConstructionPlacements,
} from "../utils/stateUtils";

interface UseEnsureTimelineLunesParams {
  currentLune: number;
  lunes: Lune[];
  persos: Perso[];
  constructions: LuneConstruction[];
  setLunes: Dispatch<SetStateAction<Lune[]>>;
  saveLuneEntity: (lune: Lune) => void;
}

export const useEnsureTimelineLunes = ({
  currentLune,
  lunes,
  persos,
  constructions,
  setLunes,
  saveLuneEntity,
}: UseEnsureTimelineLunesParams) => {
  useEffect(() => {
    const targetCurrentLune = Math.max(1, Number(currentLune ?? 1));
    const maxLuneId = lunes.reduce(
      (maxValue, lune) => Math.max(maxValue, Number(lune.id) || 0),
      0,
    );

    if (maxLuneId >= targetCurrentLune) {
      return;
    }

    const nextLunes = [...lunes];

    for (let luneId = maxLuneId + 1; luneId <= targetCurrentLune; luneId += 1) {
      const inheritedPlacedConstructionIds = getPlacedConstructionIdsForLune(
        nextLunes[nextLunes.length - 1],
      ).filter((id) => constructions.some((item) => item.id === id));

      const newLune = syncLuneConstructionPlacements({
        ...createLune(persos, luneId),
        constructionPlacements: normalizeConstructionPlacements(
          inheritedPlacedConstructionIds,
          luneId,
        ),
      });

      nextLunes.push(newLune);
      saveLuneEntity(newLune);
    }

    setLunes(nextLunes);
  }, [currentLune, lunes, persos, constructions, setLunes, saveLuneEntity]);
};
