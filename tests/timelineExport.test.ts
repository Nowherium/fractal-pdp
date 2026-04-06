import test from "node:test";
import assert from "node:assert/strict";

import { buildTimelineExportText } from "../src/utils/timelineExport";
import type { Outil } from "../src/types";
import type { TimelineSegment } from "../src/utils/timelineTypes";

const outils: Outil[] = [
  { id: 1, name: "Pompe", specialite: "eau", bonus: 2 },
  { id: 2, name: "Scie", specialite: "mat", bonus: 1.5 },
];

const segment: TimelineSegment = {
  actualIndex: 0,
  lune: {
    id: 3,
    meteo: { eau: 1, nrt: 1, med: 1, mat: 1 },
    rations: {},
    overrides: {},
    constructionPlacements: [],
    constructions: [
      {
        id: "chantier-1",
        name: "Filtre",
        resourceCode: "mat",
        resourceCost: 3,
        buildersRequired: 2,
        rewardType: "eau",
        status: "todo",
      },
    ],
    toolAssignments: { eau: 1 },
  },
  rows: [
    {
      persoId: 1,
      nom: "Pablo",
      ration: {
        eau: true,
        nrt: true,
        med: false,
        dehors: true,
        tache: "eau",
        drogue: null,
        constructionId: null,
      },
      mortAuDebut: false,
      isAbsent: false,
      cDebut: { eau: 1, nrt: 1, med: 0, mat: 0, art: 0 },
      pvDebut: 5,
      pvFin: 5,
      pvDisplayDebut: 5,
      pvDisplayFin: 5,
      availableDrugs: {},
    },
    {
      persoId: 2,
      nom: "Nina",
      ration: {
        eau: true,
        nrt: true,
        med: false,
        dehors: false,
        tache: "construire",
        drogue: "cnb",
        constructionId: "chantier-1",
      },
      mortAuDebut: false,
      isAbsent: false,
      cDebut: { eau: 0, nrt: 0, med: 0, mat: 1, art: 0 },
      pvDebut: 6,
      pvFin: 6,
      pvDisplayDebut: 6,
      pvDisplayFin: 6,
      availableDrugs: {},
    },
    {
      persoId: 3,
      nom: "Léo",
      ration: {
        eau: false,
        nrt: false,
        med: false,
        dehors: false,
        tache: "",
        drogue: null,
        constructionId: null,
      },
      mortAuDebut: false,
      isAbsent: true,
      cDebut: { eau: 0, nrt: 0, med: 0, mat: 0, art: 0 },
      pvDebut: 5,
      pvFin: 5,
      pvDisplayDebut: 5,
      pvDisplayFin: 5,
      availableDrugs: {},
    },
  ],
  stats: {
    classEau: "safe",
    startEau: 5,
    prodEau: 2,
    consoEau: 1,
    stockEau: 6,
    deltaEau: 1,
    classNrt: "safe",
    startNrt: 4,
    prodNrt: 1,
    consoNrt: 2,
    stockNrt: 3,
    deltaNrt: -1,
    classMed: "safe",
    startMed: 1,
    prodMed: 0,
    consoMed: 0,
    stockMed: 1,
    deltaMed: 0,
    classMat: "safe",
    startMat: 3,
    prodMat: 2,
    consoMat: 1,
    stockMat: 4,
    deltaMat: 1,
  },
  constructionStates: {},
};

test("builds a lune export memo with one line per perso and a resource recap", () => {
  const text = buildTimelineExportText(segment, outils);

  assert.match(text, /Lune 3/i);
  assert.match(
    text,
    /\*\*Pablo\*\* :\n\s+- Prod \*\*EAU\*\*, en plaine sans drogue, avec Pompe \(x2\)\n\s+- \*\*Rationnement\*\* : médicaments/i,
  );
  assert.match(
    text,
    /\*\*Nina\*\* :\n\s+- construire \*\*Filtre\*\*, en com' drogué .*CNB, sans outil partagé\n\s+- \*\*Rationnement\*\* : médicaments/i,
  );
  assert.match(text, /Léo\s*:\s*absent pour cette lune/i);
  assert.match(text, /Récap ressources/i);
  assert.match(
    text,
    /EAU : Stock début 5 \| Prod estimée 2 \| Conso estimée 1 \| Stock final 6/i,
  );
  assert.match(
    text,
    /MAT : Stock début 3 \| Prod estimée 2 \| Conso estimée 1 \| Stock final 4/i,
  );
});
