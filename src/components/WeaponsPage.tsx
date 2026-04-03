import type { Arme } from "../types";

const weaponFields: Array<{
  key: string;
  label: string;
  type: "text" | "number";
  step?: string;
}> = [
  { key: "name", label: "Nom", type: "text" },
  { key: "att", label: "Att", type: "number", step: "0.1" },
  { key: "degats", label: "Dégâts", type: "number", step: "0.1" },
  { key: "fiabilite", label: "Fiabilité", type: "number", step: "0.1" },
  { key: "pv", label: "PV", type: "number", step: "0.1" },
  { key: "pvm", label: "PVM", type: "number", step: "0.1" },
  { key: "poids", label: "Poids", type: "number", step: "0.1" },
  { key: "quantity", label: "Quantité", type: "number", step: "1" },
];

const toInputValue = (value: unknown, fallback: string | number = "") =>
  typeof value === "string" || typeof value === "number" ? value : fallback;

const panelClassName =
  "mb-5 rounded-lg border border-border-strong bg-panel p-[15px]";
const infoTextClassName = "mb-2.5 text-[0.85em] italic text-[#888]";
const inputClassName =
  "w-full rounded-lg border border-border-strong bg-[#111] px-3 py-2.5 text-left text-[#f1f1f1]";

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
    field: string,
    rawValue: string | number,
    options?: { persist?: boolean },
  ) => void;
  removeArme: (index: number) => void;
}) {
  return (
    <div className={panelClassName}>
      <h2>5. Administration des armes</h2>
      <p className={infoTextClassName}>
        Gère ici le catalogue des armes disponibles pour les personnages.
      </p>

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
                      className={`${inputClassName} ${field.type === "number" ? "text-right" : ""}`}
                      type={field.type}
                      step={field.step}
                      min={field.key === "quantity" ? 0 : undefined}
                      value={toInputValue(arme[field.key])}
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
                  <button
                    className='btn-del mt-0'
                    type='button'
                    onClick={() => removeArme(index)}
                  >
                    Supprimer
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <button className='btn-add mt-3' type='button' onClick={addArme}>
        + Ajouter une arme
      </button>
    </div>
  );
}

export default WeaponsPage;
