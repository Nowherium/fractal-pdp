import type { Outil, ResourceStatKey } from "../types";
import type { TimelineRow, TimelineSegment } from "./timelineTypes";

import { formatDrugQuantity, getDrugLabel } from "./drugEffects";
import {
  getBestToolForSpecialite,
  getToolBonusMultiplier,
  normalizeToolSpecialite,
} from "./toolUtils";

const productionTasks: ResourceStatKey[] = ["eau", "nrt", "med", "mat"];

const formatFrenchList = (items: string[]): string => {
  if (items.length === 0) {
    return "non";
  }

  if (items.length === 1) {
    return items[0] ?? "non";
  }

  if (items.length === 2) {
    return `${items[0]} et ${items[1]}`;
  }

  return `${items.slice(0, -1).join(", ")} et ${items[items.length - 1]}`;
};

const resourceSummaries = [
  {
    code: "nrt",
    label: "NRT",
    getValues: (segment: TimelineSegment) => ({
      start: Number(segment.stats.startNrt ?? 0).toFixed(1),
      prod: Number(segment.stats.prodNrt ?? 0).toFixed(1),
      conso: Number(segment.stats.consoNrt ?? 0).toFixed(1),
      stock: Number(segment.stats.stockNrt ?? 0).toFixed(1),
    }),
  },
  {
    code: "eau",
    label: "EAU",
    getValues: (segment: TimelineSegment) => ({
      start: Number(segment.stats.startEau ?? 0).toFixed(1),
      prod: Number(segment.stats.prodEau ?? 0).toFixed(1),
      conso: Number(segment.stats.consoEau ?? 0).toFixed(1),
      stock: Number(segment.stats.stockEau ?? 0).toFixed(1),
    }),
  },
  {
    code: "med",
    label: "MED",
    getValues: (segment: TimelineSegment) => ({
      start: Number(segment.stats.startMed ?? 0).toFixed(1),
      prod: Number(segment.stats.prodMed ?? 0).toFixed(1),
      conso: Number(segment.stats.consoMed ?? 0).toFixed(1),
      stock: Number(segment.stats.stockMed ?? 0).toFixed(1),
    }),
  },
  {
    code: "mat",
    label: "MAT",
    getValues: (segment: TimelineSegment) => ({
      start: Number(segment.stats.startMat ?? 0).toFixed(1),
      prod: Number(segment.stats.prodMat ?? 0).toFixed(1),
      conso: Number(segment.stats.consoMat ?? 0).toFixed(1),
      stock: Number(segment.stats.stockMat ?? 0).toFixed(1),
    }),
  },
] as const;

const getTaskSummary = (row: TimelineRow, segment: TimelineSegment): string => {
  if (row.mortAuDebut) {
    return "cadavre";
  }

  if (row.isAbsent) {
    return "absent pour cette lune";
  }

  switch (
    String(row.ration.tache ?? "")
      .trim()
      .toLowerCase()
  ) {
    case "eau":
      return "Prod **EAU**";
    case "nrt":
      return "Prod **NOURRITURE**";
    case "med":
      return "Prod **MÉDICAMENTS**";
    case "mat":
      return "Prod **MATÉRIAUX**";
    case "construire": {
      const constructionName = (segment.lune.constructions ?? []).find(
        (construction) => construction.id === row.ration.constructionId,
      )?.name;
      return constructionName
        ? `construire **${constructionName}**`
        : "construire";
    }
    default:
      return "AUTRE";
  }
};

const getToolSummary = (
  row: TimelineRow,
  segment: TimelineSegment,
  outils: Outil[] = [],
): string => {
  if (row.mortAuDebut || row.isAbsent) {
    return "";
  }

  const task = String(row.ration.tache ?? "")
    .trim()
    .toLowerCase();
  if (!productionTasks.includes(task as ResourceStatKey)) {
    return "sans outil partagé";
  }

  const specialite = task as ResourceStatKey;
  const toolAssignments = segment.lune.toolAssignments ?? {};
  const hasExplicitSelection = Object.prototype.hasOwnProperty.call(
    toolAssignments,
    specialite,
  );

  const matchedTool = hasExplicitSelection
    ? outils.find((outil) => {
        const sameId = Number(outil.id) === Number(toolAssignments[specialite]);
        return (
          sameId && normalizeToolSpecialite(outil.specialite) === specialite
        );
      })
    : getBestToolForSpecialite(outils, specialite);

  if (!matchedTool || toolAssignments[specialite] === null) {
    return "sans outil partagé";
  }

  return `avec ${matchedTool.name} (x${formatDrugQuantity(getToolBonusMultiplier(matchedTool))})`;
};

const buildPersoLine = (
  row: TimelineRow,
  segment: TimelineSegment,
  outils: Outil[] = [],
): string => {
  const taskSummary = getTaskSummary(row, segment);

  if (row.mortAuDebut || row.isAbsent) {
    return `- ${row.nom} : ${taskSummary}`;
  }

  const rationnement = formatFrenchList(
    [
      !row.ration.nrt ? "nourriture" : null,
      !row.ration.eau ? "eau" : null,
      !row.ration.med ? "médicaments" : null,
    ].filter((value): value is string => Boolean(value)),
  );
  const positionSummary = row.ration.dehors ? "en plaine" : `en com'`;
  const drugSummary = row.ration.drogue
    ? `drogué ${getDrugLabel(row.ration.drogue)},`
    : `sans drogue,`;
  const toolSummary = getToolSummary(row, segment, outils);

  return `- **${row.nom}** :\n  - ${taskSummary}, ${positionSummary} ${drugSummary} ${toolSummary}\n  - **Rationnement** : ${rationnement}`;
};

export const buildTimelineExportText = (
  segment: TimelineSegment,
  outils: Outil[] = [],
): string => {
  const lines = [
    `Lune ${Number(segment.lune.id)} — Plan de production`,
    "",
    ...segment.rows.map((row) => buildPersoLine(row, segment, outils)),
    "",
    "Récap ressources",
    ...resourceSummaries.map(({ label, getValues }) => {
      const values = getValues(segment);
      return `- ${label} : Stock début ${formatDrugQuantity(values.start)} | Prod estimée ${formatDrugQuantity(values.prod)} | Conso estimée ${formatDrugQuantity(values.conso)} | Stock final ${formatDrugQuantity(values.stock)}`;
    }),
  ];

  return lines.join("\n");
};

export const downloadTimelineExportText = (
  segment: TimelineSegment,
  outils: Outil[] = [],
) => {
  if (typeof document === "undefined" || typeof URL === "undefined") {
    return;
  }

  const content = buildTimelineExportText(segment, outils);
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = `fractal_lune_${String(segment.lune.id).padStart(2, "0")}_${new Date().toISOString().slice(0, 10)}.md`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
};
