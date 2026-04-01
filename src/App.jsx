import { useEffect, useMemo, useRef, useState } from "react";
import SaveBar from "./components/SaveBar";
import PageTabs from "./components/PageTabs";
import ReservePage from "./components/ReservePage";
import EffectifPage from "./components/EffectifPage";
import PersoPage from "./components/PersoPage";
import TimelinePage from "./components/TimelinePage";

const defaultStocks = {};

const buildStocks = (resources, stockValues = {}) =>
  Object.fromEntries(
    resources.map((resource) => [
      resource.code,
      Number(stockValues[resource.code] ?? 0),
    ]),
  );

const defaultRation = () => ({ eau: true, nrt: true, med: true, tache: "" });

const normalizePersos = (persos) =>
  persos.map((p) => ({
    id: Number(p.id),
    nom: p.nom || "Nouveau",
    pvBase: Number(p.pvBase ?? 0),
    capEau: Number(p.capEau ?? 0),
    capNrt: Number(p.capNrt ?? 0),
    capMed: Number(p.capMed ?? 0),
    capMat: Number(p.capMat ?? 0),
    combat: Number(p.combat ?? 0),
    groupId: Number(p.groupId ?? 1),
  }));

const computeIncrement = (cap) => (cap < 4 ? 0.1 : cap <= 6 ? 0.05 : 0.01);

const normalizeLunes = (lunes, persos) =>
  lunes.map((lune) => {
    const rations = { ...(lune.rations || {}) };
    persos.forEach((p) => {
      if (!rations[p.id]) rations[p.id] = defaultRation();
    });
    return {
      id: lune.id || Date.now(),
      coutMat: Number(lune.coutMat ?? 0),
      rations,
      overrides: lune.overrides || {},
    };
  });

const createLune = (persos) => ({
  id: Date.now(),
  coutMat: 0,
  rations: Object.fromEntries(persos.map((p) => [p.id, defaultRation()])),
  overrides: {},
});

const buildFallbackState = () => {
  const persos = normalizePersos([]);
  return {
    resources: [],
    persos,
    lunes: [createLune(persos)],
    stocks: defaultStocks,
    nextPersoId: 1,
  };
};

const buildState = (rawState) => {
  const resources =
    Array.isArray(rawState.resources) && rawState.resources.length > 0
      ? rawState.resources
      : [];
  const persos = normalizePersos(rawState.persos || []);
  const lunes = normalizeLunes(rawState.lunes || [], persos);
  return {
    resources,
    persos,
    lunes: lunes.length > 0 ? lunes : [createLune(persos)],
    stocks: { ...buildStocks(resources), ...(rawState.stocks || {}) },
    nextPersoId:
      rawState.nextPersoId || Math.max(1, ...persos.map((p) => p.id + 1)),
  };
};

