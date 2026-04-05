import assert from "node:assert/strict";
import test from "node:test";

import { useInventoryActions } from "../src/hooks/useInventoryActions";
import type {
  Arme,
  Outil,
  Perso,
  PersoArme,
  PersoOutil,
  PersoSac,
  Sac,
} from "../src/types";
import { createState, withAlertStub } from "./testUtils";

const createInventoryActions = ({
  armes = [],
  persos = [],
  persoArmes = [],
  outils = [],
  persoOutils = [],
  sacs = [],
  persoSacs = [],
}: {
  armes?: Arme[];
  persos?: Perso[];
  persoArmes?: PersoArme[];
  outils?: Outil[];
  persoOutils?: PersoOutil[];
  sacs?: Sac[];
  persoSacs?: PersoSac[];
}) => {
  const armesState = createState(armes);
  const persosState = createState(persos);
  const persoArmesState = createState(persoArmes);
  const outilsState = createState(outils);
  const persoOutilsState = createState(persoOutils);
  const sacsState = createState(sacs);
  const persoSacsState = createState(persoSacs);

  const deletedArmes: number[] = [];
  const savedPersoArmes: PersoArme[][] = [];

  const actions = useInventoryActions({
    armes: armesState.get(),
    setArmes: armesState.set,
    persoArmes: persoArmesState.get(),
    setPersoArmes: persoArmesState.set,
    outils: outilsState.get(),
    setOutils: outilsState.set,
    persoOutils: persoOutilsState.get(),
    setPersoOutils: persoOutilsState.set,
    sacs: sacsState.get(),
    setSacs: sacsState.set,
    persoSacs: persoSacsState.get(),
    setPersoSacs: persoSacsState.set,
    setPersos: persosState.set,
    saveArmeEntity: () => undefined,
    deleteArmeEntity: (armeId) => deletedArmes.push(armeId),
    savePersoArmesEntity: (_persoId, nextPersoArmes) =>
      savedPersoArmes.push(nextPersoArmes),
    saveOutilEntity: () => undefined,
    deleteOutilEntity: () => undefined,
    savePersoOutilsEntity: () => undefined,
    saveSacEntity: () => undefined,
    deleteSacEntity: () => undefined,
    savePersoSacsEntity: () => undefined,
  });

  return {
    actions,
    armesState,
    persosState,
    persoArmesState,
    outilsState,
    persoOutilsState,
    sacsState,
    persoSacsState,
    deletedArmes,
    savedPersoArmes,
  };
};

test("handlePersoWeaponsUpdate blocks assigning a weapon beyond available quantity", () => {
  withAlertStub((alerts) => {
    const initialEntries: PersoArme[] = [
      { perso_id: 2, arme_id: 7, equipee: true },
    ];
    const { actions, persoArmesState, savedPersoArmes } =
      createInventoryActions({
        armes: [{ id: 7, name: "Pistolet", quantity: 1, att: 2 }],
        persos: [
          { id: 1, nom: "Ava", combat: 4, combatEffectif: 4 },
          { id: 2, nom: "Boris", combat: 4, combatEffectif: 8 },
        ],
        persoArmes: initialEntries,
      });

    actions.handlePersoWeaponsUpdate(1, [7], 7);

    assert.deepEqual(persoArmesState.get(), initialEntries);
    assert.deepEqual(savedPersoArmes, []);
    assert.match(alerts[0] ?? "", /n'est plus disponible/i);
  });
});

test("removeArme clears carried assignments and resets the equipped combat bonus", () => {
  const { actions, armesState, persosState, persoArmesState, deletedArmes } =
    createInventoryActions({
      armes: [{ id: 7, name: "Pistolet", quantity: 1, att: 2 }],
      persos: [
        {
          id: 1,
          nom: "Ava",
          combat: 4,
          combatEffectif: 8,
          equippedWeaponId: 7,
        },
      ],
      persoArmes: [{ perso_id: 1, arme_id: 7, equipee: true }],
    });

  actions.removeArme(0);

  assert.deepEqual(armesState.get(), []);
  assert.deepEqual(persoArmesState.get(), []);
  assert.equal(persosState.get()[0]?.equippedWeaponId ?? null, null);
  assert.equal(persosState.get()[0]?.combatEffectif, 4);
  assert.deepEqual(deletedArmes, [7]);
});

test("handlePersoToolsUpdate blocks assigning a tool beyond available quantity", () => {
  withAlertStub((alerts) => {
    const initialEntries: PersoOutil[] = [{ perso_id: 2, outil_id: 3 }];
    const { actions, persoOutilsState } = createInventoryActions({
      outils: [{ id: 3, name: "Trousse", quantity: 1, bonus: 1 }],
      persoOutils: initialEntries,
    });

    actions.handlePersoToolsUpdate(1, [3]);

    assert.deepEqual(persoOutilsState.get(), initialEntries);
    assert.match(alerts[0] ?? "", /n'est plus disponible/i);
  });
});

test("removeSac clears carried assignments and resets the equipped bag bonus", () => {
  const { actions, sacsState, persosState, persoSacsState } =
    createInventoryActions({
      sacs: [{ id: 5, name: "Grand sac", quantity: 1, capacite: 12 }],
      persos: [
        {
          id: 1,
          nom: "Ava",
          poidsMax: 20,
          poidsMaxEffectif: 32,
          equippedBagId: 5,
        },
      ],
      persoSacs: [{ perso_id: 1, sac_id: 5, equipe: true }],
    });

  actions.removeSac(0);

  assert.deepEqual(sacsState.get(), []);
  assert.deepEqual(persoSacsState.get(), []);
  assert.equal(persosState.get()[0]?.equippedBagId ?? null, null);
  assert.equal(persosState.get()[0]?.poidsMaxEffectif, 20);
});
