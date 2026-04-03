import { Fragment } from "react";

import type { Lune, LuneConstruction, Ration, Resource } from "../types";
import { DRUG_EFFECTS, formatDrugQuantity } from "../utils/drugEffects";

type TimelineRow = {
  persoId: number;
  nom: string;
  ration: Ration;
  mortAuDebut: boolean;
  isAbsent?: boolean;
  cDebut: {
    eau: number;
    nrt: number;
    med: number;
    mat: number;
    art?: number;
  };
  classPv?: string;
  pvDisplayDebut: string | number;
  pvDisplayFin: string | number;
  mortText?: string;
  hasOverride?: boolean;
  availableDrugs: Record<string, number>;
  drugStatus?: string;
  drugClassName?: string;
};

type TimelineStats = {
  classEau: string;
  stockEau: number;
  classNrt: string;
  stockNrt: number;
  classMed: string;
  stockMed: number;
  classMat: string;
  stockMat: number;
};

type ConstructionState = {
  assignedBuilders: number;
  buildersRequired: number;
  resourceCode: string;
  resourceCost: number;
  rewardType: string;
  isCompleted: boolean;
  statusLabel: string;
};

type TimelineSegment = {
  lune: Lune;
  rows: TimelineRow[];
  stats: TimelineStats;
  constructionStates?: Record<string, ConstructionState>;
};

const weatherFields: Array<{
  key: "eau" | "nrt" | "med" | "mat";
  label: string;
}> = [
  { key: "eau", label: "💧 Eau" },
  { key: "nrt", label: "🍗 Nrt" },
  { key: "med", label: "💊 Med" },
  { key: "mat", label: "🧱 Mat" },
];

const constructionRewardOptions: Array<{
  key: LuneConstruction["rewardType"];
  label: string;
}> = [
  { key: "eau", label: "+ Eau" },
  { key: "nrt", label: "+ Nrt" },
  { key: "med", label: "+ Med" },
  { key: "mat", label: "+ Mat" },
  { key: "art", label: "+ Art" },
  { key: "combat", label: "+ Combat" },
];

const getResourceLabel = (resources: Resource[], code: string) => {
  const match = resources.find((resource) => resource.code === code);
  return match?.name || code.toUpperCase();
};

const getRewardLabel = (rewardType: LuneConstruction["rewardType"]) =>
  constructionRewardOptions.find((option) => option.key === rewardType)
    ?.label ?? rewardType;

