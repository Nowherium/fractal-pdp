import assert from "node:assert/strict";
import test from "node:test";

import {
  createDefaultArme,
  createDefaultConstruction,
  createDefaultOutil,
  createDefaultPerso,
  createDefaultSac,
} from "../src/utils/entityDefaults";

test("default entity factories provide coherent defaults", () => {
  const perso = createDefaultPerso(7);
  const arme = createDefaultArme(3);
  const outil = createDefaultOutil(4);
  const sac = createDefaultSac(5);
  const chantier = createDefaultConstruction(6);

  assert.equal(perso.id, 7);
  assert.match(perso.nom, /.+/);
  assert.equal(perso.present, true);
  assert.equal(perso.groupId ?? null, null);
  assert.equal(perso.esclave, false);
  assert.equal(perso.equippedWeaponId ?? null, null);
  assert.equal(perso.equippedBagId ?? null, null);
  assert.equal(perso.pv, perso.pvmax);
  assert.equal(perso.poidsTotal, 0);

  assert.equal(arme.id, 3);
  assert.match(arme.name, /.+/);
  assert.ok(Number(arme.quantity ?? 0) >= 1);
  assert.ok(Number(arme.att ?? 0) >= 1);
  assert.ok(Number(arme.degats ?? 0) >= 0);

  assert.equal(outil.id, 4);
  assert.match(outil.name, /.+/);
  assert.ok(["eau", "nrt", "mat", "art"].includes(outil.specialite ?? ""));
  assert.ok(Number(outil.bonus ?? 0) >= 1);
  assert.ok(Number(outil.quantity ?? 0) >= 1);

  assert.equal(sac.id, 5);
  assert.match(sac.name, /.+/);
  assert.ok(Number(sac.capacite ?? 0) >= 0);
  assert.ok(Number(sac.quantity ?? 0) >= 1);
  assert.equal(sac.pv, sac.pvmax);

  assert.deepEqual(
    {
      id: chantier.id,
      name: chantier.name,
      resourceCode: chantier.resourceCode,
      rewardType: chantier.rewardType,
      status: chantier.status,
      remainingBuilders: chantier.remainingBuilders,
      buildersRequired: chantier.buildersRequired,
    },
    {
      id: "construction-6",
      name: "Chantier 6",
      resourceCode: "mat",
      rewardType: "mat",
      status: "todo",
      remainingBuilders: chantier.buildersRequired,
      buildersRequired: chantier.buildersRequired,
    },
  );
  assert.ok(Number(chantier.resourceCost ?? 0) >= 0);
  assert.ok(Number(chantier.buildersRequired ?? 0) >= 1);
});
