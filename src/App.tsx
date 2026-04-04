import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import SaveBar from "./components/SaveBar";
import PageTabs from "./components/PageTabs";
import ReservePage from "./components/ReservePage";
import ResourcesPage from "./components/ResourcesPage";
import ToastViewport from "./components/ui/ToastViewport";
import EffectifPage from "./components/EffectifPage";
import PersoPage from "./components/PersoPage";
import GroupPage from "./components/GroupPage";
import GroupEditPage from "./components/GroupEditPage";
import GroupViewPage from "./components/GroupViewPage";
import ChantiersPage from "./components/ChantiersPage";
import ExchangeModeToggle from "./components/shared/ExchangeModeToggle";
import TimelineControls from "./components/TimelineControls";
import TimelinePage from "./components/TimelinePage";
import WeaponsPage from "./components/WeaponsPage";
import ToolsPage from "./components/ToolsPage";
import BagsPage from "./components/BagsPage";
import {
  buildConstructionProgressById,
  createLune,
  defaultRation,
  getPlacedConstructionIdsForLune,
  normalizeConstructionPlacements,
  normalizeCurrentLune,
  normalizeStockQuantity,
  syncLuneConstructionPlacements,
} from "./utils/stateUtils";
import {
  applyTimelineSegmentToState,
  simulateTimeline,
} from "./utils/timelineSimulation";
import {
  exportStateData,
  importStateFile,
  resetAppData,
} from "./utils/appDataIO";
import {
  useAppEntitySaves,
  useInitialAppLoad,
} from "./hooks/useAppPersistence";
import { useAppState } from "./hooks/useAppState";
import { useDerivedPersoState } from "./hooks/useDerivedPersoState";
import { useAppActionToasts } from "./hooks/useAppActionToasts";
import { useGroupActions } from "./hooks/useGroupActions";
import { useInventoryActions } from "./hooks/useInventoryActions";
import { usePersoActions } from "./hooks/usePersoActions";
import { useResourceActions } from "./hooks/useResourceActions";
import { useTimelineActions } from "./hooks/useTimelineActions";
import type { CityMultipliers, PageTab } from "./types";

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

  const handleStockChange = (field: string, rawValue: string | number) => {
    const value = normalizeStockQuantity(rawValue);
    setStocks((previous: Record<string, number>) => ({
      ...previous,
      [field]: value,
    }));
    saveStockEntity(field, value);
  };

  const handleCityMultiplierChange = (
    field: keyof CityMultipliers,
    rawValue: string | number,
  ) => {
    const parsedValue = Number(rawValue);
    const value = Number.isFinite(parsedValue) ? Math.max(0, parsedValue) : 0;

    setCityMultipliers((previous: CityMultipliers) => {
      const next = { ...previous, [field]: value };
      saveCityMultipliersEntity(next);
      return next;
    });
  };

  const handleCurrentLuneChange = (rawValue: string | number) => {
    const nextCurrentLune = normalizeCurrentLune(rawValue);
    setVisiblePastLunes(0);
    setCurrentLune(nextCurrentLune);
    saveCurrentLuneEntity(nextCurrentLune);
  };

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
    updateLuneGlobal,
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

  const exportData = () => {
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
  };

  const importData = (event: ChangeEvent<HTMLInputElement>) =>
    importStateFile(event, {
      fileInputRef,
      setCompleteState,
      onSuccess: () => showToast("Import réussi."),
    });

  const resetData = async () => {
    await resetAppData({
      setCompleteState,
      setSaveStatus,
    });
    showToast("Données réinitialisées.");
  };

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
        cityMultipliers,
        currentLune,
        constructionProgress,
      ),
    [
      persos,
      lunes,
      stocks,
      constructions,
      resources,
      persoResources,
      cityMultipliers,
      currentLune,
      constructionProgress,
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

  const handleAdvanceTurn = () => {
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
      advancedState.persos.forEach((perso) => {
        const previousPerso = persos.find((item) => item.id === perso.id);
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

      setPersoResources(advancedState.persoResources);
      const persoIdsWithResourceChanges = new Set(
        [...persoResources, ...advancedState.persoResources].map((entry) =>
          Number(entry.perso_id),
        ),
      );

      persoIdsWithResourceChanges.forEach((persoId) => {
        const previousResources = persoResources
          .filter((entry) => Number(entry.perso_id) === persoId)
          .sort((left, right) => left.resource_id - right.resource_id);
        const nextResources = advancedState.persoResources
          .filter((entry) => Number(entry.perso_id) === persoId)
          .sort((left, right) => left.resource_id - right.resource_id);

        if (
          JSON.stringify(previousResources) !== JSON.stringify(nextResources)
        ) {
          savePersoResourcesEntity(persoId, nextResources);
        }
      });

      setStocks(advancedState.stocks);
      Object.entries(advancedState.stocks).forEach(([code, quantity]) => {
        if (Number(stocks[code] ?? 0) !== Number(quantity ?? 0)) {
          saveStockEntity(code, Number(quantity ?? 0));
        }
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
  };

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

      {page === "reserve" && (
        <ReservePage
          resources={resources}
          stocks={stocks}
          cityMultipliers={cityMultipliers}
          handleStockChange={handleStockChange}
          handleCityMultiplierChange={handleCityMultiplierChange}
          armes={armes}
          persoArmes={persoArmes}
          outils={outils}
          persoOutils={persoOutils}
          sacs={sacs}
          persoSacs={persoSacs}
        />
      )}

      {page === "resources" && (
        <ResourcesPage
          resources={resources}
          addResource={handleAddResource}
          updateResource={updateResource}
          removeResource={handleRemoveResource}
          getResourceDeleteGuard={getResourceDeleteGuard}
        />
      )}

      {page === "effectif" && (
        <EffectifPage
          persos={persos}
          resources={resources}
          persoResources={persoResources}
          removePerso={handleRemovePerso}
          addPerso={handleAddPerso}
          openPersoPage={openPersoPage}
          updatePersoPresence={(persoId, isPresent) =>
            handlePersoUpdateById(persoId, "present", isPresent)
          }
          handlePersoResourceUpdate={handlePersoResourceUpdate}
          showStocks={showEffectifStocks}
          setShowStocks={setShowEffectifStocks}
        />
      )}

      {page === "groupes" && (
        <GroupPage
          groups={groups}
          persos={persos}
          openGroupPage={openGroupPage}
          openGroupViewPage={openGroupViewPage}
          addGroup={handleAddGroup}
          removeGroup={handleRemoveGroup}
          setGroupPresence={setGroupPresence}
        />
      )}

      {page === "group-view" && (
        <GroupViewPage
          group={groups.find((g: { id: number }) => g.id === selectedGroupId)}
          persos={persos}
          openEditPage={openGroupPage}
          closePage={closeGroupPage}
        />
      )}

      {page === "group" && (
        <GroupEditPage
          group={groups.find((g: { id: number }) => g.id === selectedGroupId)}
          persos={persos}
          handleGroupUpdate={handleGroupUpdateSafe}
          handleGroupMembersUpdate={handleGroupMembersUpdate}
          closePage={closeGroupPage}
        />
      )}

      {page === "perso" && (
        <PersoPage
          perso={persos.find((p: { id: number }) => p.id === selectedPersoId)}
          resources={resources}
          groups={groups}
          armes={armes}
          persoArmes={persoArmes}
          outils={outils}
          persoOutils={persoOutils}
          sacs={sacs}
          persoSacs={persoSacs}
          persoResources={persoResources}
          handlePersoUpdate={handlePersoUpdateById}
          handlePersoResourceUpdate={handlePersoResourceUpdate}
          handlePersoWeaponsUpdate={handlePersoWeaponsUpdate}
          handlePersoToolsUpdate={handlePersoToolsUpdate}
          handlePersoBagsUpdate={handlePersoBagsUpdate}
          closePage={closePersoPage}
        />
      )}

      {page === "chantiers" && (
        <ChantiersPage
          constructions={constructions}
          resources={resources}
          constructionProgress={constructionProgress}
          constructionStates={currentTimelineSegment?.constructionStates || {}}
          addConstruction={handleAddConstruction}
          updateConstruction={updateConstruction}
          removeConstruction={handleRemoveConstruction}
        />
      )}

      {page === "timeline" && (
        <TimelinePage
          currentLune={currentLune}
          resources={resources}
          constructions={constructions}
          timelineData={visibleTimelineData}
          removeLune={handleRemoveLune}
          updateLuneGlobal={updateLuneGlobal}
          updateRation={updateRation}
          toggleConstructionPlacement={toggleConstructionPlacement}
          toggleOverrideMenu={toggleOverrideMenu}
          openOverrides={openOverrides}
          setOverride={setOverride}
          clearOverrides={clearOverrides}
          addLune={handleAddLune}
        />
      )}

      {page === "armes" && (
        <WeaponsPage
          armes={armes}
          addArme={handleAddArme}
          updateArme={updateArme}
          removeArme={handleRemoveArme}
        />
      )}

      {page === "outils" && (
        <ToolsPage
          outils={outils}
          addOutil={handleAddOutil}
          updateOutil={updateOutil}
          removeOutil={handleRemoveOutil}
        />
      )}

      {page === "sacs" && (
        <BagsPage
          sacs={sacs}
          addSac={handleAddSac}
          updateSac={updateSac}
          removeSac={handleRemoveSac}
        />
      )}
    </>
  );
}

export default App;
