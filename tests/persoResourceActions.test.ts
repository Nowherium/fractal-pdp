import assert from "node:assert/strict";
import test from "node:test";

import { usePersoActions } from "../src/hooks/usePersoActions";
import { useResourceActions } from "../src/hooks/useResourceActions";
import type {
  AppPage,
  Group,
  Lune,
  LuneConstruction,
  Perso,
  PersoResource,
  Resource,
} from "../src/types";
import { createState, withAlertStub, withWindowStub } from "./testUtils";

const createResourceActions = ({
  resources = [],
  stocks = {},
  persoResources = [],
  constructions = [],
  lunes = [],
}: {
  resources?: Resource[];
  stocks?: Record<string, number>;
  persoResources?: PersoResource[];
  constructions?: LuneConstruction[];
  lunes?: Lune[];
}) => {
  const resourcesState = createState(resources);
  const stocksState = createState(stocks);
  const savedResources: Resource[] = [];
  const deletedResources: number[] = [];

  const actions = useResourceActions({
    resources: resourcesState.get(),
    stocks: stocksState.get(),
    persoResources,
    constructions,
    lunes,
    setResources: resourcesState.set,
    setStocks: stocksState.set,
    saveResourceEntity: (resource) => savedResources.push(resource),
    deleteResourceEntity: (resourceId) => deletedResources.push(resourceId),
  });

  return {
    actions,
    resourcesState,
    stocksState,
    savedResources,
    deletedResources,
  };
};

test("addPerso creates an unassigned personnage by default", () => {
  const persosState = createState<Perso[]>([]);
  const groupsState = createState<Group[]>([
    { id: 1, name: "Alpha", chef: null },
  ]);
  const stocksState = createState<Record<string, number>>({});
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
    stocks: stocksState.get(),
    exchangeCityStocksWithPersos: false,
    persoResources: persoResourcesState.get(),
    lunes: lunesState.get(),
    nextPersoId: nextPersoIdState.get(),
    setPersos: persosState.set,
    setGroups: groupsState.set,
    setPersoResources: persoResourcesState.set,
    setStocks: stocksState.set,
    setLunes: lunesState.set,
    setPage: pageState.set,
    setSelectedPersoId: selectedPersoIdState.set,
    setOpenOverrides: openOverridesState.set,
    setNextPersoId: nextPersoIdState.set,
    savePersoEntity: (perso) => savedPersos.push(perso),
    deletePersoEntity: () => undefined,
    savePersoResourcesEntity: () => undefined,
    saveStockEntity: () => undefined,
    saveLuneEntity: () => undefined,
  });

  actions.addPerso();

  assert.equal(persosState.get()[0]?.groupId ?? null, null);
  assert.equal(savedPersos[0]?.groupId ?? null, null);
  assert.equal(pageState.get(), "perso");
  assert.equal(selectedPersoIdState.get(), 1);
});

test("handlePersoUpdateById rounds production capacities to two decimals", () => {
  const persosState = createState<Perso[]>([
    { id: 1, nom: "Alya", capEau: 1, capEauEffectif: 1 },
  ]);
  const groupsState = createState<Group[]>([]);
  const stocksState = createState<Record<string, number>>({});
  const persoResourcesState = createState<PersoResource[]>([]);
  const savedPersos: Perso[] = [];

  const actions = usePersoActions({
    persos: persosState.get(),
    groups: groupsState.get(),
    resources: [],
    sacs: [],
    stocks: stocksState.get(),
    exchangeCityStocksWithPersos: false,
    persoResources: persoResourcesState.get(),
    lunes: [],
    nextPersoId: 2,
    setPersos: persosState.set,
    setGroups: groupsState.set,
    setPersoResources: persoResourcesState.set,
    setStocks: stocksState.set,
    setLunes: () => undefined,
    setPage: () => undefined,
    setSelectedPersoId: () => undefined,
    setOpenOverrides: () => undefined,
    setNextPersoId: () => undefined,
    savePersoEntity: (perso) => savedPersos.push(perso),
    deletePersoEntity: () => undefined,
    savePersoResourcesEntity: () => undefined,
    saveStockEntity: () => undefined,
    saveLuneEntity: () => undefined,
  });

  actions.handlePersoUpdateById(1, "capEau", 2.256);

  assert.equal(persosState.get()[0]?.capEau, 2.26);
  assert.equal(savedPersos[0]?.capEau, 2.26);
});

