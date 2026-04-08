import type { Dispatch, SetStateAction } from "react";

import type { PersistOptions, Action } from "../types";
import {
  createDefaultAction,
  type ActionEditableField,
} from "../utils/actionsUtils";

interface UseActionsParams {
  actions: Action[];
  setActions: Dispatch<SetStateAction<Action[]>>;
  saveActionsEntity: (actions: Action) => void;
  deleteActionsEntity: (actionId: number) => void;
}

export const useActionsActions = ({
  actions,
  setActions,
  saveActionsEntity,
  deleteActionsEntity,
}: UseActionsParams) => {
  const addAction = () => {
    const newAction = createDefaultAction(actions);
    const nextActions = [...actions, newAction];

    setActions(nextActions);
    saveActionsEntity(newAction);
  };

  const updateAction = (
    index: number,
    field: ActionEditableField,
    rawValue: string | number,
    { persist = true }: PersistOptions = {},
  ) => {
    const currentAction = actions[index];
    if (!currentAction) {
      return;
    }

    const nextValue =
      field === "name" || field === "target_type" || field === "specialite"
        ? String(rawValue ?? "")
        : (() => {
            const numericValue = Number(rawValue);
            return Number.isFinite(numericValue)
              ? Math.max(0, numericValue)
              : 1;
          })();

    const nextAction = {
      ...currentAction,
      [field]: nextValue,
    };
    const nextActions = actions.map((action, currentIndex) =>
      currentIndex !== index ? action : nextAction,
    );

    setActions(nextActions);
    if (persist) {
      saveActionsEntity(nextAction);
    }
  };

  const removeAction = (index: number) => {
    const actionToRemove = actions[index];
    if (!actionToRemove) {
      return;
    }

    const nextActions = actions.filter(
      (action) => action.id !== actionToRemove.id,
    );

    setActions(nextActions);
    deleteActionsEntity(actionToRemove.id);
  };

  return {
    addAction,
    updateAction,
    removeAction,
  };
};
