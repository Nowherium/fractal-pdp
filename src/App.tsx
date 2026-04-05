import { useMemo, useState } from "react";
import SaveBar from "./components/SaveBar";
import PageTabs from "./components/PageTabs";
import AppPageContent from "./components/AppPageContent";
import ToastViewport from "./components/ui/ToastViewport";
import ExchangeModeToggle from "./components/shared/ExchangeModeToggle";
import TimelineControls from "./components/TimelineControls";
import {
  buildConstructionProgressById,
  defaultRation,
} from "./utils/stateUtils";
import { simulateTimeline } from "./utils/timelineSimulation";
import {
  useAppEntitySaves,
  useInitialAppLoad,
} from "./hooks/useAppPersistence";
import { useAppState } from "./hooks/useAppState";
import { useDerivedPersoState } from "./hooks/useDerivedPersoState";
import { useAdvanceTurn } from "./hooks/useAdvanceTurn";
import { useAppActionToasts } from "./hooks/useAppActionToasts";
import { useAppDataManagement } from "./hooks/useAppDataManagement";
import { useGroupActions } from "./hooks/useGroupActions";
import { useInventoryActions } from "./hooks/useInventoryActions";
import { usePersoActions } from "./hooks/usePersoActions";
import { useResourceActions } from "./hooks/useResourceActions";
import { useTerrainActions } from "./hooks/useTerrainActions";
import { useTimelineActions } from "./hooks/useTimelineActions";
import { useEnsureTimelineLunes } from "./hooks/useEnsureTimelineLunes";
import { combineCityAndTerrainMultipliers } from "./utils/terrainUtils";
import type { PageTab } from "./types";

