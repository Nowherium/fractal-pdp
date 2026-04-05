import { useState } from "react";

import TimelineSegmentCard from "./TimelineSegmentCard";
import Button from "./ui/Button";
import InfoText from "./ui/InfoText";

import type { LuneConstruction, Outil, Resource } from "../types";
import type { TimelineSegment } from "../utils/timelineTypes";

function TimelinePage({
  currentLune,
  resources,
  outils,
  constructions,
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
  defaultShowAbsentPersos = false,
}: {
  currentLune: number;
  resources: Resource[];
  outils: Outil[];
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
  defaultShowAbsentPersos?: boolean;
}) {
  const [showAbsentPersos, setShowAbsentPersos] = useState(
    defaultShowAbsentPersos,
  );
  const availableResources =
    resources.length > 0 ? resources : [{ id: 0, code: "mat", name: "MAT" }];

  return (
    <>
      <h2>5. Ligne du Temps & Assignations</h2>
      <InfoText>
        Chaque perso peut consommer <strong>une seule drogue par lune</strong>.
        Les cases <strong>Boit</strong>, <strong>Mange</strong> et
        <strong> Med</strong> sont maintenant{" "}
        <strong>pilotées manuellement</strong>
        si le stock cumulé <strong>ville + perso</strong> est suffisant. La
        <strong> météo</strong> de chaque lune définit{" "}
        <strong>4 coefficients</strong>
        distincts pour `eau`, `nrt`, `med` et `mat`, chacun entre{" "}
        <strong>0</strong>
        et <strong>1</strong>.
      </InfoText>
      <div id='timeline'>
        {timelineData.map((segment, luneIndex) => (
          <TimelineSegmentCard
            key={segment.lune.id}
            segment={segment}
            luneIndex={luneIndex}
            currentLune={currentLune}
            availableResources={availableResources}
            outils={outils}
            hasDefinedConstructions={constructions.length > 0}
            showAbsentPersos={showAbsentPersos}
            onShowAbsentPersosChange={setShowAbsentPersos}
            removeLune={removeLune}
            updateLuneGlobal={updateLuneGlobal}
            updateRation={updateRation}
            toggleConstructionPlacement={toggleConstructionPlacement}
            toggleOverrideMenu={toggleOverrideMenu}
            openOverrides={openOverrides}
            setOverride={setOverride}
            clearOverrides={clearOverrides}
          />
        ))}
      </div>

      <Button className='mt-3' size='sm' variant='success' onClick={addLune}>
        + Ajouter la Lune suivante
      </Button>
    </>
  );
}

export default TimelinePage;
