import type { LuneConstruction, Resource } from "../types";
import type { TimelineSegment } from "../utils/timelineTypes";

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

const statusToneClassNames = {
  safe: "text-accent-green",
  warning: "text-accent-yellow",
  info: "text-accent-blue",
} as const;

function TimelineConstructionList({
  segment,
  availableResources,
  placedConstructionIds,
  actualLuneIndex,
  isPastLune,
  toggleConstructionPlacement,
}: {
  segment: TimelineSegment;
  availableResources: Resource[];
  placedConstructionIds: string[];
  actualLuneIndex: number;
  isPastLune: boolean;
  toggleConstructionPlacement: (
    luneIndex: number,
    constructionId: string,
    isPlaced: boolean,
  ) => void;
}) {
  return (
    <div className='mt-[14px] border-t border-border-main pt-3'>
      <div className='mb-2.5 flex flex-wrap items-center justify-between gap-3'>
        <strong>🏗️ Suivi des chantiers</strong>
        <span className='mb-0 text-[0.85em] italic text-[#888]'>
          Administration dans l’onglet Chantiers
        </span>
      </div>

      <p className='mb-2.5 text-[0.82em] text-[#9ad9e3]'>
        Les chantiers sont définis globalement. Ici, tu vois leur état sur cette
        lune et tu choisis lesquels les persos poursuivent.
      </p>

      {(segment.lune.constructions?.length ?? 0) === 0 ? (
        <p className='mb-2.5 text-[0.85em] italic text-[#888]'>
          Aucun chantier actif pour cette lune.
        </p>
      ) : (
        <div className='flex flex-col gap-2'>
          {(segment.lune.constructions ?? []).map((construction) => {
            const constructionState =
              segment.constructionStates?.[construction.id];
            const resourceLabel = getResourceLabel(
              availableResources,
              construction.resourceCode,
            );
            const rewardLabel = getRewardLabel(construction.rewardType);
            const stateClass = constructionState?.isCompleted
              ? "safe"
              : constructionState?.statusCode === "in-progress"
                ? "warning"
                : "info";
            const isPlacedThisLune = placedConstructionIds.includes(
              construction.id,
            );
            const isCompleted = Boolean(constructionState?.isCompleted);

            return (
              <div
                key={`${segment.lune.id}-${construction.id}`}
                className='flex items-center justify-between gap-3 rounded-lg border border-border-soft bg-soft-bg px-2.5 py-2'
              >
                <div>
                  <strong>{construction.name}</strong>
                  <div className='mb-0 text-[0.85em] italic text-[#888]'>
                    Coût : {construction.resourceCost} {resourceLabel} • Gain :{" "}
                    {rewardLabel}
                  </div>
                </div>
                <div className='flex flex-wrap items-center gap-2.5'>
                  <label className='inline-flex items-center gap-1.5 text-[0.85em] text-[#d0ecf3]'>
                    <input
                      type='checkbox'
                      className='h-4 w-4 accent-green-500'
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
                    className={[
                      "whitespace-nowrap rounded-full border border-border-strong bg-table-bg px-2.5 py-1 text-[0.8em] font-bold",
                      statusToneClassNames[stateClass],
                    ].join(" ")}
                  >
                    {constructionState?.statusLabel || "À faire"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default TimelineConstructionList;
