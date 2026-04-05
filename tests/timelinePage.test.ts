import test from "node:test";
import assert from "node:assert/strict";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import TimelinePage from "../src/components/TimelinePage";

const timelinePageProps = {
  currentLune: 1,
  resources: [],
  constructions: [],
  timelineData: [
    {
      actualIndex: 0,
      lune: {
        id: 1,
        meteo: { eau: 1, nrt: 1, med: 1, mat: 1 },
        rations: {},
        overrides: {},
        constructionPlacements: [],
        constructions: [],
      },
      rows: [
        {
          persoId: 1,
          nom: "Présent",
          ration: {
            eau: true,
            nrt: true,
            med: false,
            tache: "",
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
          resourceStocks: { eau: 2.5, nrt: 1, med: 0 },
          rationAvailability: { eau: true, nrt: true, med: true },
          rationSource: { eau: "perso", nrt: "perso", med: "ville" } as const,
        },
        {
          persoId: 2,
          nom: "Absent",
          ration: {
            eau: false,
            nrt: false,
            med: false,
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
          mortText: " (ABSENT)",
          availableDrugs: {},
          resourceStocks: { eau: 0, nrt: 0, med: 0 },
          rationAvailability: { eau: false, nrt: false, med: false },
          rationSource: { eau: "none", nrt: "none", med: "none" } as const,
        },
        {
          persoId: 3,
          nom: "Cadavre",
          ration: {
            eau: false,
            nrt: false,
            med: false,
            tache: "",
            drogue: null,
            constructionId: null,
          },
          mortAuDebut: true,
          isAbsent: false,
          cDebut: { eau: 0, nrt: 0, med: 0, mat: 0, art: 0 },
          pvDebut: 0,
          pvFin: 0,
          pvDisplayDebut: 0,
          pvDisplayFin: 0,
          mortText: " (CADAVRE)",
          availableDrugs: {},
          resourceStocks: { eau: 0, nrt: 0, med: 0 },
          rationAvailability: { eau: false, nrt: false, med: false },
          rationSource: { eau: "none", nrt: "none", med: "none" } as const,
        },
      ],
      stats: {
        stockEau: 0,
        deltaEau: 0,
        classEau: "safe",
        stockNrt: 0,
        deltaNrt: 0,
        classNrt: "safe",
        stockMed: 0,
        deltaMed: 0,
        classMed: "safe",
        stockMat: 0,
        deltaMat: 0,
        classMat: "safe",
      },
      constructionStates: {},
    },
  ],
  removeLune: () => undefined,
  updateLuneGlobal: () => undefined,
  updateRation: () => undefined,
  toggleConstructionPlacement: () => undefined,
  toggleOverrideMenu: () => undefined,
  openOverrides: {},
  setOverride: () => undefined,
  clearOverrides: () => undefined,
  addLune: () => undefined,
};

test("hides absent persos by default in the timeline and exposes the toggle", () => {
  const markup = renderToStaticMarkup(
    createElement(TimelinePage, timelinePageProps),
  );

  assert.match(markup, /Afficher les absents/);
  assert.match(markup, />Présent</);
  assert.doesNotMatch(markup, />Absent</);
  assert.doesNotMatch(markup, />Cadavre</);
  assert.match(markup, /stk 1/);
  assert.match(markup, /stk 2\.5/);
  assert.match(markup, /stk 0/);
  assert.match(markup, /text-accent-red[^>]*>stk 0<\/span>/);
  assert.match(markup, /ville/);
});

test("explains when no perso is visible because only absents or cadavres remain", () => {
  const markup = renderToStaticMarkup(
    createElement(TimelinePage, {
      ...timelinePageProps,
      timelineData: [
        {
          ...timelinePageProps.timelineData[0]!,
          rows: timelinePageProps.timelineData[0]!.rows.filter(
            (row) => row.isAbsent || row.mortAuDebut,
          ),
        },
      ],
    }),
  );

  assert.match(markup, /Aucun perso affiché pour cette lune/i);
  assert.match(markup, /absents/i);
});

test("explains explicitly when there are no persos left in the effectifs", () => {
  const markup = renderToStaticMarkup(
    createElement(TimelinePage, {
      ...timelinePageProps,
      timelineData: [
        {
          ...timelinePageProps.timelineData[0]!,
          rows: [],
        },
      ],
    }),
  );

  assert.match(markup, /plus aucun perso dans les effectifs/i);
});

test("shows absent persos when the toggle is enabled", () => {
  const markup = renderToStaticMarkup(
    createElement(TimelinePage, {
      ...timelinePageProps,
      defaultShowAbsentPersos: true,
    }),
  );

  assert.match(markup, />Présent</);
  assert.match(markup, />Absent</);
  assert.match(markup, />Cadavre</);
});
