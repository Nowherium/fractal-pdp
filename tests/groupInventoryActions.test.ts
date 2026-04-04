import assert from "node:assert/strict";
import test from "node:test";

import { useGroupActions } from "../src/hooks/useGroupActions";
import { useInventoryActions } from "../src/hooks/useInventoryActions";
import { usePersoActions } from "../src/hooks/usePersoActions";
import type {
  AppPage,
  Arme,
  Group,
  Lune,
  Outil,
  Perso,
  PersoArme,
  PersoResource,
  PersoOutil,
  PersoSac,
  Sac,
} from "../src/types";

type StateController<T> = {
  get: () => T;
  set: (update: T | ((previous: T) => T)) => void;
};

const createState = <T>(initialValue: T): StateController<T> => {
  let currentValue = initialValue;

  return {
    get: () => currentValue,
    set: (update) => {
      currentValue =
        typeof update === "function"
          ? (update as (previous: T) => T)(currentValue)
          : update;
    },
  };
};

const withAlertStub = (callback: (alerts: string[]) => void) => {
  const alerts: string[] = [];
  const previousWindow = globalThis.window;

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      ...(previousWindow ?? {}),
      alert: (message: unknown) => alerts.push(String(message ?? "")),
    },
    writable: true,
  });

  try {
    callback(alerts);
  } finally {
    if (previousWindow === undefined) {
      Reflect.deleteProperty(globalThis, "window");
    } else {
      Object.defineProperty(globalThis, "window", {
        configurable: true,
        value: previousWindow,
        writable: true,
      });
    }
  }
};

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
    deletedArmes,
    savedPersoArmes,
  };
};

test("addPerso creates an unassigned personnage by default", () => {
  const persosState = createState<Perso[]>([]);
  const groupsState = createState<Group[]>([
    { id: 1, name: "Alpha", chef: null },
  ]);
  const persoResourcesState = createState<PersoResource[]>([]);
  const lunesState = createState<Lune[]>([]);
  const pageState = createState<AppPage>("effectif");
  const selectedPersoIdState = createState<number | null>(null);
  const openOverridesState = createState<Record<string, boolean>>({});
  const nextPersoIdState = createState(1);
  const savedPersos: Perso[] = [];

  const actions = usePersoActions({
    persos: persosState.get(),
    groups: groupsState.get(),
    resources: [],
    sacs: [],
    persoResources: persoResourcesState.get(),
    lunes: lunesState.get(),
    nextPersoId: nextPersoIdState.get(),
    setPersos: persosState.set,
    setGroups: groupsState.set,
    setPersoResources: persoResourcesState.set,
    setLunes: lunesState.set,
    setPage: pageState.set,
    setSelectedPersoId: selectedPersoIdState.set,
    setOpenOverrides: openOverridesState.set,
    setNextPersoId: nextPersoIdState.set,
    savePersoEntity: (perso) => savedPersos.push(perso),
    deletePersoEntity: () => undefined,
    savePersoResourcesEntity: () => undefined,
    saveLuneEntity: () => undefined,
  });

  actions.addPerso();

  assert.equal(persosState.get()[0]?.groupId ?? null, null);
  assert.equal(savedPersos[0]?.groupId ?? null, null);
  assert.equal(pageState.get(), "perso");
  assert.equal(selectedPersoIdState.get(), 1);
});

test("removeGroup deletes only the group and unassigns its members", () => {
  const groupsState = createState<Group[]>([
    { id: 1, name: "Alpha", chef: 1 },
    { id: 2, name: "Bravo", chef: 3 },
  ]);
  const persosState = createState<Perso[]>([
    { id: 1, nom: "Ava", groupId: 1 },
    { id: 2, nom: "Boris", groupId: 1 },
    { id: 3, nom: "Cleo", groupId: 2 },
    { id: 4, nom: "Dune", groupId: null },
  ]);
  const selectedGroupIdState = createState<number | null>(1);
  const pageState = createState<AppPage>("group-view");
  const savedPersos: number[] = [];
  const deletedGroups: number[] = [];

  const actions = useGroupActions({
    groups: groupsState.get(),
    persos: persosState.get(),
    setGroups: groupsState.set,
    setPersos: persosState.set,
    setSelectedGroupId: selectedGroupIdState.set,
    setPage: pageState.set,
    saveGroupEntity: () => undefined,
    deleteGroupEntity: (groupId) => deletedGroups.push(groupId),
    saveGroupMembersEntity: () => undefined,
    savePersoEntity: (perso) => savedPersos.push(perso.id),
  });

  actions.removeGroup(1);

  assert.deepEqual(
    groupsState.get().map((group) => group.id),
    [2],
  );
  assert.deepEqual(
    persosState.get().map((perso) => ({
      id: perso.id,
      groupId: perso.groupId ?? null,
    })),
    [
      { id: 1, groupId: null },
      { id: 2, groupId: null },
      { id: 3, groupId: 2 },
      { id: 4, groupId: null },
    ],
  );
  assert.equal(selectedGroupIdState.get(), null);
  assert.equal(pageState.get(), "groupes");
  assert.deepEqual(
    savedPersos.sort((left, right) => left - right),
    [1, 2],
  );
  assert.deepEqual(deletedGroups, [1]);
});

