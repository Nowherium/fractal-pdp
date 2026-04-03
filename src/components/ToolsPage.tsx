import type { Outil } from "../types";

const specialites: Array<{ value: string; label: string }> = [
  { value: "eau", label: "💧 Eau" },
  { value: "nrt", label: "🍗 Nrt" },
  { value: "mat", label: "🧱 Mat" },
  { value: "art", label: "🎭 Art" },
];

const toolFields: Array<{
  key: string;
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

const toInputValue = (value: unknown, fallback: string | number = "") =>
  typeof value === "string" || typeof value === "number" ? value : fallback;

const panelClassName =
  "mb-5 rounded-lg border border-border-strong bg-panel p-[15px]";
const infoTextClassName = "mb-2.5 text-[0.85em] italic text-[#888]";
const inputClassName =
  "w-full rounded-lg border border-border-strong bg-[#111] px-3 py-2.5 text-left text-[#f1f1f1]";

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
    field: string,
    rawValue: string | number,
    options?: { persist?: boolean },
  ) => void;
  removeOutil: (index: number) => void;
}) {
  return (
    <div className={panelClassName}>
      <h2>6. Administration des outils</h2>
      <p className={infoTextClassName}>
        Gère ici les outils de production disponibles pour les personnages. Le
        champ bonus est un multiplicateur : par exemple `1.2` signifie x1,2.
      </p>

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
                        className={inputClassName}
                        value={toInputValue(outil[field.key], "eau")}
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
                        className={`${inputClassName} ${field.type === "number" ? "text-right" : ""}`}
                        type={field.type}
                        step={field.step}
                        min={
                          field.key === "quantity" ||
                          field.key === "pv" ||
                          field.key === "pvmax"
                            ? 0
                            : undefined
                        }
                        value={toInputValue(outil[field.key])}
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
                  <button
                    className='btn-del mt-0'
                    type='button'
                    onClick={() => removeOutil(index)}
                  >
                    Supprimer
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <button className='btn-add mt-3' type='button' onClick={addOutil}>
        + Ajouter un outil
      </button>
    </div>
  );
}

export default ToolsPage;
