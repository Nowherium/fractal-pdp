import { useCallback, useEffect, useRef, useState } from "react";
import {
  buildState,
  defaultCityMultipliers,
  defaultStocks,
} from "../utils/stateUtils";
import type {
  AppPage,
  AppRouteState,
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
  Stocks,
  Sac,
} from "../types";

const defaultRouteState: AppRouteState = {
  page: "reserve",
  selectedPersoId: null,
  selectedGroupId: null,
};

const parseRouteId = (value?: string) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const getRouteStateFromLocation = (): AppRouteState => {
  if (typeof window === "undefined") {
    return defaultRouteState;
  }

  const [section, rawId, action] = window.location.pathname
    .split("/")
    .filter(Boolean);

  switch (section) {
    case undefined:
    case "reserve":
    case "ville":
      return defaultRouteState;
    case "effectif":
      return { ...defaultRouteState, page: "effectif" };
    case "persos": {
      const persoId = parseRouteId(rawId);
      return persoId
        ? { page: "perso", selectedPersoId: persoId, selectedGroupId: null }
        : { ...defaultRouteState, page: "effectif" };
    }
    case "groupes": {
      const groupId = parseRouteId(rawId);
      if (groupId && action === "edit") {
        return {
          page: "group",
          selectedPersoId: null,
          selectedGroupId: groupId,
        };
      }
      if (groupId) {
        return {
          page: "group-view",
          selectedPersoId: null,
          selectedGroupId: groupId,
        };
      }
      return { ...defaultRouteState, page: "groupes" };
    }
    case "chantiers":
    case "timeline":
    case "armes":
    case "outils":
    case "sacs":
    case "resources":
      return {
        page: section as AppPage,
        selectedPersoId: null,
        selectedGroupId: null,
      };
    default:
      return defaultRouteState;
  }
};

const getPathForRouteState = ({
  page,
  selectedPersoId,
  selectedGroupId,
}: AppRouteState) => {
  switch (page) {
    case "reserve":
      return "/ville";
    case "effectif":
      return "/effectif";
    case "perso":
      return selectedPersoId ? `/persos/${selectedPersoId}` : "/effectif";
    case "groupes":
      return "/groupes";
    case "group-view":
      return selectedGroupId ? `/groupes/${selectedGroupId}` : "/groupes";
    case "group":
      return selectedGroupId ? `/groupes/${selectedGroupId}/edit` : "/groupes";
    case "chantiers":
      return "/chantiers";
    case "timeline":
      return "/timeline";
    case "armes":
      return "/armes";
    case "outils":
      return "/outils";
    case "sacs":
      return "/sacs";
    case "resources":
      return "/resources";
    default:
      return "/";
  }
};

export const useAppState = () => {
  const [resources, setResources] = useState<Resource[]>([]);
  const [persos, setPersos] = useState<Perso[]>([]);
  const [persoResources, setPersoResources] = useState<PersoResource[]>([]);
  const [constructions, setConstructions] = useState<LuneConstruction[]>([]);
  const [lunes, setLunes] = useState<Lune[]>([]);
  const [stocks, setStocks] = useState<Stocks>(defaultStocks as Stocks);
  const [cityMultipliers, setCityMultipliers] = useState<CityMultipliers>(
    defaultCityMultipliers as CityMultipliers,
  );
  const [groups, setGroups] = useState<Group[]>([]);
  const [armes, setArmes] = useState<Arme[]>([]);
  const [persoArmes, setPersoArmes] = useState<PersoArme[]>([]);
  const [outils, setOutils] = useState<Outil[]>([]);
  const [persoOutils, setPersoOutils] = useState<PersoOutil[]>([]);
  const [sacs, setSacs] = useState<Sac[]>([]);
  const [persoSacs, setPersoSacs] = useState<PersoSac[]>([]);
  const initialRouteState = getRouteStateFromLocation();

  const [nextPersoId, setNextPersoId] = useState<number>(2);
  const [currentLune, setCurrentLune] = useState<number>(1);
  const [page, setPage] = useState<AppPage>(initialRouteState.page);
  const [selectedPersoId, setSelectedPersoId] = useState<number | null>(
    initialRouteState.selectedPersoId,
  );
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(
    initialRouteState.selectedGroupId,
  );
  const [openOverrides, setOpenOverrides] = useState<Record<string, boolean>>(
    {},
  );
  const [saveStatus, setSaveStatus] = useState<string>("(Chargement...)");
  const [ready, setReady] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isHydratingRef = useRef<boolean>(true);
  const hasSyncedRouteRef = useRef<boolean>(false);

  useEffect(() => {
    const syncFromBrowserNavigation = () => {
      const routeState = getRouteStateFromLocation();
      setPage(routeState.page);
      setSelectedPersoId(routeState.selectedPersoId);
      setSelectedGroupId(routeState.selectedGroupId);
    };

    window.addEventListener("popstate", syncFromBrowserNavigation);
    return () => {
      window.removeEventListener("popstate", syncFromBrowserNavigation);
    };
  }, []);

  useEffect(() => {
    const nextPath = getPathForRouteState({
      page,
      selectedPersoId,
      selectedGroupId,
    });

    if (window.location.pathname === nextPath) {
      hasSyncedRouteRef.current = true;
      return;
    }

    if (hasSyncedRouteRef.current) {
      window.history.pushState(null, "", nextPath);
    } else {
      window.history.replaceState(null, "", nextPath);
      hasSyncedRouteRef.current = true;
    }
  }, [page, selectedPersoId, selectedGroupId]);

  const setCompleteState = useCallback((rawState: unknown) => {
    isHydratingRef.current = true;
    const state = buildState(rawState);

    setResources(state.resources);
    setPersos(state.persos);
    setPersoResources(state.persoResources);
    setConstructions(state.constructions);
    setLunes(state.lunes);
    setStocks(state.stocks);
    setCityMultipliers(state.cityMultipliers);
    setGroups(state.groups);
    setArmes(state.armes);
    setPersoArmes(state.persoArmes);
    setOutils(state.outils);
    setPersoOutils(state.persoOutils);
    setSacs(state.sacs);
    setPersoSacs(state.persoSacs);
    setNextPersoId(state.nextPersoId);
    setCurrentLune(state.currentLune);

    window.setTimeout(() => {
      isHydratingRef.current = false;
    }, 0);

    return state;
  }, []);

  return {
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
  };
};
