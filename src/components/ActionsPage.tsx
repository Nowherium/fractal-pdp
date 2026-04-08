import type {
  Action,
  Arme,
  Sac,
  Outil,
  ToolSpecialite,
  Resource,
} from "../types";
import { confirmAction } from "../utils/confirmAction";
import Button from "./ui/Button";
import Panel from "./ui/Panel";
import InfoText from "./ui/InfoText";
import type { ActionEditableField } from "../utils/actionsUtils";
import { formControlClassName, toFormInputValue } from "../utils/formUtils";
import { toolSpecialiteLabels, toolSpecialiteOrder } from "../utils/toolUtils";
import { useState, useEffect } from "react";

const specialites: Array<{ value: ToolSpecialite; label: string }> =
  toolSpecialiteOrder.map((value) => ({
    value,
    label: toolSpecialiteLabels[value],
  }));

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
    rawValue: string | number,
    options?: { persist?: boolean },
  ) => void;
  removeAction: (index: number) => void;
}) {
  const [localTargetType, setLocalTargetType] = useState<
    "arme" | "outil" | "sac"
  >("arme");
  const [targetId, setTargetId] = useState<number>(1);

  useEffect(() => {
    if (localTargetType === "arme" && armes.length > 0) {
      setTargetId(armes[0]?.id ?? 1);
    }

    if (localTargetType === "outil" && outils.length > 0) {
      setTargetId(outils[0]?.id ?? 1);
    }

    if (localTargetType === "sac" && sacs.length > 0) {
      setTargetId(sacs[0]?.id ?? 1);
    }
  }, [localTargetType, armes, sacs, outils]);

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
              <th>ID ressource</th>
              <th>Type</th>
              <th>Quoi ?</th>
            </tr>
          </thead>
          <tbody>
            {actions.map((action, index) => (
              <tr key={index}>
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
                    value={action.specialite ?? "art"}
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
                    className={`${formControlClassName}`}
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
                    className={`${formControlClassName}`}
                    min='0'
                    value={action.resource_cost}
                    onChange={(event) =>
                      updateAction(index, "resource_cost", event.target.value)
                    }
                  />
                </td>
                <td>
                  <select
                    value={action.resource_id}
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
                    value={toFormInputValue(localTargetType, "arme")}
                    onChange={(event) => {
                      const newValue = event.target.value as
                        | "arme"
                        | "outil"
                        | "sac";
                      setLocalTargetType(newValue);
                      console.log("Selected target type:", newValue);
                      updateAction(
                        index,
                        (localTargetType + "_id") as ActionEditableField,
                        targetId,
                      );
                      updateAction(index, "target_type", event.target.value);
                    }}
                  >
                    <option value='arme'>Arme</option>
                    <option value='sac'>Sac</option>
                    <option value='outil'>Outil</option>
                  </select>
                </td>
                <td className={localTargetType === "arme" ? "" : "hidden"}>
                  <select
                    value={targetId}
                    onChange={(event) => {
                      updateAction(index, "arme_id", event.target.value);
                    }}
                  >
                    {armes.map((arme) => (
                      <option key={arme.id} value={arme.id}>
                        {arme.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td className={localTargetType === "sac" ? "" : "hidden"}>
                  <select
                    value={targetId}
                    onChange={(event) =>
                      updateAction(index, "sac_id", event.target.value)
                    }
                  >
                    {sacs.map((sac) => (
                      <option key={sac.id} value={sac.id}>
                        {sac.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td className={localTargetType === "outil" ? "" : "hidden"}>
                  <select
                    value={targetId}
                    onChange={(event) => {
                      updateAction(index, "outil_id", event.target.value);
                    }}
                  >
                    {outils.map((outil) => (
                      <option key={outil.id} value={outil.id}>
                        {outil.name}
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
            ))}
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
