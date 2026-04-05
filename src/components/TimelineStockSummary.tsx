import type { TimelineSegment } from "../utils/timelineTypes";

const stockFields = [
  {
    label: "NRT",
    startKey: "startNrt",
    prodKey: "prodNrt",
    consoKey: "consoNrt",
    valueKey: "stockNrt",
    classKey: "classNrt",
    deltaKey: "deltaNrt",
  },
  {
    label: "EAU",
    startKey: "startEau",
    prodKey: "prodEau",
    consoKey: "consoEau",
    valueKey: "stockEau",
    classKey: "classEau",
    deltaKey: "deltaEau",
  },
  {
    label: "MED",
    startKey: "startMed",
    prodKey: "prodMed",
    consoKey: "consoMed",
    valueKey: "stockMed",
    classKey: "classMed",
    deltaKey: "deltaMed",
  },
  {
    label: "MAT",
    startKey: "startMat",
    prodKey: "prodMat",
    consoKey: "consoMat",
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

const formatAmount = (value: number) => value.toFixed(1);
const formatSignedAmount = (value: number) =>
  `${value > 0 ? "+" : ""}${value.toFixed(1)}`;

const getFlowClassName = (value: number, positiveClassName: string) => {
  if (value > 0) return positiveClassName;
  if (value < 0) return "text-accent-red";
  return "text-gray-400";
};

function TimelineStockSummary({ stats }: { stats: TimelineSegment["stats"] }) {
  return (
    <div className='mb-2.5 mt-[15px] grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-[10px] rounded-[5px] border border-border-main bg-[#0a0a0a] p-2.5'>
      {stockFields.map((field) => {
        const startValue = Number(stats[field.startKey] ?? 0);
        const prodValue = Number(stats[field.prodKey] ?? 0);
        const consoValue = Number(stats[field.consoKey] ?? 0);
        const endValue = Number(stats[field.valueKey] ?? 0);
        const deltaValue = stats[field.deltaKey];

        return (
          <div
            key={field.valueKey}
            className='rounded-md border border-border-main/80 bg-[#121212] p-2.5 text-[0.85rem]'
          >
            <div className='mb-2 text-center text-[0.95rem] font-bold text-accent-blue'>
              {field.label}
            </div>

            <div className='space-y-1'>
              <div className='flex items-center justify-between gap-2'>
                <span className='text-[#9ea7b3]'>Départ</span>
                <span className='font-medium text-white'>
                  {formatAmount(startValue)}
                </span>
              </div>
              <div className='flex items-center justify-between gap-2'>
                <span className='text-[#9ea7b3]'>Prod</span>
                <span
                  className={`font-semibold ${getFlowClassName(prodValue, "text-green-400")}`}
                >
                  {formatSignedAmount(prodValue)}
                </span>
              </div>
              <div className='flex items-center justify-between gap-2'>
                <span className='text-[#9ea7b3]'>Conso</span>
                <span
                  className={`font-semibold ${getFlowClassName(consoValue > 0 ? -consoValue : consoValue, "text-amber-300")}`}
                >
                  {consoValue > 0
                    ? `-${formatAmount(consoValue)}`
                    : formatAmount(consoValue)}
                </span>
              </div>
              <div className='mt-2 flex items-center justify-between gap-2 border-t border-border-main pt-2'>
                <span className='text-[#d7e3f4]'>Fin</span>
                <span
                  className={`text-[1.05rem] font-bold ${stats[field.classKey]}`}
                >
                  {formatAmount(endValue)}
                  <span
                    className={`font-bold ${getDeltaClassName(deltaValue)}`}
                  >
                    {" "}
                    ({formatDelta(deltaValue)})
                  </span>{" "}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default TimelineStockSummary;
