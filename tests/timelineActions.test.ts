import assert from "node:assert/strict";
import test from "node:test";

import { useTimelineActions } from "../src/hooks/useTimelineActions";
import type { Lune } from "../src/types";
import { createState } from "./testUtils";

test("setOverride clamps numeric timeline overrides to non-negative values", () => {
  const lunesState = createState<Lune[]>([
    {
      id: 1,
      meteo: { eau: 1, nrt: 1, med: 1, mat: 1 },
      rations: {},
      overrides: {},
      constructionPlacements: [],
      constructions: [],
    },
  ]);
  const savedLunes: Lune[] = [];

  const actions = useTimelineActions({
    persos: [{ id: 1, nom: "Alya" }],
    constructions: [],
    lunes: lunesState.get(),
    currentLune: 1,
    setConstructions: () => undefined,
    setLunes: lunesState.set,
    setOpenOverrides: () => undefined,
    saveLuneEntity: (lune) => savedLunes.push(lune),
    deleteLuneEntity: () => undefined,
    saveConstructionsEntity: () => undefined,
  });

  actions.setOverride(0, 1, "capEau", -2);

  assert.equal(lunesState.get()[0]?.overrides?.[1]?.capEau, 0);
  assert.equal(savedLunes[0]?.overrides?.[1]?.capEau, 0);
});
