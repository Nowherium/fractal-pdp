import test from "node:test";
import assert from "node:assert/strict";

import { buildLunes } from "../server/db/shared";

test("buildLunes preserves the dehors and produit flags from persisted rations", () => {
  const lunes = buildLunes(
    [
      {
        id: 1,
        meteo_eau: 1,
        meteo_nrt: 1,
        meteo_med: 1,
        meteo_mat: 1,
        constructions: [],
        auto_assign: true,
        tool_assignments: {},
      },
    ],
    [
      {
        lune_id: 1,
        perso_id: 42,
        eau: true,
        nrt: true,
        med: false,
        dehors: true,
        produit: true,
        tache: "eau",
        drogue: null,
        construction_id: null,
      },
    ],
    [],
  );

  assert.equal(lunes[0]?.rations[42]?.dehors, true);
  assert.equal(lunes[0]?.rations[42]?.produit, true);
});
