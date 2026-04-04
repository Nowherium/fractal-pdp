import type { Resource } from "../types";
import { confirmAction } from "../utils/confirmAction";
import { formControlClassName, toFormInputValue } from "../utils/formUtils";
import { compareResources } from "../utils/resourceOrder";
import Button from "./ui/Button";
import InfoText from "./ui/InfoText";
import Panel from "./ui/Panel";

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
    <Panel>
      <h2>8. Administration des ressources</h2>
      <InfoText>
        Gère ici la table `resources` : code interne + nom affiché.
        <br />
        Les quantités de stock restent éditables dans la page Réserve centrale.
        <br />
        La suppression est bloquée si la ressource est protégée, encore stockée,
        portée, ou planifiée comme drogue.
      </InfoText>

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
                      className={formControlClassName}
                      type='text'
                      value={toFormInputValue(resource.code)}
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
                      className={formControlClassName}
                      type='text'
                      value={toFormInputValue(resource.name, resource.code)}
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
                    <Button
                      className='mt-0'
                      size='sm'
                      variant='danger'
                      onClick={() =>
                        confirmAction(
                          `Supprimer la ressource ${resource.name || resource.code?.toUpperCase() || "sélectionnée"} ?`,
                          () => removeResource(index),
                        )
                      }
                      disabled={!deleteGuard.canDelete}
                      title={deleteGuard.reason}
                    >
                      Supprimer
                    </Button>
                    {!deleteGuard.canDelete ? (
                      <InfoText className='mt-[0.35rem] text-[0.75rem] [margin-bottom:0]'>
                        {deleteGuard.reason}
                      </InfoText>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <Button className='mt-3' variant='success' onClick={addResource}>
        + Ajouter une ressource
      </Button>
    </Panel>
  );
}

export default ResourcesPage;
