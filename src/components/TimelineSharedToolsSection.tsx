import type { Outil, TimelineToolAssignments, ToolSpecialite } from "../types";
import {
  getToolsForSpecialite,
  toolSpecialiteLabels,
} from "../utils/toolUtils";

import CollapsibleSection from "./ui/CollapsibleSection";

const toolAssignmentFields: Array<{ key: ToolSpecialite; label: string }> = [
  { key: "nrt", label: toolSpecialiteLabels.nrt },
  { key: "eau", label: toolSpecialiteLabels.eau },
  { key: "med", label: toolSpecialiteLabels.med },
  { key: "mat", label: toolSpecialiteLabels.mat },
  { key: "art", label: toolSpecialiteLabels.art },
];

interface TimelineSharedToolsSectionProps {
  outils: Outil[];
  toolAssignments: TimelineToolAssignments;
  open: boolean;
  isPastLune: boolean;
  onToggle: (open: boolean) => void;
  onToolAssignmentChange: (
    specialite: ToolSpecialite,
    rawValue: string | number,
  ) => void;
}

function TimelineSharedToolsSection({
  outils,
  toolAssignments,
  open,
  isPastLune,
  onToggle,
  onToolAssignmentChange,
}: TimelineSharedToolsSectionProps) {
  return (
    <CollapsibleSection
      open={open}
      onToggle={onToggle}
      className='mt-3'
      title={
        <>
          <span aria-hidden='true'>🧰</span>
          <span>Outils de production partagés</span>
        </>
      }
      contentClassName='mt-2 grid w-full grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-2'
    >
      {toolAssignmentFields.map((field) => {
        const matchingTools = getToolsForSpecialite(outils, field.key);
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
                onToolAssignmentChange(field.key, event.target.value)
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
    </CollapsibleSection>
  );
}

export default TimelineSharedToolsSection;
