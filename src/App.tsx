import { useMemo } from "react";
import type { ChangeEvent } from "react";
import SaveBar from "./components/SaveBar";
import PageTabs from "./components/PageTabs";
import ReservePage from "./components/ReservePage";
import ResourcesPage from "./components/ResourcesPage";
import EffectifPage from "./components/EffectifPage";
import PersoPage from "./components/PersoPage";
import GroupPage from "./components/GroupPage";
import GroupEditPage from "./components/GroupEditPage";
import GroupViewPage from "./components/GroupViewPage";
import ChantiersPage from "./components/ChantiersPage";
import TimelinePage from "./components/TimelinePage";
import WeaponsPage from "./components/WeaponsPage";
import ToolsPage from "./components/ToolsPage";
import BagsPage from "./components/BagsPage";
import { defaultRation, normalizeCurrentLune } from "./utils/stateUtils";
import { simulateTimeline } from "./utils/timelineUtils";
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

  const handleStockChange = (field: string, rawValue: string | number) => {
    const value = Number(rawValue) || 0;
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
    persoResources,
    lunes,
    nextPersoId,
    setPersos,
    setGroups,
    setPersoResources,
    setLunes,
    setPage,
    setSelectedPersoId,
    setOpenOverrides,
    setNextPersoId,
    savePersoEntity,
    deletePersoEntity,
    savePersoResourcesEntity,
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

  const exportData = () =>
    exportStateData({
      resources,
      persos,
      persoResources,
      constructions,
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

  const importData = (event: ChangeEvent<HTMLInputElement>) =>
    importStateFile(event, {
      fileInputRef,
      setCompleteState,
    });

  const resetData = () =>
    resetAppData({
      setCompleteState,
      setSaveStatus,
    });

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
      ),
    [
      persos,
      lunes,
      stocks,
      constructions,
      resources,
      persoResources,
      cityMultipliers,
    ],
  );

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
      <h1>Fractal - Planificateur de Faction (V9)</h1>
      <SaveBar
        saveStatus={saveStatus}
        exportData={exportData}
        importData={importData}
        resetData={resetData}
        fileInputRef={fileInputRef}
      />

      {loadError ? <div className='info-text'>{loadError}</div> : null}

      <div className='current-lune-bar'>
        <label className='current-lune-label'>
          🌘 Lune actuelle
          <input
            className='current-lune-input'
            type='number'
            min='1'
            step='1'
            value={currentLune}
            onChange={(event) => handleCurrentLuneChange(event.target.value)}
          />
        </label>
      </div>

      <PageTabs pages={pages} currentPage={page} setPage={setPage} />

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
          addResource={addResource}
          updateResource={updateResource}
          removeResource={removeResource}
          getResourceDeleteGuard={getResourceDeleteGuard}
        />
      )}

      {page === "effectif" && (
        <EffectifPage
          persos={persos}
          removePerso={removePerso}
          addPerso={addPerso}
          openPersoPage={openPersoPage}
          updatePersoPresence={(persoId, isPresent) =>
            handlePersoUpdateById(persoId, "present", isPresent)
          }
        />
      )}

      {page === "groupes" && (
        <GroupPage
          groups={groups}
          persos={persos}
          openGroupPage={openGroupPage}
          openGroupViewPage={openGroupViewPage}
          addGroup={addGroup}
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
          constructionStates={timelineData[0]?.constructionStates || {}}
          addConstruction={addConstruction}
          updateConstruction={updateConstruction}
          removeConstruction={removeConstruction}
        />
      )}

      {page === "timeline" && (
        <TimelinePage
          currentLune={currentLune}
          resources={resources}
          constructions={constructions}
          timelineData={timelineData}
          removeLune={removeLune}
          updateLuneGlobal={updateLuneGlobal}
          updateRation={updateRation}
          toggleConstructionPlacement={toggleConstructionPlacement}
          toggleOverrideMenu={toggleOverrideMenu}
          openOverrides={openOverrides}
          setOverride={setOverride}
          clearOverrides={clearOverrides}
          addLune={addLune}
        />
      )}

      {page === "armes" && (
        <WeaponsPage
          armes={armes}
          addArme={addArme}
          updateArme={updateArme}
          removeArme={removeArme}
        />
      )}

      {page === "outils" && (
        <ToolsPage
          outils={outils}
          addOutil={addOutil}
          updateOutil={updateOutil}
          removeOutil={removeOutil}
        />
      )}

      {page === "sacs" && (
        <BagsPage
          sacs={sacs}
          addSac={addSac}
          updateSac={updateSac}
          removeSac={removeSac}
        />
      )}
    </>
  );
}

export default App;
