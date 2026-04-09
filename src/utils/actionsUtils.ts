import type { Action } from "../types";

export type ActionEditableField = keyof Pick<
  Action,
  | "name"
  | "specialite"
  | "min_capacite"
  | "resource_cost"
  | "resource_id"
  | "target_type"
  | "arme_id"
  | "sac_id"
  | "outil_id"
>;

export const createDefaultAction = (actions: Action[] = []): Action => {
  const nextId =
    actions.reduce(
      (maxActionId, action) => Math.max(maxActionId, Number(action.id) || 0),
      0,
    ) + 1;

  return {
    id: nextId,
    name: `Action ${nextId}`,
    specialite: "art",
    min_capacite: 0,
    resource_cost: 0,
    resource_id: 1,
    target_type: "arme",
    sac_id: 0,
    arme_id: 0,
    outil_id: 0,
  };
};
