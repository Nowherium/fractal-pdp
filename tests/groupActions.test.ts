import assert from "node:assert/strict";
import test from "node:test";

import { useGroupActions } from "../src/hooks/useGroupActions";
import { calculateGroupTotals } from "../src/utils/groupUtils";
import type { AppPage, Group, Perso } from "../src/types";
import { createState, withAlertStub } from "./testUtils";

test("calculateGroupTotals ignores cadavre production and combat", () => {
  const totals = calculateGroupTotals([
    {
      id: 1,
      nom: "Cadavre",
      pv: 0,
      capEau: 5,
      capNrt: 4,
      combat: 3,
      poidsTotal: 2,
    },
    {
      id: 2,
      nom: "Vivant",
      pv: 5,
      capEau: 1,
      capNrt: 2,
      combat: 2,
      poidsTotal: 1,
    },
  ] as Perso[]);

  assert.equal(totals.eau, 1);
  assert.equal(totals.nrt, 2);
  assert.equal(totals.combat, 2);
  assert.equal(totals.poids, 3);
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

test("handleGroupUpdateSafe falls back to the first member as chef", () => {
  const groupsState = createState<Group[]>([
    { id: 1, name: "Alpha", chef: null },
  ]);
  const persosState = createState<Perso[]>([
    { id: 1, nom: "Ava", groupId: 1, cmd: 2 },
    { id: 2, nom: "Boris", groupId: 1, cmd: 0 },
  ]);
  const savedGroups: Group[] = [];

  const actions = useGroupActions({
    groups: groupsState.get(),
    persos: persosState.get(),
    setGroups: groupsState.set,
    setPersos: persosState.set,
    setSelectedGroupId: () => undefined,
    setPage: () => undefined,
    saveGroupEntity: (group) => savedGroups.push(group),
    deleteGroupEntity: () => undefined,
    saveGroupMembersEntity: () => undefined,
    savePersoEntity: () => undefined,
  });

  actions.handleGroupUpdateSafe(1, "chef", null);

  assert.equal(groupsState.get()[0]?.chef, 1);
  assert.equal(savedGroups[0]?.chef, 1);
});

test("setGroupPresence updates only changed group members", () => {
  const groupsState = createState<Group[]>([{ id: 1, name: "Alpha", chef: 1 }]);
  const persosState = createState<Perso[]>([
    { id: 1, nom: "Ava", groupId: 1, present: true },
    { id: 2, nom: "Boris", groupId: 1, present: false },
    { id: 3, nom: "Cleo", groupId: null, present: true },
  ]);
  const savedPersos: number[] = [];

  const actions = useGroupActions({
    groups: groupsState.get(),
    persos: persosState.get(),
    setGroups: groupsState.set,
    setPersos: persosState.set,
    setSelectedGroupId: () => undefined,
    setPage: () => undefined,
    saveGroupEntity: () => undefined,
    deleteGroupEntity: () => undefined,
    saveGroupMembersEntity: () => undefined,
    savePersoEntity: (perso) => savedPersos.push(perso.id),
  });

  actions.setGroupPresence(1, false);

  assert.deepEqual(
    persosState.get().map((perso) => ({
      id: perso.id,
      present: perso.present ?? true,
    })),
    [
      { id: 1, present: false },
      { id: 2, present: false },
      { id: 3, present: true },
    ],
  );
  assert.deepEqual(savedPersos, [1]);
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
