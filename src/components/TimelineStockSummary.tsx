import type { TimelineSegment } from "../utils/timelineTypes";

const stockFields = [
  {
    label: "Stock Fin Lune NRT",
    valueKey: "stockNrt",
    classKey: "classNrt",
    deltaKey: "deltaNrt",
  },
  {
    label: "Stock Fin Lune EAU",
    valueKey: "stockEau",
    classKey: "classEau",
    deltaKey: "deltaEau",
  },
  {
    label: "Stock Fin Lune MED",
    valueKey: "stockMed",
    classKey: "classMed",
    deltaKey: "deltaMed",
  },
  {
    label: "Stock Fin Lune MAT",
    valueKey: "stockMat",
    classKey: "classMat",
    deltaKey: "deltaMat",
  },
] as const;

const formatDelta = (value: number) =>
  `${value > 0 ? "+" : ""}${value.toFixed(1)}`;

const getDeltaClassName = (value: number) => {
  if (value > 0) return "text-green-400";
  if (value < 0) return "text-accent-red";
  return "text-gray-400";
};

function TimelineStockSummary({ stats }: { stats: TimelineSegment["stats"] }) {
  return (
    <div className='mb-2.5 mt-[15px] flex justify-around gap-[15px] rounded-[5px] border border-border-main bg-[#0a0a0a] p-2.5 max-md:flex-col max-md:items-stretch'>
      {stockFields.map((field) => {
        const deltaValue = stats[field.deltaKey];

        return (
          <div key={field.valueKey} className='text-center'>
            {field.label}
            <br />
            <span className={`text-[1.2em] font-bold ${stats[field.classKey]}`}>
              {stats[field.valueKey].toFixed(1)}
            </span>{" "}
            <span
              className={`text-sm font-semibold ${getDeltaClassName(deltaValue)}`}
            >
              ({formatDelta(deltaValue)})
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default TimelineStockSummary;
