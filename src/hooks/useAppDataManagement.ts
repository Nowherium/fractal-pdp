import {
  useCallback,
  type ChangeEvent,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from "react";

import type {
  Arme,
  CityMultipliers,
  Group,
  Lune,
  LuneConstruction,
  Outil,
  Perso,
  PersoArme,
  PersoOutil,
  PersoResource,
  PersoSac,
  Resource,
  Sac,
  Stocks,
} from "../types";
import {
  exportStateData,
  importStateFile,
  resetAppData,
} from "../utils/appDataIO";
import {
  normalizeCurrentLune,
  normalizeStockQuantity,
} from "../utils/stateUtils";

interface UseAppDataManagementParams {
  resources: Resource[];
  persos: Perso[];
  persoResources: PersoResource[];
  constructions: LuneConstruction[];
  constructionProgress: Record<string, unknown>;
  lunes: Lune[];
  currentLune: number;
  nextPersoId: number;
  stocks: Stocks;
  cityMultipliers: CityMultipliers;
  groups: Group[];
  armes: Arme[];
  persoArmes: PersoArme[];
  outils: Outil[];
  persoOutils: PersoOutil[];
  sacs: Sac[];
  persoSacs: PersoSac[];
  setStocks: Dispatch<SetStateAction<Stocks>>;
  setCityMultipliers: Dispatch<SetStateAction<CityMultipliers>>;
  setVisiblePastLunes: Dispatch<SetStateAction<number>>;
  setCurrentLune: Dispatch<SetStateAction<number>>;
  fileInputRef: RefObject<HTMLInputElement>;
  setCompleteState: (state: unknown) => void;
  setSaveStatus: Dispatch<SetStateAction<string>>;
  saveStockEntity: (code: string, quantity: number) => void;
  saveCityMultipliersEntity: (cityMultipliers: CityMultipliers) => void;
  saveCurrentLuneEntity: (currentLune: number) => void;
  showToast: (message: string) => void;
}

export const useAppDataManagement = ({
  resources,
  persos,
  persoResources,
  constructions,
  constructionProgress,
  lunes,
  currentLune,
  nextPersoId,
  stocks,
  cityMultipliers,
  groups,
  armes,
  persoArmes,
  outils,
  persoOutils,
  sacs,
  persoSacs,
  setStocks,
  setCityMultipliers,
  setVisiblePastLunes,
  setCurrentLune,
  fileInputRef,
  setCompleteState,
  setSaveStatus,
  saveStockEntity,
  saveCityMultipliersEntity,
  saveCurrentLuneEntity,
  showToast,
}: UseAppDataManagementParams) => {
  const handleStockChange = useCallback(
    (field: string, rawValue: string | number) => {
      const value = normalizeStockQuantity(rawValue);
      setStocks((previous) => ({
        ...previous,
        [field]: value,
      }));
      saveStockEntity(field, value);
    },
    [saveStockEntity, setStocks],
  );

  const handleCityMultiplierChange = useCallback(
    (field: keyof CityMultipliers, rawValue: string | number) => {
      const parsedValue = Number(rawValue);
      const value = Number.isFinite(parsedValue) ? Math.max(0, parsedValue) : 0;

      setCityMultipliers((previous) => {
        const next = { ...previous, [field]: value };
        saveCityMultipliersEntity(next);
        return next;
      });
    },
    [saveCityMultipliersEntity, setCityMultipliers],
  );

  const handleCurrentLuneChange = useCallback(
    (rawValue: string | number) => {
      const nextCurrentLune = normalizeCurrentLune(rawValue);
      setVisiblePastLunes(0);
      setCurrentLune(nextCurrentLune);
      saveCurrentLuneEntity(nextCurrentLune);
    },
    [saveCurrentLuneEntity, setCurrentLune, setVisiblePastLunes],
  );

  const exportData = useCallback(() => {
    exportStateData({
      resources,
      persos,
      persoResources,
      constructions,
      constructionProgress,
      lunes,
      currentLune,
      nextPersoId,
      stocks,
      cityMultipliers,
      groups,
      armes,
      persoArmes,
      outils,
      persoOutils,
      sacs,
      persoSacs,
    });
    showToast("Export réussi.");
  }, [
    armes,
    cityMultipliers,
    constructionProgress,
    constructions,
    currentLune,
    groups,
    lunes,
    nextPersoId,
    persoArmes,
    persoOutils,
    persoResources,
    persoSacs,
    persos,
    resources,
    sacs,
    showToast,
    stocks,
    outils,
  ]);

  const importData = useCallback(
    (event: ChangeEvent<HTMLInputElement>) =>
      importStateFile(event, {
        fileInputRef,
        setCompleteState,
        onSuccess: () => showToast("Import réussi."),
      }),
    [fileInputRef, setCompleteState, showToast],
  );

  const resetData = useCallback(async () => {
    await resetAppData({
      setCompleteState,
      setSaveStatus,
    });
    showToast("Données réinitialisées.");
  }, [setCompleteState, setSaveStatus, showToast]);

  return {
    handleStockChange,
    handleCityMultiplierChange,
    handleCurrentLuneChange,
    exportData,
    importData,
    resetData,
  };
};
