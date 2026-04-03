import test from "node:test";
import assert from "node:assert/strict";

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

  assert.equal(segment.stats.stockEau, 6);
  assert.equal(segment.rows[1].isAbsent, true);
  assert.match(segment.rows[1].mortText, /ABSENT/);
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
  };

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

  assert.equal(
    timeline[0].constructionStates["chantier-1"].statusCode,
    "in-progress",
  );
  assert.equal(
    timeline[0].constructionStates["chantier-1"].remainingBuilders,
    1,
  );
  assert.equal(timeline[0].stats.stockMat, 0);

  assert.equal(timeline[1].constructionStates["chantier-1"].statusCode, "done");
  assert.equal(
    timeline[1].constructionStates["chantier-1"].remainingBuilders,
    0,
  );
  assert.equal(timeline[1].stats.stockMat, 0);
});

test("supports explicit construction progress separate from the chantier definition", () => {
  const construction = {
    id: "chantier-1",
    name: "Tour de guet",
    resourceCode: "mat",
    resourceCost: 3,
    buildersRequired: 2,
    rewardType: "eau",
  };

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

  assert.equal(
    segment.constructionStates["chantier-1"].statusCode,
    "in-progress",
  );
  assert.equal(segment.constructionStates["chantier-1"].remainingBuilders, 1);
  assert.match(
    segment.constructionStates["chantier-1"].statusLabel,
    /en pause|restant/,
  );
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
  };

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

  assert.equal(
    segment.constructionStates["chantier-2"].statusCode,
    "in-progress",
  );
});

test("normalizes legacy placed ids into constructionPlacements only in app state", () => {
  const state = buildState({
    persos: [],
    constructions: [
      {
        id: "chantier-3",
        name: "Atelier",
        resourceCode: "mat",
        resourceCost: 1,
        buildersRequired: 1,
        rewardType: "mat",
      },
    ],
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

  assert.deepEqual(state.lunes[0].constructionPlacements, [
    { luneId: 1, constructionId: "chantier-3", isPlaced: true },
  ]);
  assert.equal("placedConstructionIds" in state.lunes[0], false);
});

test("lets a chantier return to 'todo' when it is no longer placed", () => {
  const progressById = buildConstructionProgressById(
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

  assert.equal(progressById["chantier-reset"].status, "todo");

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

  assert.equal(segment.constructionStates["chantier-reset"].statusCode, "todo");
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

  assert.equal(timeline[0].stats.stockEau, 11);
  assert.equal(timeline[1].stats.stockEau, 11.1);
});