test("handlePersoUpdateById keeps the equipped bag bonus when poidsMax changes", () => {
  const persosState = createState<Perso[]>([
    {
      id: 1,
      nom: "Alya",
      poidsMax: 20,
      poidsMaxEffectif: 26,
      equippedBagId: 5,
    },
  ]);
  const groupsState = createState<Group[]>([]);
  const stocksState = createState<Record<string, number>>({});
  const persoResourcesState = createState<PersoResource[]>([]);

  const actions = usePersoActions({
    persos: persosState.get(),
    groups: groupsState.get(),
    resources: [],
    sacs: [{ id: 5, name: "Grand sac", capacite: 6 }],
    stocks: stocksState.get(),
    exchangeCityStocksWithPersos: false,
    persoResources: persoResourcesState.get(),
    lunes: [],
    nextPersoId: 2,
    setPersos: persosState.set,
    setGroups: groupsState.set,
    setPersoResources: persoResourcesState.set,
    setStocks: stocksState.set,
    setLunes: () => undefined,
    setPage: () => undefined,
    setSelectedPersoId: () => undefined,
    setOpenOverrides: () => undefined,
    setNextPersoId: () => undefined,
    savePersoEntity: () => undefined,
    deletePersoEntity: () => undefined,
    savePersoResourcesEntity: () => undefined,
    saveStockEntity: () => undefined,
    saveLuneEntity: () => undefined,
  });

  actions.handlePersoUpdateById(1, "poidsMax", 12);

  assert.equal(persosState.get()[0]?.poidsMax, 12);
  assert.equal(persosState.get()[0]?.poidsMaxEffectif, 18);
});

test("handlePersoResourceUpdate leaves city stock unchanged when exchange mode is disabled", () => {
  const persosState = createState<Perso[]>([{ id: 1, nom: "Alya" }]);
  const groupsState = createState<Group[]>([]);
  const stocksState = createState<Record<string, number>>({ eau: 5 });
  const persoResourcesState = createState<PersoResource[]>([
    { perso_id: 1, resource_id: 1, quantity: 2 },
  ]);
  const savedStockUpdates: Array<{ code: string; quantity: number }> = [];
  const savedPersoResourceUpdates: PersoResource[][] = [];

  const actions = usePersoActions({
    persos: persosState.get(),
    groups: groupsState.get(),
    resources: [{ id: 1, code: "eau", name: "Eau" }],
    sacs: [],
    stocks: stocksState.get(),
    exchangeCityStocksWithPersos: false,
    persoResources: persoResourcesState.get(),
    lunes: [],
    nextPersoId: 2,
    setPersos: persosState.set,
    setGroups: groupsState.set,
    setPersoResources: persoResourcesState.set,
    setStocks: stocksState.set,
    setLunes: () => undefined,
    setPage: () => undefined,
    setSelectedPersoId: () => undefined,
    setOpenOverrides: () => undefined,
    setNextPersoId: () => undefined,
    savePersoEntity: () => undefined,
    deletePersoEntity: () => undefined,
    savePersoResourcesEntity: (_persoId, nextPersoResources) =>
      savedPersoResourceUpdates.push(nextPersoResources),
    saveStockEntity: (code, quantity) =>
      savedStockUpdates.push({ code, quantity }),
    saveLuneEntity: () => undefined,
  });

  actions.handlePersoResourceUpdate(1, 1, 4);

  assert.equal(persoResourcesState.get()[0]?.quantity, 4);
  assert.equal(stocksState.get()["eau"], 5);
  assert.deepEqual(savedStockUpdates, []);
  assert.equal(savedPersoResourceUpdates[0]?.[0]?.quantity, 4);
});

test("handlePersoResourceUpdate rounds exchanged stock quantities to one decimal", () => {
  const persosState = createState<Perso[]>([{ id: 1, nom: "Alya" }]);
  const groupsState = createState<Group[]>([]);
  const stocksState = createState<Record<string, number>>({ eau: 5 });
  const persoResourcesState = createState<PersoResource[]>([
    { perso_id: 1, resource_id: 1, quantity: 2 },
  ]);

  const actions = usePersoActions({
    persos: persosState.get(),
    groups: groupsState.get(),
    resources: [{ id: 1, code: "eau", name: "Eau" }],
    sacs: [],
    stocks: stocksState.get(),
    exchangeCityStocksWithPersos: true,
    persoResources: persoResourcesState.get(),
    lunes: [],
    nextPersoId: 2,
    setPersos: persosState.set,
    setGroups: groupsState.set,
    setPersoResources: persoResourcesState.set,
    setStocks: stocksState.set,
    setLunes: () => undefined,
    setPage: () => undefined,
    setSelectedPersoId: () => undefined,
    setOpenOverrides: () => undefined,
    setNextPersoId: () => undefined,
    savePersoEntity: () => undefined,
    deletePersoEntity: () => undefined,
    savePersoResourcesEntity: () => undefined,
    saveStockEntity: () => undefined,
    saveLuneEntity: () => undefined,
  });

  actions.handlePersoResourceUpdate(1, 1, 4.26);

  assert.equal(persoResourcesState.get()[0]?.quantity, 4.3);
  assert.equal(stocksState.get()["eau"], 2.7);
});

