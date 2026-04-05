import type { Sac } from "../types";
import { confirmAction } from "../utils/confirmAction";
import { formControlClassName, toFormInputValue } from "../utils/formUtils";
import type { SacEditableField } from "../utils/inventoryUtils";
import Button from "./ui/Button";
import InfoText from "./ui/InfoText";
import Panel from "./ui/Panel";

const bagFields: Array<{
  key: SacEditableField;
  label: string;
  type: "text" | "number";
  step?: string;
}> = [
  { key: "name", label: "Nom", type: "text" },
  { key: "pv", label: "PV", type: "number", step: "1" },
  { key: "pvmax", label: "PV Max", type: "number", step: "1" },
  { key: "poids", label: "Poids", type: "number", step: "0.1" },
  { key: "capacite", label: "Capacité", type: "number", step: "1" },
  { key: "quantity", label: "Quantité", type: "number", step: "1" },
];

function BagsPage({
  sacs,
  addSac,
  updateSac,
  removeSac,
}: {
  sacs: Sac[];
  addSac: () => void;
  updateSac: (
    index: number,
    field: SacEditableField,
    rawValue: string | number,
    options?: { persist?: boolean },
  ) => void;
  removeSac: (index: number) => void;
}) {
  return (
    <Panel>
      <h2>7. Administration des sacs</h2>
      <InfoText>
        Gère ici les sacs disponibles pour les personnages. Un perso peut en
        porter plusieurs, un seul sac équipé ajoute sa capacité au poids max, et
        le poids de chaque sac porté compte dans le poids total.
      </InfoText>

      {sacs.length === 0 ? (
        <p>Aucun sac défini pour le moment.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Nom</th>
              <th>PV</th>
              <th>PV Max</th>
              <th>Poids</th>
              <th>Capacité</th>
              <th>Quantité</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {sacs.map((sac, index) => (
              <tr key={sac.id}>
                {bagFields.map((field) => (
                  <td key={field.key}>
                    <input
                      className={`${formControlClassName} ${field.type === "number" ? "text-right" : ""}`}
                      type={field.type}
                      step={field.step}
                      min={field.key === "name" ? undefined : 0}
                      value={toFormInputValue(sac[field.key])}
                      onChange={(event) =>
                        updateSac(
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
                              updateSac(index, field.key, event.target.value, {
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
                        `Supprimer le sac ${sac.name || "sélectionné"} ?`,
                        () => removeSac(index),
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

      <Button className='mt-3' variant='success' onClick={addSac}>
        + Ajouter un sac
      </Button>
    </Panel>
  );
}

export default BagsPage;
