import type { Terrain } from "../types";
import { confirmAction } from "../utils/confirmAction";
import { formControlClassName, toFormInputValue } from "../utils/formUtils";
import type { TerrainEditableField } from "../utils/terrainUtils";
import Button from "./ui/Button";
import InfoText from "./ui/InfoText";
import Panel from "./ui/Panel";

const terrainFields: Array<{
  key: TerrainEditableField;
  label: string;
  type: "text" | "number";
  step?: string;
}> = [
  { key: "name", label: "Nom", type: "text" },
  { key: "nrt", label: "Bonus Nrt", type: "number", step: "0.05" },
  { key: "eau", label: "Bonus Eau", type: "number", step: "0.05" },
  { key: "med", label: "Bonus Med", type: "number", step: "0.05" },
  { key: "mat", label: "Bonus Mat", type: "number", step: "0.05" },
];

function TerrainsPage({
  terrains,
  addTerrain,
  updateTerrain,
  removeTerrain,
}: {
  terrains: Terrain[];
  addTerrain: () => void;
  updateTerrain: (
    index: number,
    field: TerrainEditableField,
    rawValue: string | number,
    options?: { persist?: boolean },
  ) => void;
  removeTerrain: (index: number) => void;
}) {
  return (
    <Panel>
      <h2>10. Terrains</h2>
      <InfoText>
        Gère ici les lieux possibles de la ville. Chaque terrain applique un
        multiplicateur de production sur `nrt`, `eau`, `med` et `mat`.
      </InfoText>

      {terrains.length === 0 ? (
        <p>Aucun terrain défini pour le moment.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Nom</th>
              <th>Bonus Nrt</th>
              <th>Bonus Eau</th>
              <th>Bonus Med</th>
              <th>Bonus Mat</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {terrains.map((terrain, index) => (
              <tr key={terrain.id}>
                {terrainFields.map((field) => (
                  <td key={field.key}>
                    <input
                      className={`${formControlClassName} ${field.type === "number" ? "text-right" : ""}`}
                      type={field.type}
                      min={field.type === "number" ? 0 : undefined}
                      step={field.step}
                      value={toFormInputValue(terrain[field.key])}
                      onChange={(event) =>
                        updateTerrain(
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
                              updateTerrain(
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
                  </td>
                ))}
                <td>
                  <Button
                    className='mt-0'
                    size='sm'
                    variant='danger'
                    onClick={() =>
                      confirmAction(
                        `Supprimer le terrain ${terrain.name || "sélectionné"} ?`,
                        () => removeTerrain(index),
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

      <Button className='mt-3' variant='success' onClick={addTerrain}>
        + Ajouter un terrain
      </Button>
    </Panel>
  );
}

export default TerrainsPage;
