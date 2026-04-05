import { useState } from "react";

import TimelineConstructionList from "./TimelineConstructionList";
import TimelineRowEditor from "./TimelineRowEditor";
import TimelineStockSummary from "./TimelineStockSummary";
import Button from "./ui/Button";
import Toggle from "./ui/Toggle";

import type { Outil, Resource, ToolSpecialite } from "../types";
import { confirmAction } from "../utils/confirmAction";
import { getPlacedConstructionIdsForLune } from "../utils/stateUtils";
import {
  getToolsForSpecialite,
  toolSpecialiteLabels,
} from "../utils/toolUtils";
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

const toolAssignmentFields: Array<{ key: ToolSpecialite; label: string }> = [
  { key: "eau", label: toolSpecialiteLabels.eau },
  { key: "nrt", label: toolSpecialiteLabels.nrt },
  { key: "med", label: toolSpecialiteLabels.med },
  { key: "mat", label: toolSpecialiteLabels.mat },
  { key: "art", label: toolSpecialiteLabels.art },
];

type TimelineRationField =
  | "tache"
  | "eau"
  | "nrt"
  | "med"
  | "drogue"
  | "constructionId";

const getTimelineEmptyStateMessage = (rowCount: number) =>
  rowCount === 0
    ? "Il n'y a plus aucun perso dans les effectifs."
    : "Aucun perso affiché pour cette lune. Pense à vérifier le toggle « absents ».";

function TimelineEmptyStateRow({ message }: { message: string }) {
  return (
    <tr>
      <td
        colSpan={9}
        className='py-3 text-center text-[0.85em] italic text-[#9ea7b3]'
      >
        {message}
      </td>
    </tr>
  );
}