test("handlePersoResourceUpdate transfers stock between the city and the perso when exchange mode is enabled", () => {
  const persosState = createState<Perso[]>([{ id: 1, nom: "Alya" }]);
  const groupsState = createState<Group[]>([]);
  const stocksState = createState<Record<string, number>>({ eau: 5 });
  const persoResourcesState = createState<PersoResource[]>([
    { perso_id: 1, resource_id: 1, quantity: 2 },
  ]);
  const savedStockUpdates: Array<{ code: string; quantity: number }> = [];

  const actions = usePersoActions({
    persos: persosState.get(),
    groups: groupsState.get(),
    resources: [{ id: 1, code: "eau", name: "Eau" }],
    sacs: [],
    stocks: stocksState.get(),
    exchangeCityStocksWithPersos: true,
    persoResources: persoResourcesState.get(),
    lunes: [],
    nextPersoId: 2,
    setPersos: persosState.set,
    setGroups: groupsState.set,
    setPersoResources: persoResourcesState.set,
    setStocks: stocksState.set,
    setLunes: () => undefined,
    setPage: () => undefined,
    setSelectedPersoId: () => undefined,
    setOpenOverrides: () => undefined,
    setNextPersoId: () => undefined,
    savePersoEntity: () => undefined,
    deletePersoEntity: () => undefined,
    savePersoResourcesEntity: () => undefined,
    saveStockEntity: (code, quantity) =>
      savedStockUpdates.push({ code, quantity }),
    saveLuneEntity: () => undefined,
  });

  actions.handlePersoResourceUpdate(1, 1, 4);
  assert.equal(persoResourcesState.get()[0]?.quantity, 4);
  assert.equal(stocksState.get()["eau"], 3);

  const releaseActions = usePersoActions({
    persos: persosState.get(),
    groups: groupsState.get(),
    resources: [{ id: 1, code: "eau", name: "Eau" }],
    sacs: [],
    stocks: stocksState.get(),
    exchangeCityStocksWithPersos: true,
    persoResources: persoResourcesState.get(),
    lunes: [],
    nextPersoId: 2,
    setPersos: persosState.set,
    setGroups: groupsState.set,
    setPersoResources: persoResourcesState.set,
    setStocks: stocksState.set,
    setLunes: () => undefined,
    setPage: () => undefined,
    setSelectedPersoId: () => undefined,
    setOpenOverrides: () => undefined,
    setNextPersoId: () => undefined,
    savePersoEntity: () => undefined,
    deletePersoEntity: () => undefined,
    savePersoResourcesEntity: () => undefined,
    saveStockEntity: (code, quantity) =>
      savedStockUpdates.push({ code, quantity }),
    saveLuneEntity: () => undefined,
  });

  releaseActions.handlePersoResourceUpdate(1, 1, 1);

  assert.equal(persoResourcesState.get()[0]?.quantity, 1);
  assert.equal(stocksState.get()["eau"], 6);
  assert.deepEqual(savedStockUpdates, [
    { code: "eau", quantity: 3 },
    { code: "eau", quantity: 6 },
  ]);
});

