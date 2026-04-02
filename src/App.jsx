import { useEffect, useMemo, useRef, useState } from "react";
import SaveBar from "./components/SaveBar";
import PageTabs from "./components/PageTabs";
import ReservePage from "./components/ReservePage";
import EffectifPage from "./components/EffectifPage";
import PersoPage from "./components/PersoPage";
import GroupPage from "./components/GroupPage";
import GroupEditPage from "./components/GroupEditPage";
import GroupViewPage from "./components/GroupViewPage";
import TimelinePage from "./components/TimelinePage";
import WeaponsPage from "./components/WeaponsPage";
import ToolsPage from "./components/ToolsPage";
import BagsPage from "./components/BagsPage";
import {
  buildFallbackState,
  buildState,
  createLune,
  defaultRation,
  defaultStocks,
  normalizePersoFieldValue,
} from "./utils/stateUtils";
import { recalculateGroups, validateGroupCapacities } from "./utils/groupUtils";
import { simulateTimeline } from "./utils/timelineUtils";

const normalizeArmeFieldValue = (field, rawValue) => {
  if (field === "name") return rawValue;
  const value = Number(rawValue);
  if (!Number.isFinite(value)) return 0;
  if (field === "quantity") return Math.max(0, Math.floor(value));
  return value;
};

const countAssignedWeaponsForArme = (entries, armeId, excludedPersoId = null) =>
  entries.filter(
    (entry) =>
      entry.arme_id === armeId &&
      (excludedPersoId === null || entry.perso_id !== excludedPersoId),
  ).length;

const normalizeOutilFieldValue = (field, rawValue) => {
  if (field === "name" || field === "specialite") return rawValue;
  const value = Number(rawValue);
  if (!Number.isFinite(value)) return 0;
  if (field === "quantity") return Math.max(0, Math.floor(value));
  if (field === "pv" || field === "pvmax" || field === "bonus") {
    return Math.max(0, value);
  }
  return value;
};

const countAssignedToolsForOutil = (entries, outilId, excludedPersoId = null) =>
  entries.filter(
    (entry) =>
      entry.outil_id === outilId &&
      (excludedPersoId === null || entry.perso_id !== excludedPersoId),
  ).length;

const normalizeSacFieldValue = (field, rawValue) => {
  if (field === "name") return rawValue;
  const value = Number(rawValue);
  if (!Number.isFinite(value)) return 0;
  if (field === "quantity") return Math.max(0, Math.floor(value));
  if (
    field === "pv" ||
    field === "pvmax" ||
    field === "poids" ||
    field === "capacite"
  ) {
    return Math.max(0, value);
  }
  return value;
};

const countAssignedBagsForSac = (entries, sacId, excludedPersoId = null) =>
  entries.filter(
    (entry) =>
      entry.sac_id === sacId &&
      (excludedPersoId === null || entry.perso_id !== excludedPersoId),
  ).length;

