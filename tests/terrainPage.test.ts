import assert from "node:assert/strict";
import test from "node:test";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import ReservePage from "../src/components/ReservePage";
import type { Terrain } from "../src/types";
import { combineCityAndTerrainMultipliers } from "../src/utils/terrainUtils";

const terrains = [
  {
    id: 1,
    name: "Marais",
    nrt: 1.2,
    eau: 1.1,
    med: 0.9,
    mat: 0.8,
  },
] satisfies Terrain[];

test("renders the current terrain select on the Ville page", () => {
  const markup = renderToStaticMarkup(
    createElement(ReservePage, {
      resources: [],
      stocks: {},
      terrains,
      currentTerrainId: 1,
      cityMultipliers: { eau: 1, nrt: 1, med: 1, mat: 1 },
      handleStockChange: () => undefined,
      handleCityMultiplierChange: () => undefined,
      handleCurrentTerrainChange: () => undefined,
      armes: [],
      persoArmes: [],
      outils: [],
      persoOutils: [],
      sacs: [],
      persoSacs: [],
    }),
  );

  assert.match(markup, /Terrain actuel/i);
  assert.match(markup, /Marais/);
  assert.match(markup, /Bonus bâtiments/i);
});

test("combines terrain bonuses with building multipliers", () => {
  assert.deepEqual(
    combineCityAndTerrainMultipliers(
      { eau: 1.1, nrt: 1, med: 0.9, mat: 1.2 },
      terrains[0],
    ),
    {
      eau: 1.21,
      nrt: 1.2,
      med: 0.81,
      mat: 0.96,
    },
  );
});
