import TimelineConstructionList from "./TimelineConstructionList";
import TimelineRowEditor from "./TimelineRowEditor";
import TimelineStockSummary from "./TimelineStockSummary";
import Button from "./ui/Button";
import InfoText from "./ui/InfoText";

import type { LuneConstruction, Resource } from "../types";
import { confirmAction } from "../utils/confirmAction";
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
      <InfoText>
        Chaque perso peut consommer <strong>une seule drogue par lune</strong>.
        L'effet n'est appliqué que si la ressource est bien portée en quantité
        suffisante. La <strong>météo</strong> de chaque lune définit
        <strong> 4 coefficients</strong> distincts pour `eau`, `nrt`, `med` et
        `mat`, chacun entre <strong>0</strong> et <strong>1</strong>.
      </InfoText>
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
            <div
              key={segment.lune.id}
              className='mb-5 rounded-lg border border-border-strong border-l-[5px] border-l-accent-cyan bg-panel-alt p-[15px] shadow-panel'
            >
              <div className='mb-2.5 flex items-center justify-between border-b border-border-main pb-2.5'>
                <h3 className='m-0 border-none p-0'>
                  LUNE {Number(segment.lune.id)}
                  {isPastLune ? " • passée (lecture seule)" : ""}
                </h3>
                <Button
                  className='mt-0'
                  size='sm'
                  variant='danger'
                  disabled={isLockedLune}
                  title={
                    isLockedLune
                      ? "Les lunes passées et la lune en cours ne peuvent pas être supprimées"
                      : undefined
                  }
                  onClick={() =>
                    confirmAction(
                      `Supprimer la lune ${Number(segment.lune.id)} ?`,
                      () => removeLune(actualLuneIndex),
                    )
                  }
                >
                  X Supprimer
                </Button>
              </div>

              <div className='mt-2.5 block rounded-[4px] border-l-[3px] border-l-accent-orange bg-[#2c2c2c] p-2.5'>
                <div className='grid w-full grid-cols-[repeat(auto-fit,minmax(130px,1fr))] gap-2 border-t border-border-main pt-2.5'>
                  {weatherFields.map((field) => (
                    <label key={field.key} className='flex flex-col gap-1'>
                      <span>🌦️ {field.label} :</span>
                      <input
                        type='number'
                        className='w-20'
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

                <TimelineConstructionList
                  segment={segment}
                  availableResources={availableResources}
                  placedConstructionIds={placedConstructionIds}
                  actualLuneIndex={actualLuneIndex}
                  isPastLune={isPastLune}
                  toggleConstructionPlacement={toggleConstructionPlacement}
                />

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
                      <TimelineRowEditor
                        key={`${segment.lune.id}-${row.persoId}`}
                        segment={segment}
                        row={row}
                        actualLuneIndex={actualLuneIndex}
                        isPastLune={isPastLune}
                        placedConstructionIds={placedConstructionIds}
                        toggleOverrideMenu={toggleOverrideMenu}
                        openOverrides={openOverrides}
                        updateRation={updateRation}
                        setOverride={setOverride}
                        clearOverrides={clearOverrides}
                      />
                    ))}
                  </tbody>
                </table>

                <TimelineStockSummary stats={segment.stats} />
              </div>
            </div>
          );
        })}
      </div>

      <Button className='mt-3' size='sm' variant='success' onClick={addLune}>
        + Ajouter la Lune suivante
      </Button>
    </>
  );
}

export default TimelinePage;
