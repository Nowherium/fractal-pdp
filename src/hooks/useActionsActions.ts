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
    rawValue: string | number | null,
    { persist = true }: PersistOptions = {},
  ) => {
    const nextValue =
      field === "name" || field === "target_type" || field === "specialite"
        ? String(rawValue ?? "")
        : (() => {
            const numericValue = Number(rawValue);
            return Number.isFinite(numericValue)
              ? Math.max(0, numericValue)
              : 0;
          })();

    setActions((previous) => {
      const currentAction = previous[index];
      if (!currentAction) {
        return previous;
      }

      const nextAction = {
        ...currentAction,
        [field]: nextValue,
      };

      if (persist) {
        queueMicrotask(() => {
          saveActionsEntity(nextAction);
        });
      }

      return previous.map((action, currentIndex) =>
        currentIndex !== index ? action : nextAction,
      );
    });
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
