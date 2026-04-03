import { Fragment } from "react";

import type { LuneConstruction, Resource } from "../types";
import { DRUG_EFFECTS, formatDrugQuantity } from "../utils/drugEffects";
import { getPlacedConstructionIdsForLune } from "../utils/stateUtils";
import type { TimelineSegment } from "../utils/timelineTypes";

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
  constructions: _constructions,
  timelineData,
  removeLune,
  updateLuneGlobal,
  updateRation,
  toggleConstructionPlacement,
  toggleOverrideMenu,
  openOverrides,
  setOverride,
  clearOverrides,
  addLune,
}: {
  currentLune: number;
  resources: Resource[];
  constructions: LuneConstruction[];
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
  toggleConstructionPlacement: (
    luneIndex: number,
    constructionId: string,
    isPlaced: boolean,
  ) => void;
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
      <h2>5. Ligne du Temps & Assignations</h2>
      <p className='info-text'>
        Chaque perso peut consommer <strong>une seule drogue par lune</strong>.
        L'effet n'est appliqué que si la ressource est bien portée en quantité
        suffisante. La <strong>météo</strong> de chaque lune définit
        <strong> 4 coefficients</strong> distincts pour `eau`, `nrt`, `med` et
        `mat`, chacun entre <strong>0</strong> et <strong>1</strong>.
      </p>
      <div id='timeline'>
        {timelineData.map((segment, luneIndex) => {
          const actualLuneIndex = segment.actualIndex ?? luneIndex;
          const isPastLune = Number(segment.lune.id) < Number(currentLune);
          const isCurrentLune = Number(segment.lune.id) === Number(currentLune);
          const isLockedLune = isPastLune || isCurrentLune;
          const placedConstructionIds = getPlacedConstructionIdsForLune(
            segment.lune,
          );

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
                  LUNE {Number(segment.lune.id)}
                  {isPastLune ? " • passée (lecture seule)" : ""}
                </h3>
                <button
                  className='btn-del'
                  type='button'
                  disabled={isLockedLune}
                  title={
                    isLockedLune
                      ? "Les lunes passées et la lune en cours ne peuvent pas être supprimées"
                      : undefined
                  }
                  onClick={() => removeLune(actualLuneIndex)}
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
                        disabled={isPastLune}
                        onChange={(event) =>
                          updateLuneGlobal(
                            actualLuneIndex,
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
                    <strong>🏗️ Suivi des chantiers</strong>
                    <span className='info-text'>
                      Administration dans l’onglet Chantiers
                    </span>
                  </div>

                  <p className='construction-help'>
                    Les chantiers sont définis globalement. Ici, tu vois leur
                    état sur cette lune et tu choisis lesquels les persos
                    poursuivent.
                  </p>

                  {(segment.lune.constructions?.length ?? 0) === 0 ? (
                    <p className='info-text'>
                      Aucun chantier actif pour cette lune.
                    </p>
                  ) : (
                    <div className='construction-summary-list'>
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
                          const stateClass = constructionState?.isCompleted
                            ? "safe"
                            : constructionState?.statusCode === "in-progress"
                              ? "warning"
                              : "info";
                          const isPlacedThisLune =
                            placedConstructionIds.includes(construction.id);
                          const isCompleted = Boolean(
                            constructionState?.isCompleted,
                          );

                          return (
                            <div
                              key={`${segment.lune.id}-${construction.id}`}
                              className='construction-summary-item'
                            >
                              <div>
                                <strong>{construction.name}</strong>
                                <div className='info-text'>
                                  Coût : {construction.resourceCost}{" "}
                                  {resourceLabel} • Gain : {rewardLabel}
                                </div>
                              </div>
                              <div className='construction-summary-actions'>
                                <label className='construction-place-toggle'>
                                  <input
                                    type='checkbox'
                                    checked={isPlacedThisLune}
                                    disabled={isPastLune || isCompleted}
                                    onChange={(event) =>
                                      toggleConstructionPlacement(
                                        actualLuneIndex,
                                        construction.id,
                                        event.target.checked,
                                      )
                                    }
                                  />
                                  {isPlacedThisLune ? "Posé" : "Poser"}
                                </label>
                                <span
                                  className={`construction-status ${stateClass}`}
                                >
                                  {constructionState?.statusLabel || "À faire"}
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
                              disabled={
                                row.mortAuDebut || row.isAbsent || isPastLune
                              }
                              style={{ width: "100%" }}
                              onChange={(event) =>
                                updateRation(
                                  actualLuneIndex,
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
                                  isPastLune ||
                                  (segment.lune.constructions?.length ?? 0) ===
                                    0
                                }
                                style={{ width: "100%", marginTop: "0.35rem" }}
                                onChange={(event) =>
                                  updateRation(
                                    actualLuneIndex,
                                    row.persoId,
                                    "constructionId",
                                    event.target.value,
                                  )
                                }
                              >
                                <option value=''>Choisir un chantier</option>
                                {(segment.lune.constructions ?? [])
                                  .filter((construction) => {
                                    const isPlacedThisLune =
                                      placedConstructionIds.includes(
                                        construction.id,
                                      );

                                    return (
                                      isPlacedThisLune ||
                                      row.ration.constructionId ===
                                        construction.id
                                    );
                                  })
                                  .map((construction) => {
                                    const isPlacedThisLune =
                                      placedConstructionIds.includes(
                                        construction.id,
                                      );

                                    return (
                                      <option
                                        key={construction.id}
                                        value={construction.id}
                                      >
                                        {construction.name} •{" "}
                                        {isPlacedThisLune
                                          ? "posé"
                                          : "à poser d'abord"}
                                      </option>
                                    );
                                  })}
                              </select>
                            ) : null}
                          </td>
                          <td>
                            <select
                              value={
                                row.isAbsent ? "" : (row.ration.drogue ?? "")
                              }
                              disabled={
                                row.mortAuDebut || row.isAbsent || isPastLune
                              }
                              style={{ width: "100%" }}
                              onChange={(event) =>
                                updateRation(
                                  actualLuneIndex,
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
                              disabled={
                                row.mortAuDebut || row.isAbsent || isPastLune
                              }
                              onChange={(event) =>
                                updateRation(
                                  actualLuneIndex,
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
                              disabled={
                                row.mortAuDebut || row.isAbsent || isPastLune
                              }
                              onChange={(event) =>
                                updateRation(
                                  actualLuneIndex,
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
                              disabled={
                                row.mortAuDebut || row.isAbsent || isPastLune
                              }
                              onChange={(event) =>
                                updateRation(
                                  actualLuneIndex,
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
                              disabled={isPastLune}
                              onClick={() =>
                                toggleOverrideMenu(actualLuneIndex, row.persoId)
                              }
                            >
                              ⚙️
                            </button>
                          </td>
                        </tr>
                        {openOverrides[`${actualLuneIndex}-${row.persoId}`] && (
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
                                        actualLuneIndex,
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
                                        actualLuneIndex,
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
                                        actualLuneIndex,
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
                                        actualLuneIndex,
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
                                        actualLuneIndex,
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
                                    clearOverrides(actualLuneIndex, row.persoId)
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
