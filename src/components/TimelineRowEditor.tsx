import { Fragment } from "react";

import TimelineOverrideEditor from "./TimelineOverrideEditor";
import Button from "./ui/Button";

import { DRUG_EFFECTS, formatDrugQuantity } from "../utils/drugEffects";
import type { TimelineRow, TimelineSegment } from "../utils/timelineTypes";

const isTimelineRowLocked = (row: TimelineRow, isPastLune: boolean) =>
  row.mortAuDebut || row.isAbsent || isPastLune;

const drugStatusClassNames = {
  warning: "text-[#ffb74d]",
  inactive: "text-[#9e9e9e]",
  safe: "text-accent-green",
} as const;

function TimelineRationCheckbox({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean;
  disabled: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <input
      type='checkbox'
      className={`h-[18px] w-[18px] accent-green-500 ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
      checked={checked}
      disabled={disabled}
      title={
        disabled
          ? "Stock ville + perso insuffisant"
          : "Activer ou retirer cette consommation pour la lune"
      }
      onChange={(event) => onChange(event.target.checked)}
    />
  );
}

function TimelineRationCell({
  checked,
  stock,
  disabled,
  onChange,
  source,
}: {
  checked: boolean;
  stock: number;
  disabled: boolean;
  onChange: (checked: boolean) => void;
  source?: "perso" | "ville" | "none";
}) {
  const stockClassName =
    stock <= 0
      ? "text-[0.72rem] text-accent-red"
      : "text-[0.72rem] text-[#9ea7b3]";

  return (
    <div className='flex flex-col items-center gap-1'>
      <TimelineRationCheckbox
        checked={checked}
        disabled={disabled}
        onChange={onChange}
      />
      <span className={stockClassName}>stk {formatDrugQuantity(stock)}</span>
      {source === "ville" ? (
        <span className='rounded-full bg-[#16324a] px-1.5 py-0.5 text-[0.65rem] font-semibold text-accent-cyan'>
          ville
        </span>
      ) : null}
    </div>
  );
}

function TimelineRowEditor({
  segment,
  row,
  actualLuneIndex,
  isPastLune,
  placedConstructionIds,
  toggleOverrideMenu,
  openOverrides,
  updateRation,
  setOverride,
  clearOverrides,
}: {
  segment: TimelineSegment;
  row: TimelineRow;
  actualLuneIndex: number;
  isPastLune: boolean;
  placedConstructionIds: string[];
  toggleOverrideMenu: (luneIndex: number, persoId: number) => void;
  openOverrides: Record<string, boolean>;
  updateRation: (
    luneIndex: number,
    persoId: number,
    field:
      | "tache"
      | "eau"
      | "nrt"
      | "med"
      | "dehors"
      | "drogue"
      | "constructionId",
    value: string | boolean,
  ) => void;
  setOverride: (
    luneIndex: number,
    persoId: number,
    field: string,
    rawValue: string | number | boolean | null,
  ) => void;
  clearOverrides: (luneIndex: number, persoId: number) => void;
}) {
  const isRowLocked = isTimelineRowLocked(row, isPastLune);
  const isAutoAssignEnabled = Boolean(segment.lune.autoAssign);
  const overrideKey = `${actualLuneIndex}-${row.persoId}`;
  const taskSelectValue =
    typeof row.ration.tache === "string" && row.ration.tache.trim() !== ""
      ? row.ration.tache
      : "autre";
  const constructionOptions = (segment.lune.constructions ?? []).filter(
    (construction) => {
      const isPlacedThisLune = placedConstructionIds.includes(construction.id);

      return isPlacedThisLune || row.ration.constructionId === construction.id;
    },
  );

  return (
    <Fragment>
      <tr
        className={`${row.mortAuDebut ? "dead" : ""} ${row.isAbsent ? "inactive-row" : ""}`.trim()}
      >
        <td>
          {row.nom}
          {row.isAbsent ? <div className='inactive-note'>Absent</div> : null}
        </td>
        <td>{row.pvDisplayDebut}</td>
        <td className='text-center'>
          <input
            type='checkbox'
            className={`h-[18px] w-[18px] accent-cyan-500 ${isRowLocked ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
            aria-label={`Dehors pour ${row.nom}`}
            title='Ignore les bonus ville + terrain pour cette lune'
            checked={
              !row.isAbsent && !row.mortAuDebut && Boolean(row.ration.dehors)
            }
            disabled={isRowLocked}
            onChange={(event) =>
              updateRation(
                actualLuneIndex,
                row.persoId,
                "dehors",
                event.target.checked,
              )
            }
          />
        </td>
        <td className='bg-[#112222]'>
          <select
            className='w-full'
            value={row.isAbsent ? "autre" : taskSelectValue}
            disabled={isRowLocked}
            onChange={(event) =>
              updateRation(
                actualLuneIndex,
                row.persoId,
                "tache",
                event.target.value,
              )
            }
          >
            <option value='autre'>Repos / Autre</option>
            <option value='nrt'>🍗 Nrt ({row.cDebut.nrt.toFixed(2)})</option>
            <option value='eau'>💧 Eau ({row.cDebut.eau.toFixed(2)})</option>
            <option value='med'>💊 Med ({row.cDebut.med.toFixed(2)})</option>
            <option value='mat'>🧱 Mat ({row.cDebut.mat.toFixed(2)})</option>
            <option value='construire'>🛠️ Construire</option>
          </select>
          {isAutoAssignEnabled && !row.isAbsent && !row.mortAuDebut ? (
            <div className='mt-1 text-[0.72rem] font-medium text-accent-cyan'>
              Suggestion auto : meilleure prod
            </div>
          ) : null}
          {row.ration.tache === "construire" ? (
            <select
              className='mt-[0.35rem] w-full'
              value={row.ration.constructionId ?? ""}
              disabled={
                isRowLocked || (segment.lune.constructions?.length ?? 0) === 0
              }
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
              {constructionOptions.map((construction) => {
                const isPlacedThisLune = placedConstructionIds.includes(
                  construction.id,
                );

                return (
                  <option key={construction.id} value={construction.id}>
                    {construction.name} •{" "}
                    {isPlacedThisLune ? "posé" : "à poser d'abord"}
                  </option>
                );
              })}
            </select>
          ) : null}
        </td>
        <td>
          <select
            className='w-full'
            value={row.isAbsent ? "" : (row.ration.drogue ?? "")}
            disabled={isRowLocked}
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
            {Object.entries(DRUG_EFFECTS).map(([code, effect]) => {
              const remaining = Number(row.availableDrugs[code] ?? 0);
              const required = Number(effect.consumptionQuantity ?? 1);
              const requiresResource = effect.requiresResource !== false;

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
            })}
          </select>
          {row.drugStatus ? (
            <div
              className={[
                "mt-1 text-[0.75rem]",
                drugStatusClassNames[
                  row.drugClassName === "warning" ||
                  row.drugClassName === "inactive"
                    ? row.drugClassName
                    : "safe"
                ],
              ].join(" ")}
            >
              {row.drugStatus}
            </div>
          ) : null}
        </td>
        <td>
          <TimelineRationCell
            checked={!row.isAbsent && row.ration.nrt && !row.mortAuDebut}
            stock={Number(row.resourceStocks?.["nrt"] ?? 0)}
            disabled={isRowLocked || !(row.rationAvailability?.["nrt"] ?? true)}
            onChange={(checked) =>
              updateRation(actualLuneIndex, row.persoId, "nrt", checked)
            }
            source={row.rationSource?.["nrt"] ?? "none"}
          />
        </td>
        <td>
          <TimelineRationCell
            checked={!row.isAbsent && row.ration.eau && !row.mortAuDebut}
            stock={Number(row.resourceStocks?.["eau"] ?? 0)}
            disabled={isRowLocked || !(row.rationAvailability?.["eau"] ?? true)}
            onChange={(checked) =>
              updateRation(actualLuneIndex, row.persoId, "eau", checked)
            }
            source={row.rationSource?.["eau"] ?? "none"}
          />
        </td>
        <td>
          <TimelineRationCell
            checked={!row.isAbsent && row.ration.med && !row.mortAuDebut}
            stock={Number(row.resourceStocks?.["med"] ?? 0)}
            disabled={isRowLocked || !(row.rationAvailability?.["med"] ?? true)}
            onChange={(checked) =>
              updateRation(actualLuneIndex, row.persoId, "med", checked)
            }
            source={row.rationSource?.["med"] ?? "none"}
          />
        </td>
        <td className={row.classPv}>
          {row.pvDisplayFin}
          {row.mortText}
        </td>
        <td>
          <Button
            className='mt-0 min-w-[2.1rem]'
            size='sm'
            variant={row.hasOverride ? "danger" : "muted"}
            disabled={isPastLune}
            onClick={() => toggleOverrideMenu(actualLuneIndex, row.persoId)}
          >
            ⚙️
          </Button>
        </td>
      </tr>
      {openOverrides[overrideKey] && (
        <TimelineOverrideEditor
          segment={segment}
          actualLuneIndex={actualLuneIndex}
          persoId={row.persoId}
          persoName={row.nom}
          setOverride={setOverride}
          clearOverrides={clearOverrides}
        />
      )}
    </Fragment>
  );
}

export default TimelineRowEditor;
