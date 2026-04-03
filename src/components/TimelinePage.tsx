import { Fragment } from "react";

import type { Lune, Ration } from "../types";
import { DRUG_EFFECTS, formatDrugQuantity } from "../utils/drugEffects";

type TimelineRow = {
  persoId: number;
  nom: string;
  ration: Ration;
  mortAuDebut: boolean;
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

type TimelineSegment = {
  lune: Lune;
  rows: TimelineRow[];
  stats: TimelineStats;
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

function TimelinePage({
  timelineData,
  removeLune,
  updateLuneGlobal,
  updateRation,
  toggleOverrideMenu,
  openOverrides,
  setOverride,
  clearOverrides,
  addLune,
}: {
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
    field: "tache" | "eau" | "nrt" | "med" | "drogue",
    value: string | boolean,
  ) => void;
  toggleOverrideMenu: (luneIndex: number, persoId: number) => void;
  openOverrides: Record<string, boolean>;
  setOverride: (
    luneIndex: number,
    persoId: number,
    field: string,
    rawValue: string | number,
  ) => void;
  clearOverrides: (luneIndex: number, persoId: number) => void;
  addLune: () => void;
}) {
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
        {timelineData.map((segment, luneIndex) => (
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
                LUNE {luneIndex + 1}
              </h3>
              <button
                className='btn-del'
                type='button'
                onClick={() => removeLune(luneIndex)}
              >
                X Supprimer
              </button>
            </div>

            <div className='craft-box'>
              <label>
                🛠️ Construction de la lune (Coût Mat) :
                <input
                  type='number'
                  className='input-global'
                  value={segment.lune.coutMat}
                  step='1'
                  onChange={(event) =>
                    updateLuneGlobal(luneIndex, "coutMat", event.target.value)
                  }
                />
              </label>
              <div
                style={{
                  marginTop: "10px",
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
                    <tr className={row.mortAuDebut ? "dead" : ""}>
                      <td>{row.nom}</td>
                      <td>{row.pvDisplayDebut}</td>
                      <td style={{ backgroundColor: "#112222" }}>
                        <select
                          value={row.ration.tache}
                          disabled={row.mortAuDebut}
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
                      </td>
                      <td>
                        <select
                          value={row.ration.drogue ?? ""}
                          disabled={row.mortAuDebut}
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
                          checked={row.ration.eau && !row.mortAuDebut}
                          disabled={row.mortAuDebut}
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
                          checked={row.ration.nrt && !row.mortAuDebut}
                          disabled={row.mortAuDebut}
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
                          checked={row.ration.med && !row.mortAuDebut}
                          disabled={row.mortAuDebut}
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
                            ⚠️ Forcer de nouvelles stats pour <b>{row.nom}</b>{" "}
                            (s'appliquera à partir de cette lune) :
                          </div>
                          <div className='override-box'>
                            <div className='override-item'>
                              ❤️ PV :
                              <input
                                type='number'
                                placeholder='Laisse vide'
                                value={
                                  segment.lune.overrides?.[row.persoId]?.pv ??
                                  ""
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
                              💧 Cap Eau:
                              <input
                                type='number'
                                placeholder='Auto'
                                value={
                                  segment.lune.overrides?.[row.persoId]
                                    ?.capEau ?? ""
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
                                  segment.lune.overrides?.[row.persoId]
                                    ?.capNrt ?? ""
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
                                  segment.lune.overrides?.[row.persoId]
                                    ?.capMed ?? ""
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
        ))}
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