test("removePerso clears related resources, lunes and open overrides", () => {
  const persosState = createState<Perso[]>([
    { id: 1, nom: "Alya", groupId: 1 },
    { id: 2, nom: "Boris", groupId: null },
  ]);
  const groupsState = createState<Group[]>([{ id: 1, name: "Alpha", chef: 1 }]);
  const stocksState = createState<Record<string, number>>({});
  const persoResourcesState = createState<PersoResource[]>([
    { perso_id: 1, resource_id: 1, quantity: 2 },
    { perso_id: 2, resource_id: 1, quantity: 1 },
  ]);
  const lunesState = createState<Lune[]>([
    {
      id: 1,
      meteo: { eau: 1, nrt: 1, med: 1, mat: 1 },
      rations: {
        1: { eau: true, nrt: true, med: false, tache: "", drogue: null },
        2: { eau: true, nrt: true, med: false, tache: "", drogue: null },
      },
      overrides: {
        1: { pv: 3 },
        2: { pv: 4 },
      },
      constructionPlacements: [],
      constructions: [],
    },
  ]);
  const openOverridesState = createState<Record<string, boolean>>({
    "0-1": true,
    "0-2": true,
    "custom-1": true,
  });
  const deletedPersoIds: number[] = [];

  const actions = usePersoActions({
    persos: persosState.get(),
    groups: groupsState.get(),
    resources: [],
    sacs: [],
    stocks: stocksState.get(),
    exchangeCityStocksWithPersos: false,
    persoResources: persoResourcesState.get(),
    lunes: lunesState.get(),
    nextPersoId: 3,
    setPersos: persosState.set,
    setGroups: groupsState.set,
    setPersoResources: persoResourcesState.set,
    setStocks: stocksState.set,
    setLunes: lunesState.set,
    setPage: () => undefined,
    setSelectedPersoId: () => undefined,
    setOpenOverrides: openOverridesState.set,
    setNextPersoId: () => undefined,
    savePersoEntity: () => undefined,
    deletePersoEntity: (persoId) => deletedPersoIds.push(persoId),
    savePersoResourcesEntity: () => undefined,
    saveStockEntity: () => undefined,
    saveLuneEntity: () => undefined,
  });

  actions.removePerso(0);

  assert.deepEqual(
    persosState.get().map((perso) => perso.id),
    [2],
  );
  assert.deepEqual(persoResourcesState.get(), [
    { perso_id: 2, resource_id: 1, quantity: 1 },
  ]);
  assert.equal(lunesState.get()[0]?.rations["1"], undefined);
  assert.equal(lunesState.get()[0]?.overrides["1"], undefined);
  assert.equal(lunesState.get()[0]?.rations["2"]?.eau, true);
  assert.deepEqual(openOverridesState.get(), { "0-2": true });
  assert.deepEqual(deletedPersoIds, [1]);
});

test("addResource creates a unique code and initializes its stock", () => {
  const { actions, resourcesState, stocksState, savedResources } =
    createResourceActions({
      resources: [{ id: 1, code: "eau", name: "Eau" }],
      stocks: { eau: 2 },
    });

  actions.addResource();

  assert.equal(resourcesState.get()[1]?.code, "res2");
  assert.equal(resourcesState.get()[1]?.name, "Ressource 2");
  assert.equal(stocksState.get()["res2"], 0);
  assert.equal(savedResources[0]?.code, "res2");
});

test("updateResource renames the stock key when the code changes", () => {
  const { actions, resourcesState, stocksState, savedResources } =
    createResourceActions({
      resources: [{ id: 3, code: "herb", name: "Herbe" }],
      stocks: { herb: 4 },
    });

  actions.updateResource(0, "code", "potion");

  assert.equal(resourcesState.get()[0]?.code, "potion");
  assert.equal(stocksState.get()["herb"], undefined);
  assert.equal(stocksState.get()["potion"], 4);
  assert.equal(savedResources[0]?.code, "potion");
});

test("removeResource blocks deletion when the resource is still protected or used", () => {
  withAlertStub((alerts) => {
    const { actions, resourcesState, deletedResources } = createResourceActions(
      {
        resources: [{ id: 1, code: "eau", name: "Eau" }],
        stocks: { eau: 2 },
      },
    );

    actions.removeResource(0);

    assert.equal(resourcesState.get().length, 1);
    assert.deepEqual(deletedResources, []);
    assert.match(alerts[0] ?? "", /impossible de supprimer/i);
  });
});

test("removeResource deletes a free resource after confirmation", () => {
  withWindowStub({
    confirmResult: true,
    callback: (alerts) => {
      const { actions, resourcesState, stocksState, deletedResources } =
        createResourceActions({
          resources: [{ id: 4, code: "res4", name: "Ressource 4" }],
          stocks: { res4: 0 },
        });

      actions.removeResource(0);

      assert.deepEqual(resourcesState.get(), []);
      assert.equal(stocksState.get()["res4"], undefined);
      assert.deepEqual(deletedResources, [4]);
      assert.deepEqual(alerts, []);
    },
  });
});
