import test from "node:test";
import assert from "node:assert/strict";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import TimelineStockSummary from "../src/components/TimelineStockSummary";
import type { LuneConstruction } from "../src/types";
import { simulateTimeline } from "../src/utils/timelineSimulation";
import {
  buildConstructionProgressById,
  buildState,
} from "../src/utils/stateUtils";

const defaultRation = () => ({
  eau: false,
  nrt: false,
  med: false,
  tache: "eau",
  drogue: null,
  constructionId: null,
});

test("renders stock deltas with the expected formatting and colors", () => {
  const markup = renderToStaticMarkup(
    createElement(TimelineStockSummary, {
      stats: {
        stockEau: 7.5,
        deltaEau: 2.5,
        classEau: "safe",
        stockNrt: -1,
        deltaNrt: -3,
        classNrt: "danger",
        stockMed: 4,
        deltaMed: 0,
        classMed: "safe",
        stockMat: 1.25,
        deltaMat: 0.75,
        classMat: "safe",
      },
    }),
  );

  assert.match(
    markup,
    /7\.50<\/span> <span class="text-sm font-semibold text-green-400">\(\+2\.50\)<\/span>/,
  );
  assert.match(
    markup,
    /-1\.00<\/span> <span class="text-sm font-semibold text-accent-red">\(-3\.00\)<\/span>/,
  );
  assert.match(
    markup,
    /4\.00<\/span> <span class="text-sm font-semibold text-gray-400">\(0\.00\)<\/span>/,
  );
});

test("ignores absent persos in timeline calculations", () => {
  const persos = [
    { id: 1, nom: "Présent", present: true, pv: 10, pvmax: 10, capEau: 2 },
    { id: 2, nom: "Absent", present: false, pv: 10, pvmax: 10, capEau: 10 },
  ];

  const lunes = [
    {
      id: 1,
      meteo: { eau: 1, nrt: 1, med: 1, mat: 1 },
      overrides: {},
      constructionPlacements: [],
      constructions: [],
      rations: {
        1: { eau: true, nrt: false, med: false, tache: "eau", drogue: null },
        2: { eau: true, nrt: false, med: false, tache: "eau", drogue: null },
      },
    },
  ];

  const [segment] = simulateTimeline(
    persos,
    lunes,
    { eau: 5, nrt: 0, med: 0, mat: 0 },
    defaultRation,
    [],
    [],
    [],
    { eau: 1, nrt: 1, med: 1, mat: 1 },
    1,
  );

  assert.ok(segment);
  const absentRow = segment.rows[1];

  assert.ok(absentRow);
  assert.equal(segment.stats.stockEau, 6);
  assert.equal(absentRow.isAbsent, true);
  assert.match(absentRow.mortText ?? "", /ABSENT/);
});

test("exposes stock deltas for the lune summary", () => {
  const persos = [
    { id: 1, nom: "Récupérateur", present: true, pv: 10, pvmax: 10, capEau: 3 },
  ];

  const [segment] = simulateTimeline(
    persos,
    [
      {
        id: 1,
        meteo: { eau: 1, nrt: 1, med: 1, mat: 1 },
        overrides: {},
        constructionPlacements: [],
        constructions: [],
        rations: {
          1: { eau: true, nrt: false, med: false, tache: "eau", drogue: null },
        },
      },
    ],
    { eau: 5, nrt: 2, med: 1, mat: 0 },
    defaultRation,
    [],
    [],
    [],
    { eau: 1, nrt: 1, med: 1, mat: 1 },
    1,
  );

  assert.ok(segment);
  assert.equal(segment.stats.stockEau, 7);
  assert.equal(segment.stats.deltaEau, 2);
  assert.equal(segment.stats.deltaNrt, 0);
  assert.equal(segment.stats.deltaMed, 0);
  assert.equal(segment.stats.deltaMat, 0);
});