interface TimelineSegmentCardProps {
  segment: TimelineSegment;
  luneIndex: number;
  currentLune: number;
  availableResources: Resource[];
  outils: Outil[];
  hasDefinedConstructions: boolean;
  showAbsentPersos: boolean;
  onShowAbsentPersosChange: (checked: boolean) => void;
  removeLune: (luneIndex: number) => void;
  updateLuneGlobal: (
    luneIndex: number,
    field: string,
    rawValue: string | number,
  ) => void;
  updateRation: (
    luneIndex: number,
    persoId: number,
    field: TimelineRationField,
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
}

function TimelineSegmentCard({
  segment,
  luneIndex,
  currentLune,
  availableResources,
  outils,
  hasDefinedConstructions,
  showAbsentPersos,
  onShowAbsentPersosChange,
  removeLune,
  updateLuneGlobal,
  updateRation,
  toggleConstructionPlacement,
  toggleOverrideMenu,
  openOverrides,
  setOverride,
  clearOverrides,
}: TimelineSegmentCardProps) {
  const actualLuneIndex = segment.actualIndex ?? luneIndex;
  const isPastLune = Number(segment.lune.id) < Number(currentLune);
  const isCurrentLune = Number(segment.lune.id) === Number(currentLune);
  const isLockedLune = isPastLune || isCurrentLune;
  const placedConstructionIds = getPlacedConstructionIdsForLune(segment.lune);
  const visibleRows = segment.rows.filter(
    (row) => showAbsentPersos || (!row.isAbsent && !row.mortAuDebut),
  );
  const toolAssignments = segment.lune.toolAssignments ?? {};
  const toolOptionsBySpecialite = Object.fromEntries(
    toolAssignmentFields.map((field) => [
      field.key,
      getToolsForSpecialite(outils, field.key),
    ]),
  ) as Record<ToolSpecialite, Outil[]>;
  const [isWeatherOpen, setIsWeatherOpen] = useState(true);
  const [isSharedToolsOpen, setIsSharedToolsOpen] = useState(true);
  const isCompactView = !isWeatherOpen && !isSharedToolsOpen;

  const handleCompactViewChange = (checked: boolean) => {
    setIsWeatherOpen(!checked);
    setIsSharedToolsOpen(!checked);
  };

  return (
    <div
      key={segment.lune.id}
      className='mb-5 rounded-lg border border-l-[5px] border-border-strong border-l-accent-cyan bg-panel-alt p-[15px] shadow-panel'
    >
      <div className='mb-2.5 flex items-center justify-between gap-3 border-b border-border-main pb-2.5'>
        <h3 className='m-0 border-none p-0'>
          LUNE {Number(segment.lune.id)}
          {isPastLune ? " • passée (lecture seule)" : ""}
        </h3>
        <div className='flex flex-wrap items-center gap-2'>
          <Toggle
            label='vue compacte'
            srLabel='Activer la vue compacte pour replier la météo et les outils'
            checked={isCompactView}
            onChange={(event) => handleCompactViewChange(event.target.checked)}
          />
          <Toggle
            label='absents'
            srLabel='Afficher les absents'
            checked={showAbsentPersos}
            onChange={(event) => onShowAbsentPersosChange(event.target.checked)}
          />
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
      </div>

      <div className='mt-2.5 block rounded-[4px] border-l-[3px] border-l-accent-orange bg-[#2c2c2c] p-2.5'>
        <details
          open={isWeatherOpen}
          onToggle={(event) => setIsWeatherOpen(event.currentTarget.open)}
          className='rounded-md border border-border-main/70 bg-[#252525] px-3 py-2'
        >
          <summary className='flex cursor-pointer list-none items-center justify-between gap-3 rounded-md text-sm font-semibold text-[#f1f1f1] transition-colors hover:text-accent-cyan'>
            <span className='flex items-center gap-2'>
              <span aria-hidden='true'>🌦️</span>
              <span>Météo de la lune</span>
            </span>
            <span className='flex items-center gap-2 text-[0.78rem] font-normal text-[#9ea7b3]'>
              <span>Cliquer pour replier ou déplier</span>
              <span aria-hidden='true'>▾</span>
            </span>
          </summary>
          <div className='mt-2 grid w-full grid-cols-[repeat(auto-fit,minmax(130px,1fr))] gap-2'>
            {weatherFields.map((field) => (
              <label key={field.key} className='flex flex-col gap-1'>
                <span>{field.label} :</span>
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
        </details>

        <details
          open={isSharedToolsOpen}
          onToggle={(event) => setIsSharedToolsOpen(event.currentTarget.open)}
          className='mt-3 rounded-md border border-border-main/70 bg-[#252525] px-3 py-2'
        >
          <summary className='flex cursor-pointer list-none items-center justify-between gap-3 rounded-md text-sm font-semibold text-[#f1f1f1] transition-colors hover:text-accent-cyan'>
            <span className='flex items-center gap-2'>
              <span aria-hidden='true'>🧰</span>
              <span>Outils de production partagés</span>
            </span>
            <span className='flex items-center gap-2 text-[0.78rem] font-normal text-[#9ea7b3]'>
              <span>Cliquer pour replier ou déplier</span>
              <span aria-hidden='true'>▾</span>
            </span>
          </summary>
          <div className='mt-2 grid w-full grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-2'>
            {toolAssignmentFields.map((field) => {
              const matchingTools = toolOptionsBySpecialite[field.key];
              const hasExplicitSelection = Object.prototype.hasOwnProperty.call(
                toolAssignments,
                field.key,
              );
              const selectedToolId = hasExplicitSelection
                ? toolAssignments[field.key]
                : (matchingTools[0]?.id ?? "");

              return (
                <label key={field.key} className='flex flex-col gap-1'>
                  <span>{field.label} :</span>
                  <select
                    className='w-full'
                    value={String(selectedToolId ?? "")}
                    disabled={isPastLune || matchingTools.length === 0}
                    onChange={(event) =>
                      updateLuneGlobal(
                        actualLuneIndex,
                        `toolAssignments.${field.key}`,
                        event.target.value,
                      )
                    }
                  >
                    <option value=''>Aucun</option>
                    {matchingTools.map((outil) => (
                      <option key={outil.id} value={outil.id}>
                        {outil.name} (x{Number(outil.bonus ?? 1).toFixed(2)})
                      </option>
                    ))}
                  </select>
                </label>
              );
            })}
          </div>
        </details>

        {hasDefinedConstructions ? (
          <TimelineConstructionList
            segment={segment}
            availableResources={availableResources}
            placedConstructionIds={placedConstructionIds}
            actualLuneIndex={actualLuneIndex}
            isPastLune={isPastLune}
            toggleConstructionPlacement={toggleConstructionPlacement}
          />
        ) : null}

        <table>
          <thead>
            <tr>
              <th>Nom</th>
              <th>PV Début</th>
              <th style={{ backgroundColor: "#113333" }}>TÂCHE</th>
              <th>Drogue (1 max)</th>
              <th>Mange</th>
              <th>Boit</th>
              <th>Med</th>
              <th>PV Fin</th>
              <th>Ajuster</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.length > 0 ? (
              visibleRows.map((row) => (
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
              ))
            ) : (
              <TimelineEmptyStateRow
                message={getTimelineEmptyStateMessage(segment.rows.length)}
              />
            )}
          </tbody>
        </table>

        <TimelineStockSummary stats={segment.stats} />
      </div>
    </div>
  );
}

export default TimelineSegmentCard;
