import type { Sac } from "../types";

const bagFields: Array<{
  key: string;
  label: string;
  type: "text" | "number";
  step?: string;
}> = [
  { key: "name", label: "Nom", type: "text" },
  { key: "pv", label: "PV", type: "number", step: "1" },
  { key: "pvmax", label: "PV Max", type: "number", step: "1" },
  { key: "poids", label: "Poids", type: "number", step: "0.1" },
  { key: "capacite", label: "Capacité", type: "number", step: "0.1" },
  { key: "quantity", label: "Quantité", type: "number", step: "1" },
];

const toInputValue = (value: unknown, fallback: string | number = "") =>
  typeof value === "string" || typeof value === "number" ? value : fallback;

const panelClassName =
  "mb-5 rounded-lg border border-border-strong bg-panel p-[15px]";
const infoTextClassName = "mb-2.5 text-[0.85em] italic text-[#888]";
const inputClassName =
  "w-full rounded-lg border border-border-strong bg-[#111] px-3 py-2.5 text-left text-[#f1f1f1]";

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
    field: string,
    rawValue: string | number,
    options?: { persist?: boolean },
  ) => void;
  removeSac: (index: number) => void;
}) {
  return (
    <div className={panelClassName}>
      <h2>7. Administration des sacs</h2>
      <p className={infoTextClassName}>
        Gère ici les sacs disponibles pour les personnages. Un perso peut en
        porter plusieurs, un seul sac équipé ajoute sa capacité au poids max, et
        le poids de chaque sac porté compte dans le poids total.
      </p>

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
                      className={`${inputClassName} ${field.type === "number" ? "text-right" : ""}`}
                      type={field.type}
                      step={field.step}
                      min={field.key === "name" ? undefined : 0}
                      value={toInputValue(sac[field.key])}
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
                  <button
                    className='btn-del mt-0'
                    type='button'
                    onClick={() => removeSac(index)}
                  >
                    Supprimer
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <button className='btn-add mt-3' type='button' onClick={addSac}>
        + Ajouter un sac
      </button>
    </div>
  );
}

export default BagsPage;
