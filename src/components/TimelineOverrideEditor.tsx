import type { TimelineSegment } from "../utils/timelineTypes";

type OverrideNumberField = {
  key: "pv" | "capEau" | "capNrt" | "capMed";
  label: string;
  placeholder: string;
};

const overrideNumberFields: OverrideNumberField[] = [
  { key: "pv", label: "❤️ PV", placeholder: "Laisse vide" },
  { key: "capEau", label: "💧 Cap Eau", placeholder: "Auto" },
  { key: "capNrt", label: "🍗 Cap Nrt", placeholder: "Auto" },
  { key: "capMed", label: "💊 Cap Med", placeholder: "Auto" },
];

const getOverrideNumberValue = (
  segment: TimelineSegment,
  persoId: number,
  field: OverrideNumberField["key"],
) => {
  const value = segment.lune.overrides?.[persoId]?.[field];
  return typeof value === "number" ? Number(value) : "";
};

const getOverridePresenceValue = (
  segment: TimelineSegment,
  persoId: number,
) => {
  const value = segment.lune.overrides?.[persoId]?.present;
  return value === undefined ? "" : String(value);
};

function TimelineOverrideEditor({
  segment,
  actualLuneIndex,
  persoId,
  persoName,
  setOverride,
  clearOverrides,
}: {
  segment: TimelineSegment;
  actualLuneIndex: number;
  persoId: number;
  persoName: string;
  setOverride: (
    luneIndex: number,
    persoId: number,
    field: string,
    rawValue: string | number | boolean | null,
  ) => void;
  clearOverrides: (luneIndex: number, persoId: number) => void;
}) {
  return (
    <tr className='border-x-[3px] border-x-accent-cyan bg-[#1a2a3a]'>
      <td colSpan={9}>
        <div className='mb-[5px] text-[0.8em] text-accent-cyan'>
          ⚠️ Forcer de nouvelles stats pour <b>{persoName}</b> (s'appliquera à
          partir de cette lune) :
        </div>
        <div className='flex flex-wrap items-center justify-center gap-2.5 p-2.5'>
          {overrideNumberFields.map((field) => (
            <div
              key={field.key}
              className='rounded-[4px] border border-border-strong bg-table-bg px-2.5 py-[5px]'
            >
              {field.label} :
              <input
                type='number'
                placeholder={field.placeholder}
                value={getOverrideNumberValue(segment, persoId, field.key)}
                onChange={(event) =>
                  setOverride(
                    actualLuneIndex,
                    persoId,
                    field.key,
                    event.target.value,
                  )
                }
              />
            </div>
          ))}
          <div className='rounded-[4px] border border-border-strong bg-table-bg px-2.5 py-[5px]'>
            👤 Présence :
            <select
              value={getOverridePresenceValue(segment, persoId)}
              onChange={(event) =>
                setOverride(
                  actualLuneIndex,
                  persoId,
                  "present",
                  event.target.value,
                )
              }
            >
              <option value=''>Auto (état global)</option>
              <option value='true'>Présent</option>
              <option value='false'>Absent</option>
            </select>
          </div>
          <button
            className='btn-del mt-0'
            type='button'
            onClick={() => clearOverrides(actualLuneIndex, persoId)}
          >
            Effacer
          </button>
        </div>
      </td>
    </tr>
  );
}

export default TimelineOverrideEditor;