test("keeps chantier progress across lunes once the cost is paid", () => {
  const persos = [
    { id: 1, nom: "Bâtisseur", present: true, pv: 10, pvmax: 10, capMat: 1 },
  ];

  const construction = {
    id: "chantier-1",
    name: "Tour de guet",
    resourceCode: "mat",
    resourceCost: 3,
    buildersRequired: 2,
    rewardType: "eau",
    status: "todo",
  } satisfies LuneConstruction;

  const lunes = [
    {
      id: 1,
      meteo: { eau: 1, nrt: 1, med: 1, mat: 1 },
      overrides: {},
      constructionPlacements: [
        { luneId: 1, constructionId: "chantier-1", isPlaced: true },
      ],
      constructions: [],
      rations: {
        1: {
          eau: false,
          nrt: false,
          med: false,
          tache: "construire",
          drogue: null,
          constructionId: "chantier-1",
        },
      },
    },
    {
      id: 2,
      meteo: { eau: 1, nrt: 1, med: 1, mat: 1 },
      overrides: {},
      constructionPlacements: [
        { luneId: 2, constructionId: "chantier-1", isPlaced: true },
      ],
      constructions: [],
      rations: {
        1: {
          eau: false,
          nrt: false,
          med: false,
          tache: "construire",
          drogue: null,
          constructionId: "chantier-1",
        },
      },
    },
  ];

  const timeline = simulateTimeline(
    persos,
    lunes,
    { eau: 0, nrt: 0, med: 0, mat: 3 },
    defaultRation,
    [construction],
    [],
    [],
    { eau: 1, nrt: 1, med: 1, mat: 1 },
    1,
  );

  const firstSegment = timeline[0];
  const secondSegment = timeline[1];
  const firstConstructionState =
    firstSegment?.constructionStates?.["chantier-1"];
  const secondConstructionState =
    secondSegment?.constructionStates?.["chantier-1"];

  assert.ok(firstSegment);
  assert.ok(secondSegment);
  assert.ok(firstConstructionState);
  assert.ok(secondConstructionState);
  assert.equal(firstConstructionState.statusCode, "in-progress");
  assert.equal(firstConstructionState.remainingBuilders, 1);
  assert.equal(firstSegment.stats.stockMat, 0);

  assert.equal(secondConstructionState.statusCode, "done");
  assert.equal(secondConstructionState.remainingBuilders, 0);
  assert.equal(secondSegment.stats.stockMat, 0);
});

test("supports explicit construction progress separate from the chantier definition", () => {
  const construction = {
    id: "chantier-1",
    name: "Tour de guet",
    resourceCode: "mat",
    resourceCost: 3,
    buildersRequired: 2,
    rewardType: "eau",
  } satisfies LuneConstruction;

  const [segment] = simulateTimeline(
    [],
    [
      {
        id: 1,
        meteo: { eau: 1, nrt: 1, med: 1, mat: 1 },
        overrides: {},
        constructionPlacements: [],
        constructions: [],
        rations: {},
      },
    ],
    { eau: 0, nrt: 0, med: 0, mat: 0 },
    defaultRation,
    [construction],
    [],
    [],
    { eau: 1, nrt: 1, med: 1, mat: 1 },
    1,
    {
      "chantier-1": {
        constructionId: "chantier-1",
        status: "in-progress",
        costPaid: true,
        remainingBuilders: 1,
        startedAtLune: 1,
        completedAtLune: null,
      },
    },
  );

  assert.ok(segment);
  const constructionState = segment.constructionStates?.["chantier-1"];

  assert.ok(constructionState);
  assert.equal(constructionState.statusCode, "in-progress");
  assert.equal(constructionState.remainingBuilders, 1);
  assert.match(constructionState.statusLabel, /en pause|restant/);
});

test("supports explicit lune placements separate from placedConstructionIds", () => {
  const construction = {
    id: "chantier-2",
    name: "Muraille",
    resourceCode: "mat",
    resourceCost: 2,
    buildersRequired: 1,
    rewardType: "mat",
    status: "todo",
  } satisfies LuneConstruction;

  const [segment] = simulateTimeline(
    [],
    [
      {
        id: 1,
        meteo: { eau: 1, nrt: 1, med: 1, mat: 1 },
        overrides: {},
        constructionPlacements: [
          { luneId: 1, constructionId: "chantier-2", isPlaced: true },
        ],
        constructions: [],
        rations: {},
      },
    ],
    { eau: 0, nrt: 0, med: 0, mat: 2 },
    defaultRation,
    [construction],
    [],
    [],
    { eau: 1, nrt: 1, med: 1, mat: 1 },
    1,
  );

  assert.ok(segment);
  const constructionState = segment.constructionStates?.["chantier-2"];

  assert.ok(constructionState);
  assert.equal(constructionState.statusCode, "in-progress");
});

