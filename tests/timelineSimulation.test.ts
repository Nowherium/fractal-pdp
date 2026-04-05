import test from "node:test";
import assert from "node:assert/strict";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import TimelineStockSummary from "../src/components/TimelineStockSummary";
import type { LuneConstruction } from "../src/types";
import {
  applyTimelineSegmentToState,
  simulateTimeline,
} from "../src/utils/timelineSimulation";
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
    /7\.5<\/span> <span class="text-sm font-semibold text-green-400">\(\+2\.5\)<\/span>/,
  );
  assert.match(
    markup,
    /-1\.0<\/span> <span class="text-sm font-semibold text-accent-red">\(-3\.0\)<\/span>/,
  );
  assert.match(
    markup,
    /4\.0<\/span> <span class="text-sm font-semibold text-gray-400">\(0\.0\)<\/span>/,
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

test("restarts future simulation from the real current-lune state", () => {
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
  assert.equal(secondSegment.stats.stockEau, 11);
});

test("applies ration-based PV loss and recovery while respecting pvmax", () => {
  const persos = [
    { id: 1, nom: "Survivant", present: true, pv: 5, pvmax: 6, capEau: 0 },
    { id: 2, nom: "Repos", present: true, pv: 5.5, pvmax: 6, capEau: 0 },
  ];

  const timeline = simulateTimeline(
    persos,
    [
      {
        id: 1,
        meteo: { eau: 1, nrt: 1, med: 1, mat: 1 },
        overrides: {},
        constructionPlacements: [],
        constructions: [],
        rations: {
          1: {
            eau: false,
            nrt: false,
            med: false,
            tache: "eau",
            drogue: null,
          },
          2: {
            eau: true,
            nrt: true,
            med: true,
            tache: "eau",
            drogue: null,
          },
        },
      },
      {
        id: 2,
        meteo: { eau: 1, nrt: 1, med: 1, mat: 1 },
        overrides: {},
        constructionPlacements: [],
        constructions: [],
        rations: {
          1: {
            eau: true,
            nrt: true,
            med: true,
            tache: "eau",
            drogue: null,
          },
          2: {
            eau: true,
            nrt: true,
            med: true,
            tache: "eau",
            drogue: null,
          },
        },
      },
    ],
    { eau: 0, nrt: 0, med: 0, mat: 0 },
    defaultRation,
    [],
    [],
    [],
    { eau: 1, nrt: 1, med: 1, mat: 1 },
    1,
  );

  const firstSegment = timeline[0];
  const secondSegment = timeline[1];

  assert.ok(firstSegment);
  assert.ok(secondSegment);
  assert.equal(firstSegment.rows[0]?.pvFin, 2.5);
  assert.equal(firstSegment.rows[1]?.pvFin, 6);
  assert.equal(secondSegment.rows[0]?.pvDebut, 2.5);
  assert.equal(secondSegment.rows[0]?.pvFin, 3.5);
  assert.equal(secondSegment.rows[1]?.pvDebut, 6);
  assert.equal(secondSegment.rows[1]?.pvFin, 6);
});

test("anchors the current lune to the live perso state instead of replaying past damage", () => {
  const persos = [
    {
      id: 1,
      nom: "Éclaireur",
      present: true,
      pv: 8,
      pvmax: 10,
      capEau: 2,
      capEauEffectif: 2,
    },
  ];

  const timeline = simulateTimeline(
    persos,
    [
      {
        id: 1,
        meteo: { eau: 1, nrt: 1, med: 1, mat: 1 },
        overrides: {},
        constructionPlacements: [],
        constructions: [],
        rations: {
          1: {
            eau: false,
            nrt: false,
            med: false,
            tache: "eau",
            drogue: null,
          },
        },
      },
      {
        id: 2,
        meteo: { eau: 1, nrt: 1, med: 1, mat: 1 },
        overrides: {},
        constructionPlacements: [],
        constructions: [],
        rations: {
          1: {
            eau: true,
            nrt: true,
            med: true,
            tache: "eau",
            drogue: null,
          },
        },
      },
    ],
    { eau: 0, nrt: 0, med: 0, mat: 0 },
    defaultRation,
    [],
    [],
    [],
    { eau: 1, nrt: 1, med: 1, mat: 1 },
    2,
  );

  const secondSegment = timeline[1];

  assert.ok(secondSegment);
  assert.equal(secondSegment.rows[0]?.pvDebut, 8);
  assert.equal(secondSegment.rows[0]?.pvFin, 9);
});

test("uses the updated production caps in the current lune even if effectif values are stale", () => {
  const [segment] = simulateTimeline(
    [
      {
        id: 1,
        nom: "Porteur d'eau",
        present: true,
        pv: 5,
        pvmax: 5,
        capEau: 4,
        capEauEffectif: 1,
      },
    ],
    [
      {
        id: 1,
        meteo: { eau: 1, nrt: 1, med: 1, mat: 1 },
        overrides: {},
        constructionPlacements: [],
        constructions: [],
        rations: {
          1: {
            eau: true,
            nrt: true,
            med: true,
            tache: "eau",
            drogue: null,
          },
        },
      },
    ],
    { eau: 0, nrt: 0, med: 0, mat: 0 },
    defaultRation,
    [],
    [],
    [],
    { eau: 1, nrt: 1, med: 1, mat: 1 },
    1,
  );

  assert.ok(segment);
  assert.equal(segment.rows[0]?.cDebut.eau, 4);
});

test("uses combined city and perso stock for manual ration choices", () => {
  const resources = [
    { id: 1, code: "eau", name: "Eau" },
    { id: 2, code: "nrt", name: "Nourriture" },
    { id: 3, code: "med", name: "Médicaments" },
  ];
  const persoResources = [
    { perso_id: 1, resource_id: 1, quantity: 1 },
    { perso_id: 1, resource_id: 3, quantity: 1 },
  ];

  const timeline = simulateTimeline(
    [{ id: 1, nom: "Éclaireur", present: true, pv: 5, pvmax: 5, capEau: 0 }],
    [
      {
        id: 1,
        meteo: { eau: 1, nrt: 1, med: 1, mat: 1 },
        overrides: {},
        constructionPlacements: [],
        constructions: [],
        rations: {
          1: {
            eau: true,
            nrt: true,
            med: true,
            tache: "",
            drogue: null,
          },
        },
      },
      {
        id: 2,
        meteo: { eau: 1, nrt: 1, med: 1, mat: 1 },
        overrides: {},
        constructionPlacements: [],
        constructions: [],
        rations: {
          1: {
            eau: false,
            nrt: false,
            med: false,
            tache: "",
            drogue: null,
          },
        },
      },
    ],
    { eau: 0, nrt: 1, med: 0, mat: 0 },
    defaultRation,
    [],
    resources,
    persoResources,
    { eau: 1, nrt: 1, med: 1, mat: 1 },
    1,
  );

  assert.equal(timeline[0]?.rows[0]?.ration.eau, true);
  assert.equal(timeline[0]?.rows[0]?.ration.nrt, true);
  assert.equal(timeline[0]?.rows[0]?.ration.med, true);
  assert.deepEqual(
    (timeline[0]?.rows[0] as { resourceStocks?: Record<string, number> })
      .resourceStocks,
    { eau: 1, nrt: 0, med: 1 },
  );
  assert.equal(timeline[0]?.stats.stockNrt, 0);
  assert.equal(timeline[1]?.rows[0]?.ration.eau, false);
  assert.equal(timeline[1]?.rows[0]?.ration.med, false);
  assert.deepEqual(
    (timeline[1]?.rows[0] as { resourceStocks?: Record<string, number> })
      .resourceStocks,
    { eau: 0, nrt: 0, med: 0 },
  );
});

test("limits drink availability when city stock can only cover part of the group", () => {
  const rows = simulateTimeline(
    [
      { id: 1, nom: "A", present: true, pv: 5, pvmax: 5 },
      { id: 2, nom: "B", present: true, pv: 5, pvmax: 5 },
      { id: 3, nom: "C", present: true, pv: 5, pvmax: 5 },
      { id: 4, nom: "D", present: true, pv: 5, pvmax: 5 },
    ],
    [
      {
        id: 1,
        meteo: { eau: 1, nrt: 1, med: 1, mat: 1 },
        overrides: {},
        constructionPlacements: [],
        constructions: [],
        rations: {
          1: { eau: true, nrt: false, med: false, tache: "", drogue: null },
          2: { eau: true, nrt: false, med: false, tache: "", drogue: null },
          3: { eau: true, nrt: false, med: false, tache: "", drogue: null },
          4: { eau: false, nrt: false, med: false, tache: "", drogue: null },
        },
      },
    ],
    { eau: 3, nrt: 0, med: 0, mat: 0 },
    defaultRation,
    [],
    [{ id: 1, code: "eau", name: "Eau" }],
    [],
    { eau: 1, nrt: 1, med: 1, mat: 1 },
    1,
  )[0]?.rows;

  assert.ok(rows);
  assert.equal(rows[0]?.rationAvailability?.eau, true);
  assert.equal(rows[1]?.rationAvailability?.eau, true);
  assert.equal(rows[2]?.rationAvailability?.eau, true);
  assert.equal(rows[3]?.rationAvailability?.eau, false);
  assert.equal(rows[0]?.rationSource?.eau, "ville");
  assert.equal(rows[1]?.rationSource?.eau, "ville");
  assert.equal(rows[2]?.rationSource?.eau, "ville");
  assert.equal(rows[3]?.rationSource?.eau, "none");
});

test("applies the passed turn results back to persos, carried resources and stocks", () => {
  const resources = [
    { id: 1, code: "eau", name: "Eau" },
    { id: 2, code: "nrt", name: "Nourriture" },
    { id: 3, code: "med", name: "Médicaments" },
  ];
  const persoResources = [
    { perso_id: 1, resource_id: 1, quantity: 1 },
    { perso_id: 1, resource_id: 2, quantity: 1 },
    { perso_id: 1, resource_id: 3, quantity: 1 },
  ];
  const persos = [
    {
      id: 1,
      nom: "Gardien",
      present: true,
      pv: 5,
      pvmax: 6,
      capEau: 2,
      capEauEffectif: 2,
      capNrt: 0,
      capNrtEffectif: 0,
      capMed: 0,
      capMedEffectif: 0,
      capMat: 0,
      capMatEffectif: 0,
      capart: 0,
      capArtEffectif: 0,
      combat: 1,
    },
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
          1: {
            eau: true,
            nrt: true,
            med: true,
            tache: "eau",
            drogue: null,
          },
        },
      },
    ],
    { eau: 1, nrt: 1, med: 1, mat: 0 },
    defaultRation,
    [],
    resources,
    persoResources,
    { eau: 1, nrt: 1, med: 1, mat: 1 },
    1,
  );

  assert.ok(segment);

  const advanced = applyTimelineSegmentToState(
    persos,
    { eau: 1, nrt: 1, med: 1, mat: 0 },
    segment,
    persoResources,
    resources,
  );

  assert.equal(advanced.persos[0]?.pv, 6);
  assert.equal(advanced.persos[0]?.capEau, 2.1);
  assert.equal(advanced.stocks["eau"], 2);
  assert.equal(advanced.stocks["nrt"], 0);
  assert.equal(advanced.stocks["med"], 0);
  assert.equal(advanced.persoResources.length, 0);
});
