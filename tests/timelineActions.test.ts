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

test("addLune enables auto assignment by default for the next lune", () => {
  const lunesState = createState<Lune[]>([
    {
      id: 1,
      meteo: { eau: 1, nrt: 1, med: 1, mat: 1 },
      rations: {},
      overrides: {},
      constructionPlacements: [],
      constructions: [],
      toolAssignments: {},
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

  actions.addLune();

  const createdLune = lunesState.get()[1] as
    | (Lune & { autoAssign?: boolean })
    | undefined;
  const savedLune = savedLunes[0] as
    | (Lune & { autoAssign?: boolean })
    | undefined;

  assert.equal(createdLune?.id, 2);
  assert.equal(createdLune?.autoAssign, true);
  assert.equal(savedLune?.autoAssign, true);
});