const simulateTimeline = (persos, lunes, stocks) => {
  const timeline = [];
  const pvCourants = {};
  const capCourantes = {};

  persos.forEach((p) => {
    pvCourants[p.id] = p.pvBase;
    capCourantes[p.id] = {
      eau: p.capEau,
      nrt: p.capNrt,
      med: p.capMed,
      mat: p.capMat,
    };
  });

  let stockEau = stocks.eau ?? 0;
  let stockNrt = stocks.nrt ?? 0;
  let stockMed = stocks.med ?? 0;
  let stockMat = stocks.mat ?? 0;

  lunes.forEach((lune) => {
    const overrides = lune.overrides || {};

    persos.forEach((p) => {
      const ov = overrides[p.id];
      if (!ov) return;
      if (ov.pv !== undefined) pvCourants[p.id] = ov.pv;
      if (ov.capEau !== undefined) capCourantes[p.id].eau = ov.capEau;
      if (ov.capNrt !== undefined) capCourantes[p.id].nrt = ov.capNrt;
      if (ov.capMed !== undefined) capCourantes[p.id].med = ov.capMed;
      if (ov.capMat !== undefined) capCourantes[p.id].mat = ov.capMat;
    });

    const rows = [];
    let luneProdEau = 0;
    let luneProdNrt = 0;
    let luneProdMed = 0;
    let luneProdMat = 0;
    let luneConsoEau = 0;
    let luneConsoNrt = 0;
    let luneConsoMed = 0;

    persos.forEach((p) => {
      const pvDebut = pvCourants[p.id];
      const r = lune.rations[p.id] || defaultRation();
      const cDebut = { ...capCourantes[p.id] };
      const ov = overrides[p.id] || {};
      const hasOverride = Object.keys(ov).length > 0;

      const mortAuDebut = pvDebut <= 0;
      let pvFin = pvDebut;
      let classPv = "";
      let mortText = "";

      if (!mortAuDebut) {
        if (r.tache === "eau") {
          luneProdEau += capCourantes[p.id].eau;
          capCourantes[p.id].eau += computeIncrement(capCourantes[p.id].eau);
        }
        if (r.tache === "nrt") {
          luneProdNrt += capCourantes[p.id].nrt;
          capCourantes[p.id].nrt += computeIncrement(capCourantes[p.id].nrt);
        }
        if (r.tache === "med") {
          luneProdMed += capCourantes[p.id].med;
          capCourantes[p.id].med += computeIncrement(capCourantes[p.id].med);
        }
        if (r.tache === "mat") {
          luneProdMat += capCourantes[p.id].mat;
          capCourantes[p.id].mat += computeIncrement(capCourantes[p.id].mat);
        }

        if (r.eau) luneConsoEau += 1;
        if (r.nrt) luneConsoNrt += 1;
        if (r.med) luneConsoMed += 1;

        const degats = (r.eau ? 0 : 1) + (r.nrt ? 0 : 1) + (r.med ? 0 : 0.5);
        pvFin = pvDebut - degats;
        pvCourants[p.id] = pvFin;
        classPv = pvFin <= 0 ? "danger" : pvFin <= 5 ? "warning" : "safe";
        mortText = pvFin <= 0 ? " (DÉCÈS)" : "";
      } else {
        mortText = " (CADAVRE)";
      }

      rows.push({
        persoId: p.id,
        nom: p.nom,
        pvDebut,
        pvFin,
        pvDisplayDebut: pvDebut > 0 ? pvDebut : 0,
        pvDisplayFin: pvFin > 0 ? pvFin : 0,
        cDebut,
        ration: r,
        mortAuDebut,
        classPv,
        mortText,
        hasOverride,
      });
    });

    stockEau = stockEau + luneProdEau - luneConsoEau;
    stockNrt = stockNrt + luneProdNrt - luneConsoNrt;
    stockMed = stockMed + luneProdMed - luneConsoMed;
    stockMat = stockMat + luneProdMat - (lune.coutMat || 0);

    const classEau = stockEau < 0 ? "danger" : "safe";
    const classNrt = stockNrt < 0 ? "danger" : "safe";
    const classMed = stockMed < 0 ? "danger" : "safe";
    const classMat = stockMat < 0 ? "danger" : "safe";

    timeline.push({
      lune,
      rows,
      stats: {
        stockEau,
        stockNrt,
        stockMed,
        stockMat,
        classEau,
        classNrt,
        classMed,
        classMat,
      },
    });
  });

  return timeline;
};

