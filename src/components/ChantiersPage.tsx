import type {
  ConstructionProgressById,
  LuneConstruction,
  Resource,
} from "../types";
import { confirmAction } from "../utils/confirmAction";
import type { ConstructionState } from "../utils/timelineTypes";
import Button from "./ui/Button";
import InfoText from "./ui/InfoText";
import Panel from "./ui/Panel";

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
  if (status === "done" || state?.isCompleted) return "text-accent-green";
  if (status === "in-progress") return "text-accent-yellow";
  return "text-accent-blue";
};

const inputClassName =
  "w-full rounded-lg border border-border-strong bg-[#111] px-3 py-2.5 text-left text-[#f1f1f1]";
const numberInputClassName = `${inputClassName} text-right`;

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
    <Panel>
      <h2>4. Administration des chantiers</h2>
      <InfoText>
        Les chantiers sont définis ici une seule fois. Ici,
        <strong> À faire</strong> signifie <strong>posé nulle part</strong>,
        <strong> En cours</strong> pose le chantier à partir de la
        <strong> lune courante</strong>, et <strong>Terminé</strong> le masque
        des lunes suivantes jusqu’à réouverture.
      </InfoText>

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
                      className={inputClassName}
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
                      className={inputClassName}
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
                      className={numberInputClassName}
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
                      className={numberInputClassName}
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
                      className={inputClassName}
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
                      className={inputClassName}
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
                      className={`mt-1.5 font-bold ${getStatusClassName(
                        state,
                        progress?.status ?? construction.status,
                      )}`}
                    >
                      {getStatusLabel(
                        state,
                        progress?.status ?? construction.status,
                      )}
                    </div>
                    <InfoText className='mb-0 mt-1'>
                      {state?.statusLabel || "Appliqué à la timeline."}
                    </InfoText>
                  </td>
                  <td>
                    <Button
                      className='mt-0'
                      size='sm'
                      variant='danger'
                      onClick={() =>
                        confirmAction(
                          `Supprimer le chantier ${construction.name || "sélectionné"} ?`,
                          () => removeConstruction(construction.id),
                        )
                      }
                    >
                      Supprimer
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <Button className='mt-3' variant='success' onClick={addConstruction}>
        + Ajouter un chantier
      </Button>
    </Panel>
  );
}

export default ChantiersPage;