function App() {
  const {
    resources,
    setResources,
    persos,
    setPersos,
    persoResources,
    setPersoResources,
    constructions,
    setConstructions,
    lunes,
    setLunes,
    stocks,
    setStocks,
    cityMultipliers,
    setCityMultipliers,
    terrains,
    setTerrains,
    currentTerrainId,
    setCurrentTerrainId,
    groups,
    setGroups,
    armes,
    setArmes,
    persoArmes,
    setPersoArmes,
    outils,
    setOutils,
    persoOutils,
    setPersoOutils,
    sacs,
    setSacs,
    persoSacs,
    setPersoSacs,
    nextPersoId,
    setNextPersoId,
    currentLune,
    setCurrentLune,
    page,
    setPage,
    selectedPersoId,
    setSelectedPersoId,
    selectedGroupId,
    setSelectedGroupId,
    openOverrides,
    setOpenOverrides,
    saveStatus,
    setSaveStatus,
    ready,
    setReady,
    loadError,
    setLoadError,
    fileInputRef,
    isHydratingRef,
    setCompleteState,
  } = useAppState();

  useInitialAppLoad({
    setCompleteState,
    setSaveStatus,
    setLoadError,
    setReady,
  });

  const {
    saveCityMultipliersEntity,
    saveTerrainsEntity,
    saveCurrentTerrainEntity,
    saveCurrentLuneEntity,
    saveConstructionsEntity,
    saveResourceEntity,
    deleteResourceEntity,
    savePersoEntity,
    deletePersoEntity,
    savePersoResourcesEntity,
    saveGroupEntity,
    deleteGroupEntity,
    saveGroupMembersEntity,
    saveArmeEntity,
    deleteArmeEntity,
    savePersoArmesEntity,
    saveOutilEntity,
    deleteOutilEntity,
    savePersoOutilsEntity,
    saveSacEntity,
    deleteSacEntity,
    savePersoSacsEntity,
    saveLuneEntity,
    deleteLuneEntity,
    saveStockEntity,
  } = useAppEntitySaves({
    ready,
    isHydratingRef,
    setSaveStatus,
  });

  useDerivedPersoState({
    persos,
    resources,
    armes,
    persoArmes,
    outils,
    persoOutils,
    sacs,
    persoSacs,
    persoResources,
    setPersos,
  });

  const [visiblePastLunes, setVisiblePastLunes] = useState<number>(0);
  const [exchangeCityStocksWithPersos, setExchangeCityStocksWithPersos] =
    useState(false);
  const [showEffectifStocks, setShowEffectifStocks] = useState(false);
  const [toasts, setToasts] = useState<Array<{ id: number; message: string }>>(
    [],
  );

  const showToast = (message: string) => {
    const id = Date.now() + Math.random();
    setToasts((previous) => [...previous, { id, message }]);
    window.setTimeout(() => {
      setToasts((previous) => previous.filter((toast) => toast.id !== id));
    }, 2600);
  };

  useEnsureTimelineLunes({
    currentLune,
    lunes,
    persos,
    constructions,
    setLunes,
    saveLuneEntity,
  });

  const {
    addResource,
    updateResource,
    removeResource,
    getResourceDeleteGuard,
  } = useResourceActions({
    resources,
    stocks,
    persoResources,
    constructions,
    lunes,
    setResources,
    setStocks,
    saveResourceEntity,
    deleteResourceEntity,
  });

  const { addTerrain, updateTerrain, removeTerrain } = useTerrainActions({
    terrains,
    currentTerrainId,
    setTerrains,
    setCurrentTerrainId,
    saveTerrainsEntity,
    saveCurrentTerrainEntity,
  });

  const {
    openPersoPage,
    closePersoPage,
    handlePersoUpdateById,
    handlePersoResourceUpdate,
    addPerso,
    removePerso,
  } = usePersoActions({
    persos,
    groups,
    resources,
    sacs,
    stocks,
    exchangeCityStocksWithPersos,
    persoResources,
    lunes,
    nextPersoId,
    setPersos,
    setGroups,
    setPersoResources,
    setStocks,
    setLunes,
    setPage,
    setSelectedPersoId,
    setOpenOverrides,
    setNextPersoId,
    savePersoEntity,
    deletePersoEntity,
    savePersoResourcesEntity,
    saveStockEntity,
    saveLuneEntity,
  });

  const {
    addLune,
    removeLune,
    updateRation,
    addConstruction,
    updateConstruction,
    removeConstruction,
    toggleConstructionPlacement,
    updateLuneWeather,
    toggleLuneAutoAssign,
    updateLuneToolAssignment,
    toggleOverrideMenu,
    setOverride,
    clearOverrides,
  } = useTimelineActions({
    persos,
    constructions,
    lunes,
    currentLune,
    setConstructions,
    setLunes,
    setOpenOverrides,
    saveLuneEntity,
    deleteLuneEntity,
    saveConstructionsEntity,
  });

  const {
    openGroupPage,
    openGroupViewPage,
    closeGroupPage,
    addGroup,
    removeGroup,
    handleGroupMembersUpdate,
    handleGroupUpdateSafe,
    setGroupPresence,
  } = useGroupActions({
    groups,
    persos,
    setGroups,
    setPersos,
    setSelectedGroupId,
    setPage,
    saveGroupEntity,
    deleteGroupEntity,
    saveGroupMembersEntity,
    savePersoEntity,
  });

  const {
    handlePersoWeaponsUpdate,
    handlePersoToolsUpdate,
    handlePersoBagsUpdate,
    addArme,
    updateArme,
    removeArme,
    addOutil,
    updateOutil,
    removeOutil,
    addSac,
    updateSac,
    removeSac,
  } = useInventoryActions({
    armes,
    setArmes,
    persoArmes,
    setPersoArmes,
    outils,
    setOutils,
    persoOutils,
    setPersoOutils,
    sacs,
    setSacs,
    persoSacs,
    setPersoSacs,
    setPersos,
    saveArmeEntity,
    deleteArmeEntity,
    savePersoArmesEntity,
    saveOutilEntity,
    deleteOutilEntity,
    savePersoOutilsEntity,
    saveSacEntity,
    deleteSacEntity,
    savePersoSacsEntity,
  });

  const constructionProgress = useMemo(
    () => buildConstructionProgressById(constructions, lunes, currentLune),
    [constructions, lunes, currentLune],
  );

  const {
    handleStockChange,
    handleCityMultiplierChange,
    handleCurrentTerrainChange,
    handleCurrentLuneChange,
    exportData,
    importData,
    resetData,
  } = useAppDataManagement({
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
    terrains,
    currentTerrainId,
    groups,
    armes,
    persoArmes,
    outils,
    persoOutils,
    sacs,
    persoSacs,
    setStocks,
    setCityMultipliers,
    setCurrentTerrainId,
    setVisiblePastLunes,
    setCurrentLune,
    fileInputRef,
    setCompleteState,
    setSaveStatus,
    saveStockEntity,
    saveCityMultipliersEntity,
    saveCurrentTerrainEntity,
    saveCurrentLuneEntity,
    showToast,
  });

  const selectedTerrain = useMemo(
    () => terrains.find((terrain) => terrain.id === currentTerrainId) ?? null,
    [terrains, currentTerrainId],
  );

  const effectiveCityMultipliers = useMemo(
    () => combineCityAndTerrainMultipliers(cityMultipliers, selectedTerrain),
    [cityMultipliers, selectedTerrain],
  );

  const timelineData = useMemo(
    () =>
      simulateTimeline(
        persos,
        lunes,
        stocks,
        defaultRation,
        constructions,
        resources,
        persoResources,
        effectiveCityMultipliers,
        currentLune,
        constructionProgress,
        outils,
      ),
    [
      persos,
      lunes,
      stocks,
      constructions,
      resources,
      persoResources,
      effectiveCityMultipliers,
      currentLune,
      constructionProgress,
      outils,
    ],
  );

  const currentTimelineSegment = useMemo(
    () =>
      timelineData.find(
        (segment) => Number(segment.lune.id) === Number(currentLune),
      ) || null,
    [timelineData, currentLune],
  );

  const earliestVisibleLune = Math.max(
    1,
    Number(currentLune ?? 1) - visiblePastLunes,
  );

  const visibleTimelineData = useMemo(
    () =>
      timelineData
        .map((segment, actualIndex) => ({ ...segment, actualIndex }))
        .filter(
          (segment) => Number(segment.lune.id) >= Number(earliestVisibleLune),
        ),
    [timelineData, earliestVisibleLune],
  );

  const {
    handleAddResource,
    handleRemoveResource,
    handleAddPerso,
    handleRemovePerso,
    handleAddGroup,
    handleRemoveGroup,
    handleAddConstruction,
    handleRemoveConstruction,
    handleAddLune,
    handleRemoveLune,
    handleAddArme,
    handleRemoveArme,
    handleAddOutil,
    handleRemoveOutil,
    handleAddSac,
    handleRemoveSac,
  } = useAppActionToasts({
    resources,
    persos,
    groups,
    constructions,
    lunes,
    armes,
    outils,
    sacs,
    addResource,
    removeResource,
    addPerso,
    removePerso,
    addGroup,
    removeGroup,
    addConstruction,
    removeConstruction,
    addLune,
    removeLune,
    addArme,
    removeArme,
    addOutil,
    removeOutil,
    addSac,
    removeSac,
    showToast,
  });

  const hasNoPersos = persos.length === 0;
  const currentLuneValue = Math.max(1, Number(currentLune ?? 1));
  const maxVisiblePastLunes = Math.max(0, currentLuneValue - 1);
  const areTurnControlsDisabled = hasNoPersos;
  const timelineControlsDisabledTitle = areTurnControlsDisabled
    ? "Aucun perso dans les effectifs."
    : undefined;
  const canShowMorePastLunes = visiblePastLunes < maxVisiblePastLunes;
  const canShowLessPastLunes = visiblePastLunes > 0;

  const handleShowPastLunes = () => {
    setVisiblePastLunes((previous) =>
      Math.min(maxVisiblePastLunes, previous + 1),
    );
  };

  const handleHidePastLunes = () => {
    setVisiblePastLunes((previous) => Math.max(0, previous - 1));
  };

  const handleBackToCurrentLune = () => {
    setVisiblePastLunes(0);
  };

  const { handleAdvanceTurn } = useAdvanceTurn({
    hasNoPersos,
    currentTimelineSegment,
    persos,
    stocks,
    persoResources,
    resources,
    lunes,
    currentLune,
    addLune,
    setLunes,
    setPersos,
    setPersoResources,
    setStocks,
    setVisiblePastLunes,
    setCurrentLune,
    savePersoEntity,
    savePersoResourcesEntity,
    saveStockEntity,
    saveLuneEntity,
    saveCurrentLuneEntity,
    showToast,
  });

  const pages: PageTab[] = [
    { key: "reserve", label: "1. Ville" },
    { key: "effectif", label: "2. Effectif" },
    { key: "groupes", label: "3. Groupe" },
    { key: "chantiers", label: "4. Chantiers" },
    { key: "timeline", label: "5. Ligne du temps" },
    { key: "armes", label: "6. Armes" },
    { key: "outils", label: "7. Outils" },
    { key: "sacs", label: "8. Sacs" },
    { key: "resources", label: "9. Ressources" },
    { key: "terrains", label: "10. Terrains" },
  ];

  return (
    <>
      <ToastViewport toasts={toasts} />
      <h1>Fractal - Planificateur de Faction (V9)</h1>
      <SaveBar
        saveStatus={saveStatus}
        exportData={exportData}
        importData={importData}
        resetData={resetData}
        fileInputRef={fileInputRef}
      />

      {loadError ? (
        <div className='mb-2.5 text-[0.85em] italic text-[#888]'>
          {loadError}
        </div>
      ) : null}

      <TimelineControls
        visiblePastLunes={visiblePastLunes}
        canShowMorePastLunes={canShowMorePastLunes}
        canShowLessPastLunes={canShowLessPastLunes}
        currentLune={currentLune}
        areTurnControlsDisabled={areTurnControlsDisabled}
        disabledTitle={timelineControlsDisabledTitle}
        onShowPastLunes={handleShowPastLunes}
        onHidePastLunes={handleHidePastLunes}
        onBackToCurrentLune={handleBackToCurrentLune}
        onCurrentLuneChange={(value) => handleCurrentLuneChange(value)}
        onAdvanceTurn={handleAdvanceTurn}
      />

      <PageTabs pages={pages} currentPage={page} setPage={setPage} />

      <ExchangeModeToggle
        checked={exchangeCityStocksWithPersos}
        onChange={setExchangeCityStocksWithPersos}
      />

      <AppPageContent
        page={page}
        reserveProps={{
          resources,
          stocks,
          cityMultipliers,
          terrains,
          currentTerrainId,
          handleStockChange,
          handleCityMultiplierChange,
          handleCurrentTerrainChange,
          armes,
          persoArmes,
          outils,
          persoOutils,
          sacs,
          persoSacs,
        }}
        resourcesProps={{
          resources,
          addResource: handleAddResource,
          updateResource,
          removeResource: handleRemoveResource,
          getResourceDeleteGuard,
        }}
        effectifProps={{
          persos,
          resources,
          persoResources,
          removePerso: handleRemovePerso,
          addPerso: handleAddPerso,
          openPersoPage,
          updatePersoPresence: (persoId, isPresent) =>
            handlePersoUpdateById(persoId, "present", isPresent),
          handlePersoResourceUpdate,
          showStocks: showEffectifStocks,
          setShowStocks: setShowEffectifStocks,
        }}
        groupProps={{
          list: {
            groups,
            persos,
            openGroupPage,
            openGroupViewPage,
            addGroup: handleAddGroup,
            removeGroup: handleRemoveGroup,
            setGroupPresence,
          },
          edit: {
            persos,
            handleGroupUpdate: handleGroupUpdateSafe,
            handleGroupMembersUpdate,
            closePage: closeGroupPage,
          },
          view: {
            persos,
            openEditPage: openGroupPage,
            closePage: closeGroupPage,
          },
          groups,
          selectedGroupId,
        }}
        persoProps={{
          persos,
          selectedPersoId,
          resources,
          groups,
          armes,
          persoArmes,
          outils,
          persoOutils,
          sacs,
          persoSacs,
          persoResources,
          handlePersoUpdate: handlePersoUpdateById,
          handlePersoResourceUpdate,
          handlePersoWeaponsUpdate,
          handlePersoToolsUpdate,
          handlePersoBagsUpdate,
          closePage: closePersoPage,
        }}
        chantiersProps={{
          constructions,
          resources,
          constructionProgress,
          constructionStates: currentTimelineSegment?.constructionStates || {},
          addConstruction: handleAddConstruction,
          updateConstruction,
          removeConstruction: handleRemoveConstruction,
        }}
        timelineProps={{
          currentLune,
          resources,
          outils,
          constructions,
          timelineData: visibleTimelineData,
          removeLune: handleRemoveLune,
          updateLuneWeather,
          toggleLuneAutoAssign,
          updateLuneToolAssignment,
          updateRation,
          toggleConstructionPlacement,
          toggleOverrideMenu,
          openOverrides,
          setOverride,
          clearOverrides,
          addLune: handleAddLune,
        }}
        weaponsProps={{
          armes,
          addArme: handleAddArme,
          updateArme,
          removeArme: handleRemoveArme,
        }}
        toolsProps={{
          outils,
          addOutil: handleAddOutil,
          updateOutil,
          removeOutil: handleRemoveOutil,
        }}
        bagsProps={{
          sacs,
          addSac: handleAddSac,
          updateSac,
          removeSac: handleRemoveSac,
        }}
        terrainsProps={{
          terrains,
          addTerrain,
          updateTerrain,
          removeTerrain,
        }}
      />
    </>
  );
}

export default App;
