import type { TimelineSegment } from "../utils/timelineTypes";

const stockFields = [
  { label: "Stock Fin Lune EAU", valueKey: "stockEau", classKey: "classEau" },
  { label: "Stock Fin Lune NRT", valueKey: "stockNrt", classKey: "classNrt" },
  { label: "Stock Fin Lune MED", valueKey: "stockMed", classKey: "classMed" },
  { label: "Stock Fin Lune MAT", valueKey: "stockMat", classKey: "classMat" },
] as const;

function TimelineStockSummary({ stats }: { stats: TimelineSegment["stats"] }) {
  return (
    <div className='mb-2.5 mt-[15px] flex justify-around gap-[15px] rounded-[5px] border border-border-main bg-[#0a0a0a] p-2.5 max-md:flex-col max-md:items-stretch'>
      {stockFields.map((field) => (
        <div key={field.valueKey} className='text-center'>
          {field.label}
          <br />
          <span className={`text-[1.2em] font-bold ${stats[field.classKey]}`}>
            {stats[field.valueKey].toFixed(2)}
          </span>
        </div>
      ))}
    </div>
  );
}

export default TimelineStockSummary;