function App() {
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
  const saveTimer = useRef(null);

  const setCompleteState = (rawState) => {
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
          body: JSON.stringify({
            persos,
            persoResources,
            lunes,
            stocks,
            nextPersoId,
            groups,
            armes,
            persoArmes,
            outils,
            persoOutils,
            sacs,
            persoSacs,
          }),
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
  }, [
    persos,
    persoResources,
    lunes,
    stocks,
    nextPersoId,
    groups,
    armes,
    persoArmes,
    outils,
    persoOutils,
    sacs,
    persoSacs,
    ready,
  ]);

  useEffect(() => {
    const resourcesById = new Map(
      resources.map((resource) => [resource.id, resource]),
    );
    const armesById = new Map(armes.map((arme) => [arme.id, arme]));
    const outilsById = new Map(outils.map((outil) => [outil.id, outil]));
    const sacsById = new Map(sacs.map((sac) => [sac.id, sac]));

    setPersos((previous) =>
      previous.map((perso) => {
        const equippedEntry = persoArmes.find(
          (entry) => entry.perso_id === perso.id && entry.equipee,
        );
        const nextEquippedWeaponId = equippedEntry?.arme_id ?? null;
        const equippedArme = armesById.get(nextEquippedWeaponId);
        const nextCombatEffectif =
          nextEquippedWeaponId === null
            ? Number(perso.combat ?? 0)
            : Number(perso.combat ?? 0) * Number(equippedArme?.att ?? 1);

        const equippedBagEntry = persoSacs.find(
          (entry) => entry.perso_id === perso.id && entry.equipe,
        );
        const nextEquippedBagId = equippedBagEntry?.sac_id ?? null;
        const equippedSac = sacsById.get(nextEquippedBagId);
        const nextPoidsMaxEffectif =
          Number(perso.poidsMax ?? 20) + Number(equippedSac?.capacite ?? 0);

        const carriedWeapons = persoArmes
          .filter((entry) => entry.perso_id === perso.id)
          .map((entry) => armesById.get(entry.arme_id))
          .filter(Boolean);

        const carriedTools = persoOutils
          .filter((entry) => entry.perso_id === perso.id)
          .map((entry) => outilsById.get(entry.outil_id))
          .filter(Boolean);

        const carriedBags = persoSacs
          .filter((entry) => entry.perso_id === perso.id)
          .map((entry) => sacsById.get(entry.sac_id))
          .filter(Boolean);

        const carriedResourcesWeight = persoResources
          .filter((entry) => entry.perso_id === perso.id)
          .reduce((total, entry) => {
            const resource = resourcesById.get(entry.resource_id);
            const unitWeight = resource?.code === "crd" ? 0 : 1;
            return (
              total +
              Math.max(0, Number(entry.quantity ?? 0)) * Number(unitWeight)
            );
          }, 0);

        const multiplierBySpecialite = carriedTools.reduce(
          (acc, outil) => ({
            ...acc,
            [outil.specialite]:
              Number(acc[outil.specialite] ?? 1) * Number(outil.bonus ?? 1),
          }),
          { eau: 1, nrt: 1, mat: 1, art: 1 },
        );

        const nextCapEauEffectif =
          Number(perso.capEau ?? 0) * Number(multiplierBySpecialite.eau ?? 1);
        const nextCapNrtEffectif =
          Number(perso.capNrt ?? 0) * Number(multiplierBySpecialite.nrt ?? 1);
        const nextCapMedEffectif = Number(perso.capMed ?? 0);
        const nextCapMatEffectif =
          Number(perso.capMat ?? 0) * Number(multiplierBySpecialite.mat ?? 1);
        const nextCapArtEffectif =
          Number(perso.capart ?? 0) * Number(multiplierBySpecialite.art ?? 1);
        const nextPoidsTotal =
          carriedWeapons.reduce(
            (total, arme) => total + Number(arme?.poids ?? 0),
            0,
          ) +
          carriedTools.reduce(
            (total, outil) => total + Number(outil?.poids ?? 0),
            0,
          ) +
          carriedBags.reduce(
            (total, sac) => total + Number(sac?.poids ?? 0),
            0,
          ) +
          carriedResourcesWeight;

        if (
          perso.equippedWeaponId === nextEquippedWeaponId &&
          perso.equippedBagId === nextEquippedBagId &&
          Number(perso.combatEffectif ?? 0) === nextCombatEffectif &&
          Number(perso.capEauEffectif ?? 0) === nextCapEauEffectif &&
          Number(perso.capNrtEffectif ?? 0) === nextCapNrtEffectif &&
          Number(perso.capMedEffectif ?? 0) === nextCapMedEffectif &&
          Number(perso.capMatEffectif ?? 0) === nextCapMatEffectif &&
          Number(perso.capArtEffectif ?? 0) === nextCapArtEffectif &&
          Number(perso.poidsMaxEffectif ?? perso.poidsMax ?? 20) ===
            nextPoidsMaxEffectif &&
          Number(perso.poidsTotal ?? 0) === nextPoidsTotal
        ) {
          return perso;
        }

        return {
          ...perso,
          equippedWeaponId: nextEquippedWeaponId,
          equippedBagId: nextEquippedBagId,
          combatEffectif: nextCombatEffectif,
          capEauEffectif: nextCapEauEffectif,
          capNrtEffectif: nextCapNrtEffectif,
          capMedEffectif: nextCapMedEffectif,
          capMatEffectif: nextCapMatEffectif,
          capArtEffectif: nextCapArtEffectif,
          poidsMaxEffectif: nextPoidsMaxEffectif,
          poidsTotal: nextPoidsTotal,
        };
      }),
    );
  }, [
    resources,
    armes,
    persoArmes,
    outils,
    persoOutils,
    sacs,
    persoSacs,
    persoResources,
  ]);

  const handleStockChange = (field, rawValue) => {
    const value = Number(rawValue) || 0;
    setStocks((previous) => ({ ...previous, [field]: value }));
  };

  const handlePersoUpdate = (index, field, rawValue) => {
    setPersos((previous) => {
      const nextPersos = previous.map((p, idx) => {
        if (idx !== index) {
          return p;
        }

        const nextValue = normalizePersoFieldValue(field, rawValue);
        return {
          ...p,
          [field]: nextValue,
          ...(field === "poidsMax"
            ? {
                poidsMaxEffectif:
                  Number(nextValue) +
                  Number(
                    sacs.find((sac) => sac.id === p.equippedBagId)?.capacite ??
                      0,
                  ),
              }
            : {}),
        };
      });

      if (field === "groupId" || field === "cmd") {
        const nextGroups = recalculateGroups(nextPersos, groups);
        const capacityError = validateGroupCapacities(nextPersos, nextGroups);
        if (capacityError) {
          window.alert(capacityError);
          return previous;
        }
        setGroups(nextGroups);
      }

      return nextPersos;
    });
  };

  const handlePersoUpdateById = (persoId, field, rawValue) => {
    setPersos((previous) => {
      const nextPersos = previous.map((p) => {
        if (p.id !== persoId) {
          return p;
        }

        const nextValue = normalizePersoFieldValue(field, rawValue);
        return {
          ...p,
          [field]: nextValue,
          ...(field === "poidsMax"
            ? {
                poidsMaxEffectif:
                  Number(nextValue) +
                  Number(
                    sacs.find((sac) => sac.id === p.equippedBagId)?.capacite ??
                      0,
                  ),
              }
            : {}),
        };
      });

      if (field === "groupId" || field === "cmd") {
        const nextGroups = recalculateGroups(nextPersos, groups);
        const capacityError = validateGroupCapacities(nextPersos, nextGroups);
        if (capacityError) {
          window.alert(capacityError);
          return previous;
        }
        setGroups(nextGroups);
      }

      return nextPersos;
    });
  };

  const handlePersoResourceUpdate = (persoId, resourceId, rawValue) => {
    const quantity = Math.max(0, Number(rawValue) || 0);

    setPersoResources((previous) => {
      const remainingEntries = previous.filter(
        (entry) =>
          !(entry.perso_id === persoId && entry.resource_id === resourceId),
      );

      if (quantity === 0) {
        return remainingEntries;
      }

      return [
        ...remainingEntries,
        {
          perso_id: persoId,
          resource_id: resourceId,
          quantity,
        },
      ].sort(
        (left, right) =>
          left.perso_id - right.perso_id ||
          left.resource_id - right.resource_id,
      );
    });
  };

  const addPerso = () => {
    const newPerso = {
      id: nextPersoId,
      nom: "Nouveau",
      pvmax: 10,
      pv: 10,
      capEau: 1,
      capNrt: 1,
      capMed: 0,
      capMat: 1,
      capart: 0,
      cmd: 0,
      combat: 0,
      poidsMax: 20,
      poidsMaxEffectif: 20,
      groupId: groups[0]?.id ?? null,
    };
    setPersos((previous) => [...previous, newPerso]);
    setPersoResources((previous) => [
      ...previous,
      ...resources.map((resource) => ({
        perso_id: newPerso.id,
        resource_id: resource.id,
        quantity: 0,
      })),
    ]);
    setLunes((previous) =>
      previous.map((lune) => ({
        ...lune,
        rations: {
          ...lune.rations,
          [newPerso.id]: defaultRation(),
        },
      })),
    );
    setSelectedPersoId(newPerso.id);
    setPage("perso");
    setNextPersoId((previous) => previous + 1);
  };

  const removePerso = (index) => {
    const removedId = persos[index].id;
    setPersos((previous) => previous.filter((_, idx) => idx !== index));
    setPersoResources((previous) =>
      previous.filter((entry) => entry.perso_id !== removedId),
    );
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
          const numericValue = Number(rawValue);
          existing[persoId] = {
            ...current,
            [field]:
              field === "pv"
                ? Math.max(0, Number.isFinite(numericValue) ? numericValue : 0)
                : numericValue,
          };
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

  const openGroupPage = (groupId) => {
    setSelectedGroupId(groupId);
    setPage("group");
  };

  const addGroup = () => {
    const nextGroupId =
      groups.reduce(
        (maxId, group) => Math.max(maxId, Number(group.id) || 0),
        0,
      ) + 1;

    const newGroup = {
      id: nextGroupId,
      name: `Nouveau groupe ${nextGroupId}`,
      chef: null,
    };

    setGroups((previous) => [...previous, newGroup]);
    setSelectedGroupId(newGroup.id);
    setPage("group");
  };

  const openGroupViewPage = (groupId) => {
    setSelectedGroupId(groupId);
    setPage("group-view");
  };

  const closeGroupPage = () => {
    setPage("groupes");
    setSelectedGroupId(null);
  };

  const handleGroupUpdate = (groupId, field, rawValue) => {
    setGroups((previous) =>
      previous.map((group) =>
        group.id !== groupId
          ? group
          : {
              ...group,
              [field]:
                field === "chef"
                  ? rawValue === null
                    ? null
                    : Number(rawValue)
                  : rawValue,
            },
      ),
    );
  };

  const handleGroupMembersUpdate = (groupId, selectedMemberIds) => {
    const uniqueIds = Array.from(
      new Set(
        selectedMemberIds
          .map((id) => Number(id))
          .filter((id) => Number.isFinite(id)),
      ),
    );

    const nextPersos = persos.map((perso) => {
      if (uniqueIds.includes(perso.id)) {
        return { ...perso, groupId };
      }
      if (perso.groupId === groupId) {
        return { ...perso, groupId: null };
      }
      return perso;
    });

    const nextGroups = recalculateGroups(nextPersos, groups);
    const capacityError = validateGroupCapacities(nextPersos, nextGroups);
    if (capacityError) {
      window.alert(capacityError);
      return;
    }

    setPersos(nextPersos);
    setGroups(nextGroups);
  };

  const handlePersoWeaponsUpdate = (
    persoId,
    carriedWeaponIds,
    equippedWeaponId,
  ) => {
    const uniqueWeaponIds = Array.from(
      new Set(
        carriedWeaponIds
          .map((id) => Number(id))
          .filter((id) => Number.isFinite(id)),
      ),
    );

    const normalizedEquippedWeaponId =
      equippedWeaponId === null ||
      equippedWeaponId === undefined ||
      equippedWeaponId === ""
        ? null
        : Number(equippedWeaponId);

    if (
      normalizedEquippedWeaponId !== null &&
      !uniqueWeaponIds.includes(normalizedEquippedWeaponId)
    ) {
      window.alert("Une arme équipée doit d'abord être portée par le perso.");
      return;
    }

    for (const armeId of uniqueWeaponIds) {
      const arme = armes.find((item) => item.id === armeId);
      const maxQuantity = Math.max(0, Math.floor(Number(arme?.quantity ?? 1)));
      const assignedToOthers = countAssignedWeaponsForArme(
        persoArmes,
        armeId,
        persoId,
      );

      if (assignedToOthers + 1 > maxQuantity) {
        window.alert(
          `L'arme "${arme?.name || armeId}" n'est plus disponible (${assignedToOthers}/${maxQuantity} déjà attribuée(s)).`,
        );
        return;
      }
    }

    setPersoArmes((previous) => {
      const remainingEntries = previous.filter(
        (entry) => entry.perso_id !== persoId,
      );
      const nextEntries = uniqueWeaponIds.map((armeId) => ({
        perso_id: persoId,
        arme_id: armeId,
        equipee: armeId === normalizedEquippedWeaponId,
      }));
      return [...remainingEntries, ...nextEntries];
    });

    setPersos((previous) =>
      previous.map((perso) =>
        perso.id !== persoId
          ? perso
          : {
              ...perso,
              equippedWeaponId: normalizedEquippedWeaponId,
              combatEffectif:
                normalizedEquippedWeaponId === null
                  ? perso.combat
                  : (() => {
                      const equippedArme = armes.find(
                        (arme) => arme.id === normalizedEquippedWeaponId,
                      );
                      return (
                        Number(perso.combat ?? 0) *
                        Number(equippedArme?.att ?? 1)
                      );
                    })(),
            },
      ),
    );
  };

  const handlePersoToolsUpdate = (persoId, carriedToolIds) => {
    const uniqueToolIds = Array.from(
      new Set(
        carriedToolIds
          .map((id) => Number(id))
          .filter((id) => Number.isFinite(id)),
      ),
    );

    for (const outilId of uniqueToolIds) {
      const outil = outils.find((item) => item.id === outilId);
      const maxQuantity = Math.max(0, Math.floor(Number(outil?.quantity ?? 1)));
      const assignedToOthers = countAssignedToolsForOutil(
        persoOutils,
        outilId,
        persoId,
      );

      if (assignedToOthers + 1 > maxQuantity) {
        window.alert(
          `L'outil "${outil?.name || outilId}" n'est plus disponible (${assignedToOthers}/${maxQuantity} déjà attribué(s)).`,
        );
        return;
      }
    }

    setPersoOutils((previous) => {
      const remainingEntries = previous.filter(
        (entry) => entry.perso_id !== persoId,
      );
      const nextEntries = uniqueToolIds.map((outilId) => ({
        perso_id: persoId,
        outil_id: outilId,
      }));
      return [...remainingEntries, ...nextEntries];
    });
  };

  const handlePersoBagsUpdate = (persoId, carriedBagIds, equippedBagId) => {
    const uniqueBagIds = Array.from(
      new Set(
        carriedBagIds
          .map((id) => Number(id))
          .filter((id) => Number.isFinite(id)),
      ),
    );

    const normalizedEquippedBagId =
      equippedBagId === null ||
      equippedBagId === undefined ||
      equippedBagId === ""
        ? null
        : Number(equippedBagId);

    if (
      normalizedEquippedBagId !== null &&
      !uniqueBagIds.includes(normalizedEquippedBagId)
    ) {
      window.alert("Un sac équipé doit d'abord être porté par le perso.");
      return;
    }

    for (const sacId of uniqueBagIds) {
      const sac = sacs.find((item) => item.id === sacId);
      const maxQuantity = Math.max(0, Math.floor(Number(sac?.quantity ?? 1)));
      const assignedToOthers = countAssignedBagsForSac(
        persoSacs,
        sacId,
        persoId,
      );

      if (assignedToOthers + 1 > maxQuantity) {
        window.alert(
          `Le sac "${sac?.name || sacId}" n'est plus disponible (${assignedToOthers}/${maxQuantity} déjà attribué(s)).`,
        );
        return;
      }
    }

    setPersoSacs((previous) => {
      const remainingEntries = previous.filter(
        (entry) => entry.perso_id !== persoId,
      );
      const nextEntries = uniqueBagIds.map((sacId) => ({
        perso_id: persoId,
        sac_id: sacId,
        equipe: sacId === normalizedEquippedBagId,
      }));
      return [...remainingEntries, ...nextEntries];
    });

    setPersos((previous) =>
      previous.map((perso) =>
        perso.id !== persoId
          ? perso
          : {
              ...perso,
              equippedBagId: normalizedEquippedBagId,
              poidsMaxEffectif:
                Number(perso.poidsMax ?? 20) +
                Number(
                  sacs.find((sac) => sac.id === normalizedEquippedBagId)
                    ?.capacite ?? 0,
                ),
            },
      ),
    );
  };

  const addArme = () => {
    const nextArmeId =
      armes.reduce((maxId, arme) => Math.max(maxId, Number(arme.id) || 0), 0) +
      1;

    setArmes((previous) => [
      ...previous,
      {
        id: nextArmeId,
        name: "Nouvelle arme",
        att: 1,
        degats: 0,
        fiabilite: 0,
        pv: 0,
        pvm: 0,
        poids: 0,
        quantity: 1,
      },
    ]);
  };

  const updateArme = (index, field, rawValue) => {
    setArmes((previous) =>
      previous.map((arme, currentIndex) => {
        if (currentIndex !== index) {
          return arme;
        }

        const nextValue = normalizeArmeFieldValue(field, rawValue);
        if (field === "quantity") {
          const assignedCount = countAssignedWeaponsForArme(
            persoArmes,
            arme.id,
          );

          if (nextValue < assignedCount) {
            window.alert(
              `Impossible de définir une quantité inférieure aux ${assignedCount} arme(s) déjà attribuée(s).`,
            );
            return arme;
          }
        }

        return {
          ...arme,
          [field]: nextValue,
        };
      }),
    );
  };

  const removeArme = (index) => {
    const armeToRemove = armes[index];
    if (!armeToRemove) return;

    setArmes((previous) =>
      previous.filter((_, currentIndex) => currentIndex !== index),
    );
    setPersoArmes((previous) =>
      previous.filter((entry) => entry.arme_id !== armeToRemove.id),
    );
    setPersos((previous) =>
      previous.map((perso) =>
        perso.equippedWeaponId !== armeToRemove.id
          ? perso
          : {
              ...perso,
              equippedWeaponId: null,
              combatEffectif: Number(perso.combat ?? 0),
            },
      ),
    );
  };

  const addOutil = () => {
    const nextOutilId =
      outils.reduce(
        (maxId, outil) => Math.max(maxId, Number(outil.id) || 0),
        0,
      ) + 1;

    setOutils((previous) => [
      ...previous,
      {
        id: nextOutilId,
        name: "Nouvel outil",
        specialite: "eau",
        bonus: 1,
        pv: 0,
        pvmax: 0,
        poids: 0,
        quantity: 1,
      },
    ]);
  };

  const updateOutil = (index, field, rawValue) => {
    setOutils((previous) =>
      previous.map((outil, currentIndex) => {
        if (currentIndex !== index) {
          return outil;
        }

        const nextValue = normalizeOutilFieldValue(field, rawValue);
        if (field === "quantity") {
          const assignedCount = countAssignedToolsForOutil(
            persoOutils,
            outil.id,
          );

          if (nextValue < assignedCount) {
            window.alert(
              `Impossible de définir une quantité inférieure aux ${assignedCount} outil(s) déjà attribué(s).`,
            );
            return outil;
          }
        }

        return {
          ...outil,
          [field]: nextValue,
        };
      }),
    );
  };

  const removeOutil = (index) => {
    const outilToRemove = outils[index];
    if (!outilToRemove) return;

    setOutils((previous) =>
      previous.filter((_, currentIndex) => currentIndex !== index),
    );
    setPersoOutils((previous) =>
      previous.filter((entry) => entry.outil_id !== outilToRemove.id),
    );
  };

  const addSac = () => {
    const nextSacId =
      sacs.reduce((maxId, sac) => Math.max(maxId, Number(sac.id) || 0), 0) + 1;

    setSacs((previous) => [
      ...previous,
      {
        id: nextSacId,
        name: "Nouveau sac",
        pv: 0,
        pvmax: 0,
        poids: 0,
        capacite: 0,
        quantity: 1,
      },
    ]);
  };

  const updateSac = (index, field, rawValue) => {
    setSacs((previous) =>
      previous.map((sac, currentIndex) => {
        if (currentIndex !== index) {
          return sac;
        }

        const nextValue = normalizeSacFieldValue(field, rawValue);
        if (field === "quantity") {
          const assignedCount = countAssignedBagsForSac(persoSacs, sac.id);

          if (nextValue < assignedCount) {
            window.alert(
              `Impossible de définir une quantité inférieure aux ${assignedCount} sac(s) déjà attribué(s).`,
            );
            return sac;
          }
        }

        return {
          ...sac,
          [field]: nextValue,
        };
      }),
    );
  };

  const removeSac = (index) => {
    const sacToRemove = sacs[index];
    if (!sacToRemove) return;

    setSacs((previous) =>
      previous.filter((_, currentIndex) => currentIndex !== index),
    );
    setPersoSacs((previous) =>
      previous.filter((entry) => entry.sac_id !== sacToRemove.id),
    );
    setPersos((previous) =>
      previous.map((perso) =>
        perso.equippedBagId !== sacToRemove.id
          ? perso
          : {
              ...perso,
              equippedBagId: null,
              poidsMaxEffectif: Number(perso.poidsMax ?? 20),
            },
      ),
    );
  };

  const handleGroupUpdateSafe = (groupId, field, rawValue) => {
    if (field !== "chef") {
      handleGroupUpdate(groupId, field, rawValue);
      return;
    }

    const members = persos
      .filter((perso) => perso.groupId === groupId)
      .map((perso) => perso.id);

    const nextChef =
      rawValue === null || rawValue === undefined
        ? (members[0] ?? null)
        : Number(rawValue);

    if (nextChef === null || !members.includes(nextChef)) {
      return;
    }

    const nextGroups = groups.map((group) =>
      group.id !== groupId
        ? group
        : {
            ...group,
            chef: nextChef,
          },
    );

    const capacityError = validateGroupCapacities(persos, nextGroups);
    if (capacityError) {
      window.alert(capacityError);
      return;
    }

    setGroups(nextGroups);
  };

  const exportData = () => {
    const data = JSON.stringify(
      {
        persos,
        persoResources,
        lunes,
        nextPersoId,
        stocks,
        groups,
        armes,
        persoArmes,
        outils,
        persoOutils,
        sacs,
        persoSacs,
      },
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
    () => simulateTimeline(persos, lunes, stocks, defaultRation),
    [persos, lunes, stocks],
  );

  const pages = [
    { key: "reserve", label: "1. Réserve centrale" },
    { key: "effectif", label: "2. Effectif" },
    { key: "groupes", label: "3. Groupe" },
    { key: "timeline", label: "4. Ligne du temps" },
    { key: "armes", label: "5. Armes" },
    { key: "outils", label: "6. Outils" },
    { key: "sacs", label: "7. Sacs" },
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
          armes={armes}
          persoArmes={persoArmes}
          outils={outils}
          persoOutils={persoOutils}
          sacs={sacs}
          persoSacs={persoSacs}
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

      {page === "groupes" && (
        <GroupPage
          groups={groups}
          persos={persos}
          openGroupPage={openGroupPage}
          openGroupViewPage={openGroupViewPage}
          addGroup={addGroup}
        />
      )}

      {page === "group-view" && (
        <GroupViewPage
          group={groups.find((g) => g.id === selectedGroupId)}
          persos={persos}
          closePage={closeGroupPage}
        />
      )}

      {page === "group" && (
        <GroupEditPage
          group={groups.find((g) => g.id === selectedGroupId)}
          persos={persos}
          handleGroupUpdate={handleGroupUpdateSafe}
          handleGroupMembersUpdate={handleGroupMembersUpdate}
          closePage={closeGroupPage}
        />
      )}

      {page === "perso" && (
        <PersoPage
          perso={persos.find((p) => p.id === selectedPersoId)}
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
