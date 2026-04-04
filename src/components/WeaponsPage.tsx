import type { Arme } from "../types";
import { confirmAction } from "../utils/confirmAction";
import { formControlClassName, toFormInputValue } from "../utils/formUtils";
import type { ArmeEditableField } from "../utils/inventoryUtils";
import Button from "./ui/Button";
import InfoText from "./ui/InfoText";
import Panel from "./ui/Panel";

const weaponFields: Array<{
  key: ArmeEditableField;
  label: string;
  type: "text" | "number";
  step?: string;
}> = [
  { key: "name", label: "Nom", type: "text" },
  { key: "att", label: "Att", type: "number", step: "0.1" },
  { key: "degats", label: "Dégâts", type: "number", step: "0.1" },
  { key: "fiabilite", label: "Fiabilité", type: "number", step: "1" },
  { key: "pv", label: "PV", type: "number", step: "1" },
  { key: "pvm", label: "PVM", type: "number", step: "1" },
  { key: "poids", label: "Poids", type: "number", step: "0.1" },
  { key: "quantity", label: "Quantité", type: "number", step: "1" },
];

function WeaponsPage({
  armes,
  addArme,
  updateArme,
  removeArme,
}: {
  armes: Arme[];
  addArme: () => void;
  updateArme: (
    index: number,
    field: ArmeEditableField,
    rawValue: string | number,
    options?: { persist?: boolean },
  ) => void;
  removeArme: (index: number) => void;
}) {
  return (
    <Panel>
      <h2>5. Administration des armes</h2>
      <InfoText>
        Gère ici le catalogue des armes disponibles pour les personnages.
      </InfoText>

      {armes.length === 0 ? (
        <p>Aucune arme définie pour le moment.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Nom</th>
              <th>Att</th>
              <th>Dégâts</th>
              <th>Fiabilité</th>
              <th>PV</th>
              <th>PVM</th>
              <th>Poids</th>
              <th>Quantité</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {armes.map((arme, index) => (
              <tr key={arme.id}>
                {weaponFields.map((field) => (
                  <td key={field.key}>
                    <input
                      className={`${formControlClassName} ${field.type === "number" ? "text-right" : ""}`}
                      type={field.type}
                      step={field.step}
                      min={field.key === "quantity" ? 0 : undefined}
                      value={toFormInputValue(arme[field.key])}
                      onChange={(event) =>
                        updateArme(
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
                              updateArme(index, field.key, event.target.value, {
                                persist: true,
                              })
                          : undefined
                      }
                    />
                  </td>
                ))}
                <td>
                  <Button
                    className='mt-0'
                    size='sm'
                    variant='danger'
                    onClick={() =>
                      confirmAction(
                        `Supprimer l'arme ${arme.name || "sélectionnée"} ?`,
                        () => removeArme(index),
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

      <Button className='mt-3' variant='success' onClick={addArme}>
        + Ajouter une arme
      </Button>
    </Panel>
  );
}

export default WeaponsPage;
