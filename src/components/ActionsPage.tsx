import type {
  Action,
  Arme,
  Outil,
  Resource,
  Sac,
  ToolSpecialite,
} from "../types";
import { confirmAction } from "../utils/confirmAction";
import Button from "./ui/Button";
import Panel from "./ui/Panel";
import InfoText from "./ui/InfoText";
import type { ActionEditableField } from "../utils/actionsUtils";
import { formControlClassName } from "../utils/formUtils";
import { toolSpecialiteLabels, toolSpecialiteOrder } from "../utils/toolUtils";

const specialites: Array<{ value: ToolSpecialite; label: string }> =
  toolSpecialiteOrder.map((value) => ({
    value,
    label: toolSpecialiteLabels[value],
  }));

type ActionTargetType = "arme" | "outil" | "sac";

const normalizeActionTargetType = (
  value: Action["target_type"],
): ActionTargetType => (value === "sac" || value === "outil" ? value : "arme");

const getTargetField = (targetType: ActionTargetType): ActionEditableField => {
  if (targetType === "sac") return "sac_id";
  if (targetType === "outil") return "outil_id";
  return "arme_id";
};

const getTargetOptions = (
  targetType: ActionTargetType,
  armes: Arme[],
  sacs: Sac[],
  outils: Outil[],
): Array<Arme | Sac | Outil> => {
  if (targetType === "sac") return sacs;
  if (targetType === "outil") return outils;
  return armes;
};

const getTargetId = (action: Action, targetType: ActionTargetType): number => {
  if (targetType === "sac") return Math.max(0, Number(action.sac_id ?? 0) || 0);
  if (targetType === "outil") {
    return Math.max(0, Number(action.outil_id ?? 0) || 0);
  }
  return Math.max(0, Number(action.arme_id ?? 0) || 0);
};

const resolveTargetId = (
  action: Action,
  targetType: ActionTargetType,
  armes: Arme[],
  sacs: Sac[],
  outils: Outil[],
): number => {
  const targetOptions = getTargetOptions(targetType, armes, sacs, outils);
  const currentTargetId = getTargetId(action, targetType);

  if (targetOptions.some((option) => Number(option.id) === currentTargetId)) {
    return currentTargetId;
  }

  return Number(targetOptions[0]?.id ?? 0);
};

function ActionsPage({
  actions,
  armes,
  sacs,
  outils,
  resources,
  addAction,
  updateAction,
  removeAction,
}: {
  actions: Action[];
  armes: Arme[];
  sacs: Sac[];
  outils: Outil[];
  resources: Resource[];
  addAction: () => void;
  updateAction: (
    index: number,
    field: ActionEditableField,
    rawValue: string | number | null,
    options?: { persist?: boolean },
  ) => void;
  removeAction: (index: number) => void;
}) {
  return (
    <Panel>
      <h2>6. Administration des actions</h2>
      <InfoText>
        Gère ici les actions disponibles pour les personnages.
      </InfoText>
      {actions.length === 0 ? (
        <p>Aucune action définie pour le moment.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Nom</th>
              <th>Spécialité</th>
              <th>Capacité min.</th>
              <th>Coût</th>
              <th>Besoin</th>
              <th>Type</th>
              <th>Quoi ?</th>
            </tr>
          </thead>
          <tbody>
            {actions.map((action, index) => {
              const targetType = normalizeActionTargetType(action.target_type);
              const targetField = getTargetField(targetType);
              const targetOptions = getTargetOptions(
                targetType,
                armes,
                sacs,
                outils,
              );
              const currentTargetId = getTargetId(action, targetType);
              const selectedTargetId = targetOptions.some(
                (option) => Number(option.id) === currentTargetId,
              )
                ? currentTargetId
                : (targetOptions[0]?.id ?? "");

              return (
                <tr key={action.id || index}>
                  <td>
                    <input
                      type='text'
                      value={action.name}
                      onChange={(event) =>
                        updateAction(index, "name", event.target.value)
                      }
                    />
                  </td>
                  <td>
                    <select
                      className={formControlClassName}
                      value={action.specialite || "art"}
                      onChange={(event) =>
                        updateAction(index, "specialite", event.target.value)
                      }
                    >
                      {specialites.map((specialite) => (
                        <option key={specialite.value} value={specialite.value}>
                          {specialite.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      type='number'
                      className={formControlClassName}
                      min='0'
                      value={action.min_capacite}
                      onChange={(event) =>
                        updateAction(index, "min_capacite", event.target.value)
                      }
                    />
                  </td>
                  <td>
                    <input
                      type='number'
                      className={formControlClassName}
                      min='0'
                      value={action.resource_cost}
                      onChange={(event) =>
                        updateAction(
                          index,
                          "resource_cost",
                          event.target.value
                            ? Number(event.target.value)
                            : null,
                        )
                      }
                    />
                  </td>
                  <td>
                    <select
                      value={action.resource_id ?? ""}
                      onChange={(event) =>
                        updateAction(
                          index,
                          "resource_id",
                          Number(event.target.value),
                        )
                      }
                    >
                      {resources.map((resource) => (
                        <option key={resource.id} value={resource.id}>
                          {resource.name || resource.code.toUpperCase()}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <select
                      value={targetType}
                      onChange={(event) => {
                        const nextTargetType = normalizeActionTargetType(
                          event.target.value,
                        );
                        const nextTargetField = getTargetField(nextTargetType);
                        const nextTargetId = resolveTargetId(
                          action,
                          nextTargetType,
                          armes,
                          sacs,
                          outils,
                        );

                        updateAction(index, "target_type", nextTargetType, {
                          persist: false,
                        });
                        updateAction(index, nextTargetField, nextTargetId);
                      }}
                    >
                      <option value='arme'>Arme</option>
                      <option value='sac'>Sac</option>
                      <option value='outil'>Outil</option>
                    </select>
                  </td>
                  <td>
                    <select
                      value={selectedTargetId}
                      onChange={(event) =>
                        updateAction(
                          index,
                          targetField,
                          event.target.value ? Number(event.target.value) : 0,
                        )
                      }
                      disabled={targetOptions.length === 0}
                    >
                      <option value=''>
                        {targetOptions.length === 0
                          ? "Aucun élément disponible"
                          : "Choisir…"}
                      </option>
                      {targetOptions.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <Button
                      className='mt-0'
                      size='sm'
                      variant='danger'
                      onClick={() =>
                        confirmAction(
                          `Supprimer l'action ${action.name || "sélectionné"} ?`,
                          () => removeAction(index),
                        )
                      }
                    >
                      Supprimer
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <Button className='mt-3' variant='success' onClick={addAction}>
        + Ajouter une action
      </Button>
    </Panel>
  );
}

export default ActionsPage;