test("normalizes legacy placed ids into constructionPlacements only in app state", () => {
  const construction = {
    id: "chantier-3",
    name: "Atelier",
    resourceCode: "mat",
    resourceCost: 1,
    buildersRequired: 1,
    rewardType: "mat",
  } satisfies LuneConstruction;

  const state = buildState({
    persos: [],
    constructions: [construction],
    lunes: [
      {
        id: 1,
        meteo: { eau: 1, nrt: 1, med: 1, mat: 1 },
        rations: {},
        overrides: {},
        placedConstructionIds: ["chantier-3"],
        constructions: [],
      },
    ],
  });

  const firstLune = state.lunes[0];

  assert.ok(firstLune);
  assert.deepEqual(firstLune.constructionPlacements, [
    { luneId: 1, constructionId: "chantier-3", isPlaced: true },
  ]);
  assert.equal("placedConstructionIds" in firstLune, false);
});

test("lets a chantier return to 'todo' when it is no longer placed", () => {
  const construction = {
    id: "chantier-reset",
    name: "Hangar",
    resourceCode: "mat",
    resourceCost: 4,
    buildersRequired: 2,
    rewardType: "mat",
    status: "todo",
  } satisfies LuneConstruction;

  const progressById = buildConstructionProgressById(
    [construction],
    [
      {
        id: 1,
        meteo: { eau: 1, nrt: 1, med: 1, mat: 1 },
        constructionPlacements: [],
        rations: {},
        overrides: {},
        constructions: [],
      },
    ],
    1,
    {
      "chantier-reset": {
        constructionId: "chantier-reset",
        status: "todo",
        costPaid: true,
        remainingBuilders: 1,
        startedAtLune: 1,
      },
    },
  );

  const resetProgress = progressById["chantier-reset"];

  assert.ok(resetProgress);
  assert.equal(resetProgress.status, "todo");

  const [segment] = simulateTimeline(
    [],
    [
      {
        id: 1,
        meteo: { eau: 1, nrt: 1, med: 1, mat: 1 },
        constructionPlacements: [],
        rations: {},
        overrides: {},
        constructions: [],
      },
    ],
    { eau: 0, nrt: 0, med: 0, mat: 10 },
    defaultRation,
    [
      {
        id: "chantier-reset",
        name: "Hangar",
        resourceCode: "mat",
        resourceCost: 4,
        buildersRequired: 2,
        rewardType: "mat",
        status: "todo",
      },
    ],
    [],
    [],
    { eau: 1, nrt: 1, med: 1, mat: 1 },
    1,
    progressById,
  );

  assert.ok(segment);
  const constructionState = segment.constructionStates?.["chantier-reset"];

  assert.ok(constructionState);
  assert.equal(constructionState.statusCode, "todo");
});

test("restarts future simulation from the real current-lune stocks", () => {
  const persos = [
    { id: 1, nom: "Scout", present: true, pv: 10, pvmax: 10, capEau: 2 },
  ];

  const lunes = [
    {
      id: 1,
      meteo: { eau: 1, nrt: 1, med: 1, mat: 1 },
      overrides: {},
      constructionPlacements: [],
      constructions: [],
      rations: {
        1: { eau: true, nrt: false, med: false, tache: "eau", drogue: null },
      },
    },
    {
      id: 2,
      meteo: { eau: 1, nrt: 1, med: 1, mat: 1 },
      overrides: {},
      constructionPlacements: [],
      constructions: [],
      rations: {
        1: { eau: true, nrt: false, med: false, tache: "eau", drogue: null },
      },
    },
  ];

  const timeline = simulateTimeline(
    persos,
    lunes,
    { eau: 10, nrt: 0, med: 0, mat: 0 },
    defaultRation,
    [],
    [],
    [],
    { eau: 1, nrt: 1, med: 1, mat: 1 },
    2,
  );

  const firstSegment = timeline[0];
  const secondSegment = timeline[1];

  assert.ok(firstSegment);
  assert.ok(secondSegment);
  assert.equal(firstSegment.stats.stockEau, 11);
  assert.equal(secondSegment.stats.stockEau, 11.1);
});
