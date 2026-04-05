import type { Outil, ToolSpecialite } from "../types";
import { confirmAction } from "../utils/confirmAction";
import { formControlClassName, toFormInputValue } from "../utils/formUtils";
import { toolSpecialiteLabels, toolSpecialiteOrder } from "../utils/toolUtils";
import type { OutilEditableField } from "../utils/inventoryUtils";
import Button from "./ui/Button";
import InfoText from "./ui/InfoText";
import Panel from "./ui/Panel";

const specialites: Array<{ value: ToolSpecialite; label: string }> =
  toolSpecialiteOrder.map((value) => ({
    value,
    label: toolSpecialiteLabels[value],
  }));

const toolFields: Array<{
  key: OutilEditableField;
  label: string;
  type: "text" | "select" | "number";
  step?: string;
}> = [
  { key: "name", label: "Nom", type: "text" },
  { key: "specialite", label: "Spécialité", type: "select" },
  { key: "bonus", label: "Bonus x", type: "number", step: "0.1" },
  { key: "pv", label: "PV", type: "number", step: "1" },
  { key: "pvmax", label: "PV Max", type: "number", step: "1" },
  { key: "poids", label: "Poids", type: "number", step: "0.1" },
  { key: "quantity", label: "Quantité", type: "number", step: "1" },
];

function ToolsPage({
  outils,
  addOutil,
  updateOutil,
  removeOutil,
}: {
  outils: Outil[];
  addOutil: () => void;
  updateOutil: (
    index: number,
    field: OutilEditableField,
    rawValue: string | number,
    options?: { persist?: boolean },
  ) => void;
  removeOutil: (index: number) => void;
}) {
  return (
    <Panel>
      <h2>6. Administration des outils</h2>
      <InfoText>
        Gère ici les outils de production disponibles pour les personnages. Le
        champ bonus est un multiplicateur : par exemple `1.2` signifie x1,2.
      </InfoText>

      {outils.length === 0 ? (
        <p>Aucun outil défini pour le moment.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Nom</th>
              <th>Spécialité</th>
              <th>Bonus</th>
              <th>PV</th>
              <th>PV Max</th>
              <th>Poids</th>
              <th>Quantité</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {outils.map((outil, index) => (
              <tr key={outil.id}>
                {toolFields.map((field) => (
                  <td key={field.key}>
                    {field.type === "select" ? (
                      <select
                        className={formControlClassName}
                        value={toFormInputValue(outil[field.key], "eau")}
                        onChange={(event) =>
                          updateOutil(index, field.key, event.target.value)
                        }
                      >
                        {specialites.map((specialite) => (
                          <option
                            key={specialite.value}
                            value={specialite.value}
                          >
                            {specialite.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        className={`${formControlClassName} ${field.type === "number" ? "text-right" : ""}`}
                        type={field.type}
                        step={field.step}
                        min={
                          field.key === "quantity" ||
                          field.key === "pv" ||
                          field.key === "pvmax"
                            ? 0
                            : undefined
                        }
                        value={toFormInputValue(outil[field.key])}
                        onChange={(event) =>
                          updateOutil(
                            index,
                            field.key,
                            event.target.value,
                            field.type === "text"
                              ? { persist: false }
                              : undefined,
                          )
                        }
                        onBlur={
                          field.type === "text"
                            ? (event) =>
                                updateOutil(
                                  index,
                                  field.key,
                                  event.target.value,
                                  {
                                    persist: true,
                                  },
                                )
                            : undefined
                        }
                      />
                    )}
                  </td>
                ))}
                <td>
                  <Button
                    className='mt-0'
                    size='sm'
                    variant='danger'
                    onClick={() =>
                      confirmAction(
                        `Supprimer l'outil ${outil.name || "sélectionné"} ?`,
                        () => removeOutil(index),
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

      <Button className='mt-3' variant='success' onClick={addOutil}>
        + Ajouter un outil
      </Button>
    </Panel>
  );
}

export default ToolsPage;
