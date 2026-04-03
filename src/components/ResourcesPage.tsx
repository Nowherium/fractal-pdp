import type { Resource } from "../types";
import { compareResources } from "../utils/resourceOrder";

const toInputValue = (value: unknown, fallback = "") =>
  typeof value === "string" || typeof value === "number" ? value : fallback;

function ResourcesPage({
  resources,
  addResource,
  updateResource,
  removeResource,
  getResourceDeleteGuard,
}: {
  resources: Resource[];
  addResource: () => void;
  updateResource: (
    index: number,
    field: "code" | "name",
    rawValue: string | number,
    options?: { persist?: boolean },
  ) => void;
  removeResource: (index: number) => void;
  getResourceDeleteGuard: (resource: Resource) => {
    canDelete: boolean;
    reason: string;
  };
}) {
  const orderedResources = resources
    .map((resource, index) => ({ resource, index }))
    .sort((left, right) => compareResources(left.resource, right.resource));

  return (
    <div className='panel'>
      <h2>8. Administration des ressources</h2>
      <p className='info-text'>
        Gère ici la table `resources` : code interne + nom affiché.
        <br />
        Les quantités de stock restent éditables dans la page Réserve centrale.
        <br />
        La suppression est bloquée si la ressource est protégée, encore stockée,
        portée, ou planifiée comme drogue.
      </p>

      {resources.length === 0 ? (
        <p>Aucune ressource définie pour le moment.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Code</th>
              <th>Nom affiché</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {orderedResources.map(({ resource, index }) => {
              const deleteGuard = getResourceDeleteGuard(resource);

              return (
                <tr key={resource.id}>
                  <td>{resource.id}</td>
                  <td>
                    <input
                      className='perso-field-input'
                      type='text'
                      value={toInputValue(resource.code)}
                      onChange={(event) =>
                        updateResource(index, "code", event.target.value, {
                          persist: false,
                        })
                      }
                      onBlur={(event) =>
                        updateResource(index, "code", event.target.value, {
                          persist: true,
                        })
                      }
                    />
                  </td>
                  <td>
                    <input
                      className='perso-field-input'
                      type='text'
                      value={toInputValue(resource.name, resource.code)}
                      onChange={(event) =>
                        updateResource(index, "name", event.target.value, {
                          persist: false,
                        })
                      }
                      onBlur={(event) =>
                        updateResource(index, "name", event.target.value, {
                          persist: true,
                        })
                      }
                    />
                  </td>
                  <td>
                    <button
                      className='btn-del'
                      type='button'
                      onClick={() => removeResource(index)}
                      disabled={!deleteGuard.canDelete}
                      title={deleteGuard.reason}
                      style={{
                        opacity: deleteGuard.canDelete ? 1 : 0.5,
                        cursor: deleteGuard.canDelete
                          ? "pointer"
                          : "not-allowed",
                      }}
                    >
                      Supprimer
                    </button>
                    {!deleteGuard.canDelete ? (
                      <div
                        className='info-text'
                        style={{ marginTop: "0.35rem", fontSize: "0.75rem" }}
                      >
                        {deleteGuard.reason}
                      </div>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <button className='btn-add' type='button' onClick={addResource}>
        + Ajouter une ressource
      </button>
    </div>
  );
}

export default ResourcesPage;
