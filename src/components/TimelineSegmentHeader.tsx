import Button from "./ui/Button";
import Toggle from "./ui/Toggle";

import { confirmAction } from "../utils/confirmAction";

interface TimelineSegmentHeaderProps {
  luneId: number;
  isPastLune: boolean;
  isLockedLune: boolean;
  isCompactView: boolean;
  autoAssign: boolean;
  showAbsentPersos: boolean;
  onCompactViewChange: (checked: boolean) => void;
  onAutoAssignChange: (checked: boolean) => void;
  onShowAbsentPersosChange: (checked: boolean) => void;
  onRemove: () => void;
}

function TimelineSegmentHeader({
  luneId,
  isPastLune,
  isLockedLune,
  isCompactView,
  autoAssign,
  showAbsentPersos,
  onCompactViewChange,
  onAutoAssignChange,
  onShowAbsentPersosChange,
  onRemove,
}: TimelineSegmentHeaderProps) {
  return (
    <div className='mb-2.5 flex items-center justify-between gap-3 border-b border-border-main pb-2.5'>
      <h3 className='m-0 border-none p-0'>
        LUNE {luneId}
        {isPastLune ? " • passée (lecture seule)" : ""}
      </h3>
      <div className='flex flex-wrap items-center gap-2'>
        <Toggle
          label='vue compacte'
          srLabel='Activer la vue compacte pour replier la météo et les outils'
          checked={isCompactView}
          onChange={(event) => onCompactViewChange(event.target.checked)}
        />
        <Toggle
          label='affectation auto'
          srLabel='Activer l’affectation automatique selon la meilleure production'
          checked={autoAssign}
          disabled={isPastLune}
          onChange={(event) => onAutoAssignChange(event.target.checked)}
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
            confirmAction(`Supprimer la lune ${luneId} ?`, onRemove)
          }
        >
          X Supprimer
        </Button>
      </div>
    </div>
  );
}

export default TimelineSegmentHeader;
