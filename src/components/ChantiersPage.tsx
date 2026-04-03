import type {
  ConstructionProgressById,
  LuneConstruction,
  Resource,
} from "../types";
import type { ConstructionState } from "../utils/timelineTypes";

const rewardOptions: Array<{
  value: LuneConstruction["rewardType"];
  label: string;
}> = [
  { value: "eau", label: "+ Eau" },
  { value: "nrt", label: "+ Nrt" },
  { value: "med", label: "+ Med" },
  { value: "mat", label: "+ Mat" },
  { value: "art", label: "+ Art" },
  { value: "combat", label: "+ Combat" },
];

const statusOptions: Array<{
  value: NonNullable<LuneConstruction["status"]>;
  label: string;
}> = [
  { value: "todo", label: "À faire" },
  { value: "in-progress", label: "En cours" },
  { value: "done", label: "Terminé" },
];

const getStatusLabel = (
  state?: ConstructionState,
  fallbackStatus?: LuneConstruction["status"],
) => {
  const status = state?.statusCode ?? fallbackStatus ?? "todo";
  if (status === "done" || state?.isCompleted) return "Terminé";
  if (status === "in-progress") return "En cours";
  return "À faire";
};

const getStatusClassName = (
  state?: ConstructionState,
  fallbackStatus?: LuneConstruction["status"],
) => {
  const status = state?.statusCode ?? fallbackStatus ?? "todo";
  if (status === "done" || state?.isCompleted) return "safe";
  if (status === "in-progress") return "warning";
  return "info";
};

function ChantiersPage({
  constructions,
  resources,
  constructionProgress,
  constructionStates,
  addConstruction,
  updateConstruction,
  removeConstruction,
}: {
  constructions: LuneConstruction[];
  resources: Resource[];
  constructionProgress: ConstructionProgressById;
  constructionStates: Record<string, ConstructionState>;
  addConstruction: () => void;
  updateConstruction: (
    constructionId: string,
    field: string,
    rawValue: string | number,
  ) => void;
  removeConstruction: (constructionId: string) => void;
}) {
  const availableResources =
    resources.length > 0 ? resources : [{ id: 0, code: "mat", name: "MAT" }];

  return (
    <div className='panel'>
      <h2>4. Administration des chantiers</h2>
      <p className='info-text'>
        Les chantiers sont définis ici une seule fois. Ici,
        <strong> À faire</strong> signifie <strong>posé nulle part</strong>,
        <strong> En cours</strong> pose le chantier à partir de la
        <strong> lune courante</strong>, et <strong>Terminé</strong> le masque
        des lunes suivantes jusqu’à réouverture.
      </p>

      {constructions.length === 0 ? (
        <p>Aucun chantier défini pour le moment.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Nom</th>
              <th>Ressource</th>
              <th>Coût</th>
              <th>Bâtisseurs requis</th>
              <th>Gain</th>
              <th>État</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {constructions.map((construction) => {
              const state = constructionStates?.[construction.id];
              const progress = constructionProgress?.[construction.id];

              return (
                <tr key={construction.id}>
                  <td>
                    <input
                      className='perso-field-input'
                      type='text'
                      value={construction.name}
                      onChange={(event) =>
                        updateConstruction(
                          construction.id,
                          "name",
                          event.target.value,
                        )
                      }
                    />
                  </td>
                  <td>
                    <select
                      className='perso-field-input'
                      value={construction.resourceCode}
                      onChange={(event) =>
                        updateConstruction(
                          construction.id,
                          "resourceCode",
                          event.target.value,
                        )
                      }
                    >
                      {availableResources.map((resource) => (
                        <option key={resource.id} value={resource.code}>
                          {resource.name || resource.code.toUpperCase()}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      className='perso-field-input'
                      type='number'
                      min='0'
                      step='1'
                      value={construction.resourceCost}
                      onChange={(event) =>
                        updateConstruction(
                          construction.id,
                          "resourceCost",
                          event.target.value,
                        )
                      }
                    />
                  </td>
                  <td>
                    <input
                      className='perso-field-input'
                      type='number'
                      min='1'
                      step='1'
                      value={construction.buildersRequired}
                      onChange={(event) =>
                        updateConstruction(
                          construction.id,
                          "buildersRequired",
                          event.target.value,
                        )
                      }
                    />
                  </td>
                  <td>
                    <select
                      className='perso-field-input'
                      value={construction.rewardType}
                      onChange={(event) =>
                        updateConstruction(
                          construction.id,
                          "rewardType",
                          event.target.value,
                        )
                      }
                    >
                      {rewardOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <select
                      className='perso-field-input'
                      value={progress?.status ?? construction.status ?? "todo"}
                      onChange={(event) =>
                        updateConstruction(
                          construction.id,
                          "status",
                          event.target.value,
                        )
                      }
                    >
                      {statusOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <div
                      className={getStatusClassName(
                        state,
                        progress?.status ?? construction.status,
                      )}
                      style={{ marginTop: "0.4rem" }}
                    >
                      {getStatusLabel(
                        state,
                        progress?.status ?? construction.status,
                      )}
                    </div>
                    <div className='info-text' style={{ marginTop: "0.3rem" }}>
                      {state?.statusLabel || "Appliqué à la timeline."}
                    </div>
                  </td>
                  <td>
                    <button
                      className='btn-del'
                      type='button'
                      onClick={() => removeConstruction(construction.id)}
                    >
                      Supprimer
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <button className='btn-add' type='button' onClick={addConstruction}>
        + Ajouter un chantier
      </button>
    </div>
  );
}

export default ChantiersPage;
