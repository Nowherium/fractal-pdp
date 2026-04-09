import test from "node:test";
import assert from "node:assert/strict";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import ActionsPage from "../src/components/ActionsPage";
import { useActionsActions } from "../src/hooks/useActionsActions";
import type { Action } from "../src/types";
import { buildState } from "../src/utils/state/buildState";
import { normalizeActions } from "../src/utils/state/entities";

test("renders each action row with its own target type and selected target item", () => {
  const markup = renderToStaticMarkup(
    createElement(ActionsPage, {
      actions: [
        {
          id: 1,
          name: "Fabriquer une gourde",
          specialite: "art",
          min_capacite: 2,
          resource_cost: 1,
          resource_id: 1,
          target_type: "sac",
          sac_id: 7,
          arme_id: 0,
          outil_id: 0,
        },
        {
          id: 2,
          name: "Monter un piège",
          specialite: "mat",
          min_capacite: 3,
          resource_cost: 2,
          resource_id: 1,
          target_type: "outil",
          sac_id: 0,
          arme_id: 0,
          outil_id: 9,
        },
      ],
      armes: [{ id: 3, name: "Lance" }],
      sacs: [{ id: 7, name: "Gourde" }],
      outils: [{ id: 9, name: "Piège" }],
      resources: [{ id: 1, code: "mat", name: "Mat" }],
      addAction: () => undefined,
      updateAction: () => undefined,
      removeAction: () => undefined,
    }),
  );

  assert.match(markup, /<option value="sac" selected="">Sac<\/option>/);
  assert.match(markup, /<option value="outil" selected="">Outil<\/option>/);
  assert.match(markup, /<option value="7" selected="">Gourde<\/option>/);
  assert.match(markup, /<option value="9" selected="">Piège<\/option>/);
});

test("falls back to the first available target item when the current one is missing", () => {
  const markup = renderToStaticMarkup(
    createElement(ActionsPage, {
      actions: [
        {
          id: 3,
          name: "Fabriquer une gourde",
          specialite: "art",
          min_capacite: 2,
          resource_cost: 1,
          resource_id: 1,
          target_type: "sac",
          sac_id: 0,
          arme_id: 0,
          outil_id: 0,
        },
      ],
      armes: [{ id: 3, name: "Lance" }],
      sacs: [{ id: 7, name: "Gourde" }],
      outils: [{ id: 9, name: "Piège" }],
      resources: [{ id: 1, code: "mat", name: "Mat" }],
      addAction: () => undefined,
      updateAction: () => undefined,
      removeAction: () => undefined,
    }),
  );

  assert.match(markup, /<option value="7" selected="">Gourde<\/option>/);
});

test("normalizeActions preserves target type and specialization from imported state", () => {
  const [action] = normalizeActions([
    {
      id: 5,
      name: "Fabriquer une gourde",
      specialite: "mat",
      min_capacite: 4,
      resource_cost: 2,
      resource_id: 1,
      target_type: "sac",
      arme_id: 0,
      sac_id: 12,
      outil_id: 0,
    },
  ]);

  assert.equal(action?.specialite, "mat");
  assert.equal(action?.target_type, "sac");
  assert.equal(action?.sac_id, 12);
});

test("buildState normalizes imported actions before exposing them to the UI", () => {
  const state = buildState({
    actions: [
      {
        id: 6,
        name: "Monter un piège",
        specialite: "art",
        min_capacite: "3",
        resource_cost: "2",
        resource_id: "1",
        target_type: "outil",
        arme_id: 0,
        sac_id: 0,
        outil_id: "9",
      },
    ],
  });

  const [action] = state.actions;

  assert.equal(action?.target_type, "outil");
  assert.equal(action?.outil_id, 9);
  assert.equal(action?.min_capacite, 3);
});

test("updateAction persists edits even when React applies state updates asynchronously", async () => {
  let currentActions: Action[] = [
    {
      id: 10,
      name: "Ancien nom",
      specialite: "art",
      min_capacite: 1,
      resource_cost: 1,
      resource_id: 1,
      target_type: "sac",
      sac_id: 7,
      arme_id: 0,
      outil_id: 0,
    },
  ];

  let pendingUpdate: ((value: Action[]) => Action[]) | Action[] | null = null;
  const savedActions: Action[] = [];

  const { updateAction } = useActionsActions({
    actions: currentActions,
    setActions: (value) => {
      pendingUpdate = value;
    },
    saveActionsEntity: (action) => {
      savedActions.push(action);
    },
    deleteActionsEntity: () => undefined,
  });

  updateAction(0, "name", "Nom mis à jour");

  assert.equal(typeof pendingUpdate, "function");
  if (typeof pendingUpdate !== "function") {
    throw new Error("La mise à jour différée n'a pas été enregistrée.");
  }

  const applyPendingUpdate = pendingUpdate as unknown as (
    value: Action[],
  ) => Action[];
  currentActions = applyPendingUpdate(currentActions);
  await Promise.resolve();

  assert.equal(currentActions[0]?.name, "Nom mis à jour");
  assert.equal(savedActions.length, 1);
  assert.equal(savedActions[0]?.name, "Nom mis à jour");
});