function App() {
  const [resources, setResources] = useState([]);
  const [persos, setPersos] = useState([]);
  const [lunes, setLunes] = useState([]);
  const [stocks, setStocks] = useState(defaultStocks);
  const [nextPersoId, setNextPersoId] = useState(2);
  const [page, setPage] = useState("reserve");
  const [selectedPersoId, setSelectedPersoId] = useState(null);
  const [openOverrides, setOpenOverrides] = useState({});
  const [saveStatus, setSaveStatus] = useState("(Chargement...)");
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState("");
  const fileInputRef = useRef(null);
  const saveTimer = useRef(null);

  const setCompleteState = (rawState) => {
    const state = buildState(rawState);
    setResources(state.resources);
    setPersos(state.persos);
    setLunes(state.lunes);
    setStocks(state.stocks);
    setNextPersoId(state.nextPersoId);
  };

  useEffect(() => {
    const loadBackend = async () => {
      try {
        const response = await fetch("/api/state");
        if (!response.ok) throw new Error("Échec de l’API");
        const data = await response.json();
        setCompleteState(data);
        setSaveStatus("(Auto-sauvegarde active)");
      } catch (error) {
        console.error(error);
        setLoadError(
          "Impossible de charger la base de données. Utilisation du mode local temporaire.",
        );
        setCompleteState(buildFallbackState());
        setSaveStatus("(Auto-sauvegarde locale)");
      } finally {
        setReady(true);
      }
    };
    loadBackend();
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaveStatus("Sauvegarde en cours...");

    saveTimer.current = window.setTimeout(async () => {
      try {
        await fetch("/api/state", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ persos, lunes, stocks, nextPersoId }),
        });
        const now = new Date().toLocaleTimeString();
        setSaveStatus("Sauvegardé à " + now);
        window.setTimeout(() => {
          setSaveStatus("(Auto-sauvegarde active)");
        }, 2000);
      } catch (error) {
        console.error(error);
        setSaveStatus("Erreur de sauvegarde");
      }
    }, 400);

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [persos, lunes, stocks, nextPersoId, ready]);

  const handleStockChange = (field, rawValue) => {
    const value = Number(rawValue) || 0;
    setStocks((previous) => ({ ...previous, [field]: value }));
  };

  const handlePersoUpdate = (index, field, rawValue) => {
    setPersos((previous) =>
      previous.map((p, idx) =>
        idx !== index
          ? p
          : {
              ...p,
              [field]: field === "nom" ? rawValue : Number(rawValue) || 0,
            },
      ),
    );
  };

  const handlePersoUpdateById = (persoId, field, rawValue) => {
    setPersos((previous) =>
      previous.map((p) =>
        p.id !== persoId
          ? p
          : {
              ...p,
              [field]: field === "nom" ? rawValue : Number(rawValue) || 0,
            },
      ),
    );
  };

  const addPerso = () => {
    const newPerso = {
      id: nextPersoId,
      nom: "Nouveau",
      pvBase: 10,
      capEau: 1,
      capNrt: 1,
      capMed: 0,
      capMat: 1,
      combat: 0,
      groupId: 1,
    };
    setPersos((previous) => [...previous, newPerso]);
    setLunes((previous) =>
      previous.map((lune) => ({
        ...lune,
        rations: {
          ...lune.rations,
          [newPerso.id]: defaultRation(),
        },
      })),
    );
    setNextPersoId((previous) => previous + 1);
  };

  const removePerso = (index) => {
    const removedId = persos[index].id;
    setPersos((previous) => previous.filter((_, idx) => idx !== index));
    setLunes((previous) =>
      previous.map((lune) => {
        const rations = { ...lune.rations };
        delete rations[removedId];
        const overrides = { ...lune.overrides };
        delete overrides[removedId];
        return { ...lune, rations, overrides };
      }),
    );
    setOpenOverrides((previous) => {
      const next = { ...previous };
      Object.keys(next).forEach((key) => {
        if (key.endsWith(`-${removedId}`)) delete next[key];
      });
      return next;
    });
  };

  const addLune = () => {
    setLunes((previous) => [...previous, createLune(persos)]);
  };

  const removeLune = (index) => {
    setLunes((previous) => previous.filter((_, idx) => idx !== index));
  };

  const updateRation = (luneIndex, persoId, field, value) => {
    setLunes((previous) =>
      previous.map((lune, idx) => {
        if (idx !== luneIndex) return lune;
        const current = lune.rations[persoId] || defaultRation();
        const nextRation = {
          ...current,
          [field]: field === "tache" ? value : Boolean(value),
        };
        return {
          ...lune,
          rations: { ...lune.rations, [persoId]: nextRation },
        };
      }),
    );
  };

  const updateLuneGlobal = (luneIndex, field, rawValue) => {
    const value = Number(rawValue) || 0;
    setLunes((previous) =>
      previous.map((lune, idx) =>
        idx !== luneIndex ? lune : { ...lune, [field]: value },
      ),
    );
  };

  const toggleOverrideMenu = (luneIndex, persoId) => {
    const key = `${luneIndex}-${persoId}`;
    setOpenOverrides((previous) => ({ ...previous, [key]: !previous[key] }));
  };

  const setOverride = (luneIndex, persoId, field, rawValue) => {
    setLunes((previous) =>
      previous.map((lune, idx) => {
        if (idx !== luneIndex) return lune;
        const existing = { ...(lune.overrides || {}) };
        const current = { ...(existing[persoId] || {}) };

        if (rawValue === "") {
          delete current[field];
          if (Object.keys(current).length > 0) {
            existing[persoId] = current;
          } else {
            delete existing[persoId];
          }
        } else {
          existing[persoId] = { ...current, [field]: Number(rawValue) };
        }

        return { ...lune, overrides: existing };
      }),
    );
  };

  const clearOverrides = (luneIndex, persoId) => {
    setLunes((previous) =>
      previous.map((lune, idx) => {
        if (idx !== luneIndex) return lune;
        const overrides = { ...(lune.overrides || {}) };
        delete overrides[persoId];
        return { ...lune, overrides };
      }),
    );
    setOpenOverrides((previous) => {
      const key = `${luneIndex}-${persoId}`;
      const next = { ...previous };
      delete next[key];
      return next;
    });
  };

  const openPersoPage = (persoId) => {
    setSelectedPersoId(persoId);
    setPage("perso");
  };

  const closePersoPage = () => {
    setPage("effectif");
    setSelectedPersoId(null);
  };

  const exportData = () => {
    const data = JSON.stringify(
      { persos, lunes, nextPersoId, stocks },
      null,
      2,
    );
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Escale_Simu_V9_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const importData = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        const importedState = buildState(parsed);
        setCompleteState(importedState);
        await fetch("/api/state", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(importedState),
        });
      } catch (err) {
        window.alert("Fichier invalide ou corrompu !");
      }
    };

    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const resetData = async () => {
    if (!window.confirm("Effacer TOUTES les données ?")) return;
    try {
      const response = await fetch("/api/reset", { method: "POST" });
      if (!response.ok) throw new Error("Erreur reset");
      const data = await response.json();
      setCompleteState(data);
    } catch (error) {
      console.error(error);
      setCompleteState(buildFallbackState());
      setSaveStatus("(Auto-sauvegarde locale)");
    }
  };

  const timelineData = useMemo(
    () => simulateTimeline(persos, lunes, stocks),
    [persos, lunes, stocks],
  );

  const pages = [
    { key: "reserve", label: "1. Réserve centrale" },
    { key: "effectif", label: "2. Effectif" },
    { key: "timeline", label: "3. Ligne du temps" },
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

      <PageTabs pages={pages} currentPage={page} setPage={setPage} />

      {page === "reserve" && (
        <ReservePage
          resources={resources}
          stocks={stocks}
          handleStockChange={handleStockChange}
        />
      )}

      {page === "effectif" && (
        <EffectifPage
          persos={persos}
          removePerso={removePerso}
          addPerso={addPerso}
          openPersoPage={openPersoPage}
        />
      )}

      {page === "perso" && (
        <PersoPage
          perso={persos.find((p) => p.id === selectedPersoId)}
          handlePersoUpdate={handlePersoUpdateById}
          closePage={closePersoPage}
        />
      )}

      {page === "timeline" && (
        <TimelinePage
          timelineData={timelineData}
          removeLune={removeLune}
          updateLuneGlobal={updateLuneGlobal}
          updateRation={updateRation}
          toggleOverrideMenu={toggleOverrideMenu}
          openOverrides={openOverrides}
          setOverride={setOverride}
          clearOverrides={clearOverrides}
          addLune={addLune}
        />
      )}
    </>
  );
}

export default App;