test("handleGroupMembersUpdate reassigns members and clears an invalid chef", () => {
  const groupsState = createState<Group[]>([{ id: 1, name: "Alpha", chef: 1 }]);
  const persosState = createState<Perso[]>([
    { id: 1, nom: "Ava", groupId: 1, cmd: 3 },
    { id: 2, nom: "Boris", groupId: 1, cmd: 1 },
    { id: 3, nom: "Cleo", groupId: null, cmd: 1 },
  ]);
  const savedMemberUpdates: Array<{ groupId: number; memberIds: number[] }> =
    [];

  const actions = useGroupActions({
    groups: groupsState.get(),
    persos: persosState.get(),
    setGroups: groupsState.set,
    setPersos: persosState.set,
    setSelectedGroupId: () => undefined,
    setPage: () => undefined,
    saveGroupEntity: () => undefined,
    deleteGroupEntity: () => undefined,
    saveGroupMembersEntity: (groupId, memberIds) =>
      savedMemberUpdates.push({ groupId, memberIds }),
    savePersoEntity: () => undefined,
  });

  actions.handleGroupMembersUpdate(1, [2, 3]);

  assert.deepEqual(
    persosState.get().map((perso) => ({
      id: perso.id,
      groupId: perso.groupId ?? null,
    })),
    [
      { id: 1, groupId: null },
      { id: 2, groupId: 1 },
      { id: 3, groupId: 1 },
    ],
  );
  assert.equal(groupsState.get()[0]?.chef, null);
  assert.deepEqual(savedMemberUpdates, [{ groupId: 1, memberIds: [2, 3] }]);
});

test("handleGroupMembersUpdate allows a second esclave for a chef with less than 1 CMD", () => {
  withAlertStub((alerts) => {
    const groupsState = createState<Group[]>([
      { id: 1, name: "Alpha", chef: 1 },
    ]);
    const persosState = createState<Perso[]>([
      { id: 1, nom: "Ava", groupId: 1, cmd: 0 },
      { id: 2, nom: "Boris", groupId: null, cmd: 0, esclave: true },
    ]);
    const savedMemberUpdates: Array<{ groupId: number; memberIds: number[] }> =
      [];

    const actions = useGroupActions({
      groups: groupsState.get(),
      persos: persosState.get(),
      setGroups: groupsState.set,
      setPersos: persosState.set,
      setSelectedGroupId: () => undefined,
      setPage: () => undefined,
      saveGroupEntity: () => undefined,
      deleteGroupEntity: () => undefined,
      saveGroupMembersEntity: (groupId, memberIds) =>
        savedMemberUpdates.push({ groupId, memberIds }),
      savePersoEntity: () => undefined,
    });

    actions.handleGroupMembersUpdate(1, [1, 2]);

    assert.equal(alerts.length, 0);
    assert.deepEqual(
      persosState.get().map((perso) => ({
        id: perso.id,
        groupId: perso.groupId ?? null,
      })),
      [
        { id: 1, groupId: 1 },
        { id: 2, groupId: 1 },
      ],
    );
    assert.deepEqual(savedMemberUpdates, [{ groupId: 1, memberIds: [1, 2] }]);
  });
});

test("handleGroupMembersUpdate blocks a second non-esclave for a chef with less than 1 CMD", () => {
  withAlertStub((alerts) => {
    const initialGroups: Group[] = [{ id: 1, name: "Alpha", chef: 1 }];
    const initialPersos: Perso[] = [
      { id: 1, nom: "Ava", groupId: 1, cmd: 0 },
      { id: 2, nom: "Boris", groupId: null, cmd: 0, esclave: false },
    ];

    const groupsState = createState(initialGroups);
    const persosState = createState(initialPersos);
    let saveCalls = 0;

    const actions = useGroupActions({
      groups: groupsState.get(),
      persos: persosState.get(),
      setGroups: groupsState.set,
      setPersos: persosState.set,
      setSelectedGroupId: () => undefined,
      setPage: () => undefined,
      saveGroupEntity: () => undefined,
      deleteGroupEntity: () => undefined,
      saveGroupMembersEntity: () => {
        saveCalls += 1;
      },
      savePersoEntity: () => undefined,
    });

    actions.handleGroupMembersUpdate(1, [1, 2]);

    assert.equal(saveCalls, 0);
    assert.deepEqual(groupsState.get(), initialGroups);
    assert.deepEqual(persosState.get(), initialPersos);
    assert.match(alerts[0] ?? "", /dépasse la capacité de commandement/i);
  });
});

test("handleGroupMembersUpdate blocks assignments that exceed leader capacity", () => {
  withAlertStub((alerts) => {
    const initialGroups: Group[] = [{ id: 1, name: "Alpha", chef: 1 }];
    const initialPersos: Perso[] = [
      { id: 1, nom: "Ava", groupId: 1, cmd: 1 },
      { id: 2, nom: "Boris", groupId: null, cmd: 0 },
      { id: 3, nom: "Cleo", groupId: null, cmd: 0 },
    ];

    const groupsState = createState(initialGroups);
    const persosState = createState(initialPersos);
    let saveCalls = 0;

    const actions = useGroupActions({
      groups: groupsState.get(),
      persos: persosState.get(),
      setGroups: groupsState.set,
      setPersos: persosState.set,
      setSelectedGroupId: () => undefined,
      setPage: () => undefined,
      saveGroupEntity: () => undefined,
      deleteGroupEntity: () => undefined,
      saveGroupMembersEntity: () => {
        saveCalls += 1;
      },
      savePersoEntity: () => undefined,
    });

    actions.handleGroupMembersUpdate(1, [1, 2, 3]);

    assert.equal(saveCalls, 0);
    assert.deepEqual(groupsState.get(), initialGroups);
    assert.deepEqual(persosState.get(), initialPersos);
    assert.match(alerts[0] ?? "", /dépasse la capacité de commandement/i);
  });
});

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
