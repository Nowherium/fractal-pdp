import type { TimelineSegment } from "../utils/timelineTypes";

const productionTaskKeys = ["nrt", "eau", "med", "mat"] as const;
type ProductionTaskKey = (typeof productionTaskKeys)[number];

const roundAmount = (value: number) => Number(value.toFixed(2));

const stockFields = [
  {
    label: "NRT",
    resourceKey: "nrt",
    startKey: "startNrt",
    prodKey: "prodNrt",
    consoKey: "consoNrt",
    valueKey: "stockNrt",
    classKey: "classNrt",
    deltaKey: "deltaNrt",
  },
  {
    label: "EAU",
    resourceKey: "eau",
    startKey: "startEau",
    prodKey: "prodEau",
    consoKey: "consoEau",
    valueKey: "stockEau",
    classKey: "classEau",
    deltaKey: "deltaEau",
  },
  {
    label: "MED",
    resourceKey: "med",
    startKey: "startMed",
    prodKey: "prodMed",
    consoKey: "consoMed",
    valueKey: "stockMed",
    classKey: "classMed",
    deltaKey: "deltaMed",
  },
  {
    label: "MAT",
    resourceKey: "mat",
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

function TimelineStockSummary({
  stats,
  rows = [],
}: {
  stats: TimelineSegment["stats"];
  rows?: TimelineSegment["rows"];
}) {
  const completedProductionByResource = rows.reduce<
    Record<ProductionTaskKey, number>
  >(
    (acc, row) => {
      const task = String(row.ration.tache ?? "")
        .trim()
        .toLowerCase();

      if (
        row.isAbsent ||
        row.mortAuDebut ||
        !row.ration.produit ||
        !productionTaskKeys.includes(task as ProductionTaskKey)
      ) {
        return acc;
      }

      const resourceKey = task as ProductionTaskKey;
      acc[resourceKey] += Number(row.cDebut[resourceKey] ?? 0);
      return acc;
    },
    { nrt: 0, eau: 0, med: 0, mat: 0 },
  );

  return (
    <div className='mb-2.5 mt-[15px] grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-[10px] rounded-[5px] border border-border-main bg-[#0a0a0a] p-2.5'>
      {stockFields.map((field) => {
        const completedProductionValue = Math.min(
          Number(stats[field.prodKey] ?? 0),
          Number(completedProductionByResource[field.resourceKey] ?? 0),
        );
        const startValue = roundAmount(
          Number(stats[field.startKey] ?? 0) + completedProductionValue,
        );
        const prodValue = roundAmount(Number(stats[field.prodKey] ?? 0));
        const consoValue = Number(stats[field.consoKey] ?? 0);
        const endValue = Number(stats[field.valueKey] ?? 0);
        const deltaValue = roundAmount(
          endValue - startValue + completedProductionValue,
        );

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
                <span className='text-[#9ea7b3]'>Stock</span>
                <span className='font-medium text-white'>
                  {formatAmount(startValue)}
                </span>
              </div>
              <div className='flex items-center justify-between gap-2'>
                <span className='text-[#9ea7b3]'>Prod</span>
                <span
                  className={`font-semibold ${getFlowClassName(prodValue, "text-green-400")}`}
                >
                  {formatSignedAmount(prodValue)} (produit :{" "}
                  {formatAmount(completedProductionValue)})
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
