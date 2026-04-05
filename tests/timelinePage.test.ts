import test from "node:test";
import assert from "node:assert/strict";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import TimelineOverrideEditor from "../src/components/TimelineOverrideEditor";
import TimelinePage from "../src/components/TimelinePage";
import type { Outil } from "../src/types";

const timelinePageProps = {
  currentLune: 1,
  resources: [],
  outils: [
    { id: 1, name: "Pompe", specialite: "eau", bonus: 2 },
    { id: 2, name: "Piège", specialite: "nrt", bonus: 1.5 },
    { id: 3, name: "Trousse", specialite: "med", bonus: 1.2 },
    { id: 4, name: "Marteau", specialite: "mat", bonus: 1.3 },
    { id: 5, name: "Pinceau", specialite: "art", bonus: 1.1 },
  ] satisfies Outil[],
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

test("renders the compact-view toggle before the absents toggle", () => {
  const markup = renderToStaticMarkup(
    createElement(TimelinePage, timelinePageProps),
  );

  assert.match(markup, /vue compacte/i);
  assert.match(markup, /vue compacte[\s\S]*absents/i);
});

test("renders global tool selects for each production specialty", () => {
  const markup = renderToStaticMarkup(
    createElement(TimelinePage, timelinePageProps),
  );

  assert.match(markup, /Outils de production partagés/i);
  assert.match(markup, /Pompe/);
  assert.match(markup, /Piège/);
  assert.match(markup, /Trousse/);
  assert.match(markup, /Marteau/);
  assert.match(markup, /Pinceau/);
});

test("renders collapsible météo and shared-tools sections", () => {
  const markup = renderToStaticMarkup(
    createElement(TimelinePage, timelinePageProps),
  );

  assert.match(markup, /<summary[^>]*>/);
  assert.match(markup, /Météo de la lune/);
  assert.match(markup, /Outils de production partagés/);
  assert.match(markup, /Cliquer pour replier ou déplier/i);
  assert.match(markup, /▾/);
});

test("hides the chantier block entirely when no chantier is defined", () => {
  const markup = renderToStaticMarkup(
    createElement(TimelinePage, timelinePageProps),
  );

  assert.doesNotMatch(markup, /Suivi des chantiers/i);
  assert.doesNotMatch(markup, /Aucun chantier actif pour cette lune/i);
});

test("shows the chantier block when at least one chantier is defined", () => {
  const markup = renderToStaticMarkup(
    createElement(TimelinePage, {
      ...timelinePageProps,
      constructions: [
        {
          id: "chantier-1",
          name: "Tour de guet",
          resourceCode: "mat",
          resourceCost: 3,
          buildersRequired: 2,
          rewardType: "eau",
          status: "todo",
        },
      ],
    }),
  );

  assert.match(markup, /Suivi des chantiers/i);
  assert.match(markup, /Aucun chantier actif pour cette lune/i);
});

test("preselects the highest-bonus shared tool by default", () => {
  const markup = renderToStaticMarkup(
    createElement(TimelinePage, {
      ...timelinePageProps,
      outils: [
        ...timelinePageProps.outils,
        { id: 6, name: "Seau", specialite: "eau", bonus: 1.1 },
      ] satisfies Outil[],
    }),
  );

  assert.match(
    markup,
    /<option[^>]*value="1"[^>]*selected=""[^>]*>Pompe \(x2\.00\)<\/option>/,
  );
  assert.doesNotMatch(
    markup,
    /<option[^>]*value="6"[^>]*selected=""[^>]*>Seau \(x1\.10\)<\/option>/,
  );
});

test("prevents negative values in timeline override number inputs", () => {
  const markup = renderToStaticMarkup(
    createElement(TimelineOverrideEditor, {
      segment: {
        ...timelinePageProps.timelineData[0]!,
        lune: {
          ...timelinePageProps.timelineData[0]!.lune,
          overrides: {
            1: {
              pv: 5,
              capNrt: 6,
              capEau: 7,
              capMed: 1,
            },
          },
        },
      },
      actualLuneIndex: 0,
      persoId: 1,
      persoName: "Présent",
      setOverride: () => undefined,
      clearOverrides: () => undefined,
    }),
  );

  const inputMatches = markup.match(/type="number"[^>]*min="0"/g) ?? [];

  assert.equal(inputMatches.length, 4);
  assert.match(markup, /step="0\.05"[^>]*value="5"/);
  assert.match(markup, /step="0\.05"[^>]*value="6"/);
  assert.match(markup, /step="0\.01"[^>]*value="7"/);
  assert.match(markup, /step="0\.1"[^>]*value="1"/);
});
