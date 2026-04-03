import type { Resource } from "../types";
import { compareResources } from "../utils/resourceOrder";

const toInputValue = (value: unknown, fallback = "") =>
  typeof value === "string" || typeof value === "number" ? value : fallback;

const panelClassName =
  "mb-5 rounded-lg border border-border-strong bg-panel p-[15px]";
const infoTextClassName = "mb-2.5 text-[0.85em] italic text-[#888]";
const inputClassName =
  "w-full rounded-lg border border-border-strong bg-[#111] px-3 py-2.5 text-left text-[#f1f1f1]";

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
    <div className={panelClassName}>
      <h2>8. Administration des ressources</h2>
      <p className={infoTextClassName}>
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
                      className={inputClassName}
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
                      className={inputClassName}
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
                      className='btn-del mt-0'
                      type='button'
                      onClick={() => removeResource(index)}
                      disabled={!deleteGuard.canDelete}
                      title={deleteGuard.reason}
                    >
                      Supprimer
                    </button>
                    {!deleteGuard.canDelete ? (
                      <div className='mt-[0.35rem] text-[0.75rem] italic text-[#888]'>
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

      <button className='btn-add mt-3' type='button' onClick={addResource}>
        + Ajouter une ressource
      </button>
    </div>
  );
}

export default ResourcesPage;