function TimelinePage({
  currentLune,
  resources,
  timelineData,
  removeLune,
  updateLuneGlobal,
  updateRation,
  addConstruction,
  updateConstruction,
  removeConstruction,
  toggleOverrideMenu,
  openOverrides,
  setOverride,
  clearOverrides,
  addLune,
}: {
  currentLune: number;
  resources: Resource[];
  timelineData: TimelineSegment[];
  removeLune: (luneIndex: number) => void;
  updateLuneGlobal: (
    luneIndex: number,
    field: string,
    rawValue: string | number,
  ) => void;
  updateRation: (
    luneIndex: number,
    persoId: number,
    field: "tache" | "eau" | "nrt" | "med" | "drogue" | "constructionId",
    value: string | boolean,
  ) => void;
  addConstruction: (luneIndex: number) => void;
  updateConstruction: (
    luneIndex: number,
    constructionId: string,
    field: string,
    rawValue: string | number,
  ) => void;
  removeConstruction: (luneIndex: number, constructionId: string) => void;
  toggleOverrideMenu: (luneIndex: number, persoId: number) => void;
  openOverrides: Record<string, boolean>;
  setOverride: (
    luneIndex: number,
    persoId: number,
    field: string,
    rawValue: string | number | boolean | null,
  ) => void;
  clearOverrides: (luneIndex: number, persoId: number) => void;
  addLune: () => void;
}) {
  const availableResources =
    resources.length > 0 ? resources : [{ id: 0, code: "mat", name: "MAT" }];

  return (
    <>
      <h2>3. Ligne du Temps & Assignations</h2>
      <p className='info-text'>
        Chaque perso peut consommer <strong>une seule drogue par lune</strong>.
        L'effet n'est appliqué que si la ressource est bien portée en quantité
        suffisante. La <strong>météo</strong> de chaque lune définit
        <strong> 4 coefficients</strong> distincts pour `eau`, `nrt`, `med` et
        `mat`, chacun entre <strong>0</strong> et <strong>1</strong>.
      </p>
      <div id='timeline'>
        {timelineData.map((segment, luneIndex) => {
          const isCurrentLune = luneIndex === 0;

          return (
            <div className='panel lune-panel' key={segment.lune.id}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderBottom: "1px solid #333",
                  paddingBottom: "10px",
                  marginBottom: "10px",
                }}
              >
                <h3 style={{ margin: 0, border: "none", padding: 0 }}>
                  LUNE {Number(currentLune ?? 1) + luneIndex}
                </h3>
                <button
                  className='btn-del'
                  type='button'
                  disabled={isCurrentLune}
                  title={
                    isCurrentLune
                      ? "La lune en cours ne peut pas être supprimée"
                      : undefined
                  }
                  onClick={() => removeLune(luneIndex)}
                >
                  X Supprimer
                </button>
              </div>

              <div className='craft-box'>
                <div
                  style={{
                    marginTop: "0",
                    paddingTop: "10px",
                    borderTop: "1px solid #333",
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                    gap: "8px",
                    width: "100%",
                  }}
                >
                  {weatherFields.map((field) => (
                    <label key={field.key}>
                      🌦️ {field.label} :
                      <input
                        type='number'
                        className='input-global'
                        value={segment.lune.meteo?.[field.key] ?? 1}
                        min='0'
                        max='1'
                        step='0.05'
                        onChange={(event) =>
                          updateLuneGlobal(
                            luneIndex,
                            `meteo.${field.key}`,
                            event.target.value,
                          )
                        }
                      />
                    </label>
                  ))}
                </div>

                <div className='construction-box'>
                  <div className='construction-box-header'>
                    <strong>🏗️ Chantiers de la lune</strong>
                    <button
                      className='btn-add'
                      type='button'
                      onClick={() => addConstruction(luneIndex)}
                    >
                      + Ajouter un chantier
                    </button>
                  </div>

                  <p className='construction-help'>
                    Définis ici le <strong>coût</strong>, les
                    <strong> bâtisseurs requis</strong> et le
                    <strong> gain</strong>. Ensuite, assigne les persos à
                    <strong> 🛠️ Construire</strong> dans le tableau ci-dessous.
                  </p>

                  {(segment.lune.constructions?.length ?? 0) === 0 ? (
                    <p className='info-text'>
                      Aucun chantier défini pour cette lune. Ajoute-en un pour
                      remplacer l’ancien coût global.
                    </p>
                  ) : (
                    <div className='construction-list'>
                      {(segment.lune.constructions ?? []).map(
                        (construction) => {
                          const constructionState =
                            segment.constructionStates?.[construction.id];

                          const resourceLabel = getResourceLabel(
                            availableResources,
                            construction.resourceCode,
                          );
                          const rewardLabel = getRewardLabel(
                            construction.rewardType,
                          );
                          const assignedBuilders =
                            constructionState?.assignedBuilders ?? 0;

                          return (
                            <div
                              key={`${segment.lune.id}-${construction.id}`}
                              className='construction-item'
                            >
                              <div className='construction-form-grid'>
                                <label className='construction-field'>
                                  <span className='construction-field-label'>
                                    Chantier
                                  </span>
                                  <input
                                    type='text'
                                    className='construction-text-input'
                                    value={construction.name}
                                    placeholder='Nom du chantier'
                                    onChange={(event) =>
                                      updateConstruction(
                                        luneIndex,
                                        construction.id,
                                        "name",
                                        event.target.value,
                                      )
                                    }
                                  />
                                </label>
                                <label className='construction-field'>
                                  <span className='construction-field-label'>
                                    Ressource consommée
                                  </span>
                                  <select
                                    value={construction.resourceCode}
                                    onChange={(event) =>
                                      updateConstruction(
                                        luneIndex,
                                        construction.id,
                                        "resourceCode",
                                        event.target.value,
                                      )
                                    }
                                  >
                                    {availableResources.map((resource) => (
                                      <option
                                        key={resource.id}
                                        value={resource.code}
                                      >
                                        {resource.name ||
                                          resource.code.toUpperCase()}
                                      </option>
                                    ))}
                                  </select>
                                </label>
                                <label className='construction-field'>
                                  <span className='construction-field-label'>
                                    Coût
                                  </span>
                                  <input
                                    type='number'
                                    className='construction-number-input'
                                    min='0'
                                    step='1'
                                    value={construction.resourceCost}
                                    onChange={(event) =>
                                      updateConstruction(
                                        luneIndex,
                                        construction.id,
                                        "resourceCost",
                                        event.target.value,
                                      )
                                    }
                                  />
                                </label>
                                <label className='construction-field'>
                                  <span className='construction-field-label'>
                                    Bâtisseurs requis
                                  </span>
                                  <input
                                    type='number'
                                    className='construction-number-input'
                                    min='1'
                                    step='1'
                                    value={construction.buildersRequired}
                                    onChange={(event) =>
                                      updateConstruction(
                                        luneIndex,
                                        construction.id,
                                        "buildersRequired",
                                        event.target.value,
                                      )
                                    }
                                  />
                                </label>
                                <label className='construction-field'>
                                  <span className='construction-field-label'>
                                    Gain au perso
                                  </span>
                                  <select
                                    value={construction.rewardType}
                                    onChange={(event) =>
                                      updateConstruction(
                                        luneIndex,
                                        construction.id,
                                        "rewardType",
                                        event.target.value,
                                      )
                                    }
                                  >
                                    {constructionRewardOptions.map((option) => (
                                      <option
                                        key={option.key}
                                        value={option.key}
                                      >
                                        {option.label}
                                      </option>
                                    ))}
                                  </select>
                                </label>
                                <button
                                  className='btn-del construction-delete-btn'
                                  type='button'
                                  title='Supprimer ce chantier'
                                  onClick={() =>
                                    removeConstruction(
                                      luneIndex,
                                      construction.id,
                                    )
                                  }
                                >
                                  ✕
                                </button>
                              </div>

                              <div className='construction-meta'>
                                <span className='construction-pill'>
                                  Coût :{" "}
                                  <strong>{construction.resourceCost}</strong>{" "}
                                  {resourceLabel}
                                </span>
                                <span className='construction-pill'>
                                  Gain : <strong>{rewardLabel}</strong>
                                </span>
                                <span className='construction-pill'>
                                  Affectés : <strong>{assignedBuilders}</strong>
                                  /{construction.buildersRequired}
                                </span>
                                <span
                                  className={`construction-status ${constructionState?.isCompleted ? "safe" : "warning"}`}
                                >
                                  {constructionState?.statusLabel ??
                                    `En attente (${assignedBuilders}/${construction.buildersRequired})`}
                                </span>
                              </div>
                            </div>
                          );
                        },
                      )}
                    </div>
                  )}
                </div>

                <table>
                  <thead>
                    <tr>
                      <th>Nom</th>
                      <th>PV Début</th>
                      <th style={{ backgroundColor: "#113333" }}>TÂCHE</th>
                      <th>Drogue (1 max)</th>
                      <th>Boit (-1)</th>
                      <th>Mange (-1)</th>
                      <th>Med (-0.5)</th>
                      <th>PV Fin</th>
                      <th>Ajuster</th>
                    </tr>
                  </thead>
                  <tbody>
                    {segment.rows.map((row) => (
                      <Fragment key={`${segment.lune.id}-${row.persoId}`}>
                        <tr
                          className={`${row.mortAuDebut ? "dead" : ""} ${row.isAbsent ? "inactive-row" : ""}`.trim()}
                        >
                          <td>
                            {row.nom}
                            {row.isAbsent ? (
                              <div className='inactive-note'>Absent</div>
                            ) : null}
                          </td>
                          <td>{row.pvDisplayDebut}</td>
                          <td style={{ backgroundColor: "#112222" }}>
                            <select
                              value={row.isAbsent ? "" : row.ration.tache}
                              disabled={row.mortAuDebut || row.isAbsent}
                              style={{ width: "100%" }}
                              onChange={(event) =>
                                updateRation(
                                  luneIndex,
                                  row.persoId,
                                  "tache",
                                  event.target.value,
                                )
                              }
                            >
                              <option value=''>Repos / Autre</option>
                              <option value='eau'>
                                💧 Eau ({row.cDebut.eau.toFixed(2)})
                              </option>
                              <option value='nrt'>
                                🍗 Nrt ({row.cDebut.nrt.toFixed(2)})
                              </option>
                              <option value='med'>
                                💊 Med ({row.cDebut.med.toFixed(2)})
                              </option>
                              <option value='mat'>
                                🧱 Mat ({row.cDebut.mat.toFixed(2)})
                              </option>
                              <option value='construire'>🛠️ Construire</option>
                            </select>
                            {row.ration.tache === "construire" ? (
                              <select
                                value={row.ration.constructionId ?? ""}
                                disabled={
                                  row.mortAuDebut ||
                                  row.isAbsent ||
                                  (segment.lune.constructions?.length ?? 0) ===
                                    0
                                }
                                style={{ width: "100%", marginTop: "0.35rem" }}
                                onChange={(event) =>
                                  updateRation(
                                    luneIndex,
                                    row.persoId,
                                    "constructionId",
                                    event.target.value,
                                  )
                                }
                              >
                                <option value=''>Choisir un chantier</option>
                                {(segment.lune.constructions ?? []).map(
                                  (construction) => (
                                    <option
                                      key={construction.id}
                                      value={construction.id}
                                    >
                                      {construction.name} •{" "}
                                      {construction.buildersRequired} bât.
                                    </option>
                                  ),
                                )}
                              </select>
                            ) : null}
                          </td>
                          <td>
                            <select
                              value={
                                row.isAbsent ? "" : (row.ration.drogue ?? "")
                              }
                              disabled={row.mortAuDebut || row.isAbsent}
                              style={{ width: "100%" }}
                              onChange={(event) =>
                                updateRation(
                                  luneIndex,
                                  row.persoId,
                                  "drogue",
                                  event.target.value,
                                )
                              }
                            >
                              <option value=''>Aucune</option>
                              {Object.entries(DRUG_EFFECTS).map(
                                ([code, effect]) => {
                                  const remaining = Number(
                                    row.availableDrugs[code] ?? 0,
                                  );
                                  const required = Number(
                                    effect.consumptionQuantity ?? 1,
                                  );
                                  const requiresResource =
                                    effect.requiresResource !== false;
                                  return (
                                    <option
                                      key={code}
                                      value={code}
                                      disabled={
                                        requiresResource &&
                                        remaining < required &&
                                        row.ration.drogue !== code
                                      }
                                    >
                                      {effect.label} (
                                      {requiresResource
                                        ? `-${formatDrugQuantity(required)} • ${formatDrugQuantity(remaining)} dispo`
                                        : "hors inventaire"}
                                      )
                                    </option>
                                  );
                                },
                              )}
                            </select>
                            {row.drugStatus ? (
                              <div
                                style={{
                                  marginTop: "0.25rem",
                                  fontSize: "0.75rem",
                                  color:
                                    row.drugClassName === "warning"
                                      ? "#ffb74d"
                                      : row.drugClassName === "inactive"
                                        ? "#9e9e9e"
                                        : "#69f0ae",
                                }}
                              >
                                {row.drugStatus}
                              </div>
                            ) : null}
                          </td>
                          <td>
                            <input
                              type='checkbox'
                              checked={
                                !row.isAbsent &&
                                row.ration.eau &&
                                !row.mortAuDebut
                              }
                              disabled={row.mortAuDebut || row.isAbsent}
                              onChange={(event) =>
                                updateRation(
                                  luneIndex,
                                  row.persoId,
                                  "eau",
                                  event.target.checked,
                                )
                              }
                            />
                          </td>
                          <td>
                            <input
                              type='checkbox'
                              checked={
                                !row.isAbsent &&
                                row.ration.nrt &&
                                !row.mortAuDebut
                              }
                              disabled={row.mortAuDebut || row.isAbsent}
                              onChange={(event) =>
                                updateRation(
                                  luneIndex,
                                  row.persoId,
                                  "nrt",
                                  event.target.checked,
                                )
                              }
                            />
                          </td>
                          <td>
                            <input
                              type='checkbox'
                              checked={
                                !row.isAbsent &&
                                row.ration.med &&
                                !row.mortAuDebut
                              }
                              disabled={row.mortAuDebut || row.isAbsent}
                              onChange={(event) =>
                                updateRation(
                                  luneIndex,
                                  row.persoId,
                                  "med",
                                  event.target.checked,
                                )
                              }
                            />
                          </td>
                          <td className={row.classPv}>
                            {row.pvDisplayFin}
                            {row.mortText}
                          </td>
                          <td>
                            <button
                              className={`btn-gear ${row.hasOverride ? "danger" : ""}`}
                              type='button'
                              onClick={() =>
                                toggleOverrideMenu(luneIndex, row.persoId)
                              }
                            >
                              ⚙️
                            </button>
                          </td>
                        </tr>
                        {openOverrides[`${luneIndex}-${row.persoId}`] && (
                          <tr className='override-row'>
                            <td colSpan={9}>
                              <div
                                style={{
                                  color: "#00bcd4",
                                  fontSize: "0.8em",
                                  marginBottom: "5px",
                                }}
                              >
                                ⚠️ Forcer de nouvelles stats pour{" "}
                                <b>{row.nom}</b> (s'appliquera à partir de cette
                                lune) :
                              </div>
                              <div className='override-box'>
                                <div className='override-item'>
                                  ❤️ PV :
                                  <input
                                    type='number'
                                    placeholder='Laisse vide'
                                    value={
                                      typeof segment.lune.overrides?.[
                                        row.persoId
                                      ]?.pv === "number"
                                        ? Number(
                                            segment.lune.overrides?.[
                                              row.persoId
                                            ]?.pv,
                                          )
                                        : ""
                                    }
                                    onChange={(event) =>
                                      setOverride(
                                        luneIndex,
                                        row.persoId,
                                        "pv",
                                        event.target.value,
                                      )
                                    }
                                  />
                                </div>
                                <div className='override-item'>
                                  👤 Présence :
                                  <select
                                    value={
                                      segment.lune.overrides?.[row.persoId]
                                        ?.present === undefined
                                        ? ""
                                        : String(
                                            segment.lune.overrides?.[
                                              row.persoId
                                            ]?.present,
                                          )
                                    }
                                    onChange={(event) =>
                                      setOverride(
                                        luneIndex,
                                        row.persoId,
                                        "present",
                                        event.target.value,
                                      )
                                    }
                                  >
                                    <option value=''>Auto (état global)</option>
                                    <option value='true'>Présent</option>
                                    <option value='false'>Absent</option>
                                  </select>
                                </div>
                                <div className='override-item'>
                                  💧 Cap Eau:
                                  <input
                                    type='number'
                                    placeholder='Auto'
                                    value={
                                      typeof segment.lune.overrides?.[
                                        row.persoId
                                      ]?.capEau === "number"
                                        ? Number(
                                            segment.lune.overrides?.[
                                              row.persoId
                                            ]?.capEau,
                                          )
                                        : ""
                                    }
                                    onChange={(event) =>
                                      setOverride(
                                        luneIndex,
                                        row.persoId,
                                        "capEau",
                                        event.target.value,
                                      )
                                    }
                                  />
                                </div>
                                <div className='override-item'>
                                  🍗 Cap Nrt:
                                  <input
                                    type='number'
                                    placeholder='Auto'
                                    value={
                                      typeof segment.lune.overrides?.[
                                        row.persoId
                                      ]?.capNrt === "number"
                                        ? Number(
                                            segment.lune.overrides?.[
                                              row.persoId
                                            ]?.capNrt,
                                          )
                                        : ""
                                    }
                                    onChange={(event) =>
                                      setOverride(
                                        luneIndex,
                                        row.persoId,
                                        "capNrt",
                                        event.target.value,
                                      )
                                    }
                                  />
                                </div>
                                <div className='override-item'>
                                  💊 Cap Med:
                                  <input
                                    type='number'
                                    placeholder='Auto'
                                    value={
                                      typeof segment.lune.overrides?.[
                                        row.persoId
                                      ]?.capMed === "number"
                                        ? Number(
                                            segment.lune.overrides?.[
                                              row.persoId
                                            ]?.capMed,
                                          )
                                        : ""
                                    }
                                    onChange={(event) =>
                                      setOverride(
                                        luneIndex,
                                        row.persoId,
                                        "capMed",
                                        event.target.value,
                                      )
                                    }
                                  />
                                </div>
                                <button
                                  className='btn-del'
                                  type='button'
                                  onClick={() =>
                                    clearOverrides(luneIndex, row.persoId)
                                  }
                                >
                                  Effacer
                                </button>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))}
                  </tbody>
                </table>

                <div className='stats-box' style={{ marginTop: "15px" }}>
                  <div className='stat-item'>
                    Stock Fin Lune EAU
                    <br />
                    <span className={`stat-val ${segment.stats.classEau}`}>
                      {segment.stats.stockEau.toFixed(2)}
                    </span>
                  </div>
                  <div className='stat-item'>
                    Stock Fin Lune NRT
                    <br />
                    <span className={`stat-val ${segment.stats.classNrt}`}>
                      {segment.stats.stockNrt.toFixed(2)}
                    </span>
                  </div>
                  <div className='stat-item'>
                    Stock Fin Lune MED
                    <br />
                    <span className={`stat-val ${segment.stats.classMed}`}>
                      {segment.stats.stockMed.toFixed(2)}
                    </span>
                  </div>
                  <div className='stat-item'>
                    Stock Fin Lune MAT
                    <br />
                    <span className={`stat-val ${segment.stats.classMat}`}>
                      {segment.stats.stockMat.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <button
        className='btn-add'
        type='button'
        onClick={addLune}
        style={{ fontSize: "1.1em", padding: "10px 20px" }}
      >
        + Ajouter la Lune suivante
      </button>
    </>
  );
}

export default TimelinePage;
