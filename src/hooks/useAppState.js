import { useRef, useState } from "react";
import { buildState, defaultStocks } from "../utils/stateUtils";

export const useAppState = () => {
  const [resources, setResources] = useState([]);
  const [persos, setPersos] = useState([]);
  const [persoResources, setPersoResources] = useState([]);
  const [lunes, setLunes] = useState([]);
  const [stocks, setStocks] = useState(defaultStocks);
  const [groups, setGroups] = useState([]);
  const [armes, setArmes] = useState([]);
  const [persoArmes, setPersoArmes] = useState([]);
  const [outils, setOutils] = useState([]);
  const [persoOutils, setPersoOutils] = useState([]);
  const [sacs, setSacs] = useState([]);
  const [persoSacs, setPersoSacs] = useState([]);
  const [nextPersoId, setNextPersoId] = useState(2);
  const [page, setPage] = useState("reserve");
  const [selectedPersoId, setSelectedPersoId] = useState(null);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [openOverrides, setOpenOverrides] = useState({});
  const [saveStatus, setSaveStatus] = useState("(Chargement...)");
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState("");
  const fileInputRef = useRef(null);
  const isHydratingRef = useRef(true);

  const setCompleteState = (rawState) => {
    isHydratingRef.current = true;
    const state = buildState(rawState);

    setResources(state.resources);
    setPersos(state.persos);
    setPersoResources(state.persoResources);
    setLunes(state.lunes);
    setStocks(state.stocks);
    setGroups(state.groups);
    setArmes(state.armes);
    setPersoArmes(state.persoArmes);
    setOutils(state.outils);
    setPersoOutils(state.persoOutils);
    setSacs(state.sacs);
    setPersoSacs(state.persoSacs);
    setNextPersoId(state.nextPersoId);

    window.setTimeout(() => {
      isHydratingRef.current = false;
    }, 0);
  };

  return {
    resources,
    setResources,
    persos,
    setPersos,
    persoResources,
    setPersoResources,
    lunes,
    setLunes,
    stocks,
    setStocks,
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
