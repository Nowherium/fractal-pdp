import { useState } from "react";

import TimelineConstructionList from "./TimelineConstructionList";
import TimelineRowEditor from "./TimelineRowEditor";
import TimelineSegmentHeader from "./TimelineSegmentHeader";
import TimelineSharedToolsSection from "./TimelineSharedToolsSection";
import TimelineStockSummary from "./TimelineStockSummary";
import TimelineWeatherSection from "./TimelineWeatherSection";
import Button from "./ui/Button";

import type { Action, Outil, Resource, ToolSpecialite } from "../types";
import { getPlacedConstructionIdsForLune } from "../utils/stateUtils";
import { downloadTimelineExportText } from "../utils/timelineExport";
import type { TimelineSegment } from "../utils/timelineTypes";

type TimelineRationField =
  | "tache"
  | "eau"
  | "nrt"
  | "med"
  | "dehors"
  | "produit"
  | "drogue"
  | "constructionId"
  | "actionId";

const getTimelineEmptyStateMessage = (rowCount: number) =>
  rowCount === 0
    ? "Il n'y a plus aucun perso dans les effectifs."
    : "Aucun perso affiché pour cette lune. Pense à vérifier le toggle « absents ».";

function TimelineEmptyStateRow({ message }: { message: string }) {
  return (
    <tr>
      <td
        colSpan={11}
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
  updateLuneWeather: (
    luneIndex: number,
    field: "eau" | "nrt" | "med" | "mat",
    rawValue: string | number,
  ) => void;
  toggleLuneAutoAssign: (luneIndex: number, checked: boolean) => void;
  updateLuneToolAssignment: (
    luneIndex: number,
    specialite: ToolSpecialite,
    rawValue: string | number,
  ) => void;
  updateRation: (
    luneIndex: number,
    persoId: number,
    field: TimelineRationField,
    value: string | boolean | number,
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
  actions: Action[];
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
  updateLuneWeather,
  toggleLuneAutoAssign,
  updateLuneToolAssignment,
  updateRation,
  toggleConstructionPlacement,
  toggleOverrideMenu,
  openOverrides,
  setOverride,
  clearOverrides,
  actions,
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
  const [isWeatherOpen, setIsWeatherOpen] = useState(true);
  const [isSharedToolsOpen, setIsSharedToolsOpen] = useState(true);
  const isCompactView = !isWeatherOpen && !isSharedToolsOpen;

  const handleCompactViewChange = (checked: boolean) => {
    setIsWeatherOpen(!checked);
    setIsSharedToolsOpen(!checked);
  };

  const availableOutils = outils.filter((outil) => Number(outil.quantity) > 0);

  return (
    <div
      key={segment.lune.id}
      className='mb-5 rounded-lg border border-l-[5px] border-border-strong border-l-accent-cyan bg-panel-alt p-[15px] shadow-panel'
    >
      <TimelineSegmentHeader
        luneId={Number(segment.lune.id)}
        isPastLune={isPastLune}
        isLockedLune={isLockedLune}
        isCompactView={isCompactView}
        autoAssign={Boolean(segment.lune.autoAssign)}
        showAbsentPersos={showAbsentPersos}
        onCompactViewChange={handleCompactViewChange}
        onAutoAssignChange={(checked) =>
          toggleLuneAutoAssign(actualLuneIndex, checked)
        }
        onShowAbsentPersosChange={onShowAbsentPersosChange}
        onRemove={() => removeLune(actualLuneIndex)}
      />

      <div className='mt-2.5 block rounded-[4px] border-l-[3px] border-l-accent-orange bg-[#2c2c2c] p-2.5'>
        <TimelineWeatherSection
          meteo={segment.lune.meteo}
          open={isWeatherOpen}
          isPastLune={isPastLune}
          onToggle={setIsWeatherOpen}
          onWeatherChange={(field, rawValue) =>
            updateLuneWeather(actualLuneIndex, field, rawValue)
          }
        />

        <TimelineSharedToolsSection
          outils={availableOutils}
          toolAssignments={toolAssignments}
          open={isSharedToolsOpen}
          isPastLune={isPastLune}
          onToggle={setIsSharedToolsOpen}
          onToolAssignmentChange={(specialite, rawValue) =>
            updateLuneToolAssignment(actualLuneIndex, specialite, rawValue)
          }
        />

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
              <th>Dehors</th>
              <th>A produit</th>
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
                  actions={actions}
                />
              ))
            ) : (
              <TimelineEmptyStateRow
                message={getTimelineEmptyStateMessage(segment.rows.length)}
              />
            )}
          </tbody>
        </table>

        <TimelineStockSummary stats={segment.stats} rows={segment.rows} />

        {isCurrentLune ? (
          <div className='mt-3 flex justify-end'>
            <Button
              className='mt-0'
              size='sm'
              variant='muted'
              onClick={() => downloadTimelineExportText(segment, outils)}
            >
              Exporter
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default TimelineSegmentCard;
