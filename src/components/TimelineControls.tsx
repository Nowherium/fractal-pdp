import Button from "./ui/Button";

interface TimelineControlsProps {
  visiblePastLunes: number;
  canShowMorePastLunes: boolean;
  canShowLessPastLunes: boolean;
  currentLune: number;
  areTurnControlsDisabled: boolean;
  disabledTitle?: string | undefined;
  onShowPastLunes: () => void;
  onHidePastLunes: () => void;
  onBackToCurrentLune: () => void;
  onCurrentLuneChange: (value: string) => void;
  onAdvanceTurn: () => void;
}

function TimelineControls({
  visiblePastLunes,
  canShowMorePastLunes,
  canShowLessPastLunes,
  currentLune,
  areTurnControlsDisabled,
  disabledTitle,
  onShowPastLunes,
  onHidePastLunes,
  onBackToCurrentLune,
  onCurrentLuneChange,
  onAdvanceTurn,
}: TimelineControlsProps) {
  return (
    <div className='mb-4 flex flex-wrap items-center justify-center gap-3'>
      <div className='flex flex-wrap gap-2'>
        <Button
          className='mt-0'
          size='sm'
          variant='success'
          disabled={!canShowMorePastLunes}
          onClick={onShowPastLunes}
        >
          ⏪ Lunes passées
          {visiblePastLunes > 0 ? ` (${visiblePastLunes})` : ""}
        </Button>
        <Button
          className='mt-0'
          size='sm'
          variant='success'
          disabled={!canShowLessPastLunes}
          onClick={onHidePastLunes}
        >
          ⏩ Lunes suivantes
        </Button>
        <Button
          className='mt-0'
          size='sm'
          variant='success'
          disabled={!canShowLessPastLunes}
          onClick={onBackToCurrentLune}
        >
          🎯 Lune courante
        </Button>
      </div>

      <label
        aria-disabled={areTurnControlsDisabled}
        title={disabledTitle}
        className={`inline-flex items-center gap-2.5 rounded-lg border border-[#3a3a3a] bg-[#161616] px-[14px] py-2.5 font-bold text-accent-blue ${areTurnControlsDisabled ? "cursor-not-allowed opacity-60" : ""}`}
      >
        🌘 Lune actuelle
        <input
          className='w-[90px] text-center'
          type='number'
          min='1'
          step='1'
          value={currentLune}
          disabled={areTurnControlsDisabled}
          onChange={(event) => onCurrentLuneChange(event.target.value)}
        />
      </label>

      <Button
        className='mt-0'
        size='sm'
        variant='success'
        title={disabledTitle}
        disabled={areTurnControlsDisabled}
        onClick={onAdvanceTurn}
      >
        ⏭️ Passer le tour
      </Button>
    </div>
  );
}

export default TimelineControls;
