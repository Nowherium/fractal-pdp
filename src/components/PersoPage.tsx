import type {
  Arme,
  Group,
  Outil,
  Perso,
  PersoArme,
  PersoOutil,
  PersoResource,
  PersoSac,
  Resource,
  Sac,
} from "../types";
import { sortResources } from "../utils/resourceOrder";

const persoFields: Array<{
  key: string;
  label: string;
  type: "text" | "number";
  step?: string;
}> = [
  { key: "nom", label: "Nom", type: "text" },
  { key: "pvmax", label: "PV max", type: "number", step: "1" },
  { key: "pv", label: "PV actuels", type: "number", step: "1" },
  { key: "capEau", label: "Capacité Eau", type: "number" },
  { key: "capNrt", label: "Capacité Nrt", type: "number" },
  { key: "capMed", label: "Capacité Med", type: "number" },
  { key: "capMat", label: "Capacité Mat", type: "number" },
  { key: "capart", label: "Capacité Art", type: "number" },
  { key: "cmd", label: "CMD", type: "number", step: "1" },
  { key: "combat", label: "Combat", type: "number", step: "1" },
  { key: "poidsMax", label: "Poids max", type: "number", step: "0.1" },
  { key: "groupId", label: "Groupe", type: "number", step: "1" },
];

const capacityStep = (value: unknown) => {
  const numericValue = Number(value);
  if (Number.isNaN(numericValue)) return "0.1";
  if (numericValue < 4) return "0.1";
  if (numericValue <= 6) return "0.05";
  return "0.01";
};

const shouldUseIncrementStep = (fieldKey: string) =>
  fieldKey.startsWith("cap") || fieldKey === "cmd" || fieldKey === "combat";

const specialiteLabels: Record<string, string> = {
  eau: "💧 Eau",
  nrt: "🍗 Nrt",
  mat: "🧱 Mat",
  art: "🎭 Art",
};

const getResourceDisplayName = (resource?: Resource | null) =>
  resource?.name || resource?.code?.toUpperCase() || "Ressource";

const toInputValue = (value: unknown, fallback: string | number = "") =>
  typeof value === "string" || typeof value === "number" ? value : fallback;

function PersoPage({
  perso,
  resources,
  groups,
  armes,
  persoArmes,
  outils,
  persoOutils,
  sacs,
  persoSacs,
  persoResources,
  handlePersoUpdate,
  handlePersoResourceUpdate,
  handlePersoWeaponsUpdate,
  handlePersoToolsUpdate,
  handlePersoBagsUpdate,
  closePage,
}: {
  perso?: Perso;
  resources: Resource[];
  groups: Group[];
  armes: Arme[];
  persoArmes: PersoArme[];
  outils: Outil[];
  persoOutils: PersoOutil[];
  sacs: Sac[];
  persoSacs: PersoSac[];
  persoResources: PersoResource[];
  handlePersoUpdate: (
    persoId: number,
    field: string,
    rawValue: string | number | boolean | null,
    options?: { persist?: boolean },
  ) => void;
  handlePersoResourceUpdate: (
    persoId: number,
    resourceId: number,
    rawValue: string | number,
  ) => void;
  handlePersoWeaponsUpdate: (
    persoId: number,
    carriedWeaponIds: number[],
    equippedWeaponId: number | null,
  ) => void;
  handlePersoToolsUpdate: (persoId: number, carriedToolIds: number[]) => void;
  handlePersoBagsUpdate: (
    persoId: number,
    carriedBagIds: number[],
    equippedBagId: number | null,
  ) => void;
  closePage: () => void;
}) {
  if (!perso) {
    return (
      <div className='panel'>
        <button type='button' onClick={closePage}>
          ← Retour à l'Effectif
        </button>
        <h2>Personnage introuvable</h2>
        <p>Ce personnage a probablement été supprimé ou n'existe plus.</p>
      </div>
    );
  }

  const orderedResources = sortResources(resources);

  const carriedWeaponIds = persoArmes
    .filter((entry) => entry.perso_id === perso.id)
    .map((entry) => entry.arme_id);
  const equippedWeaponId =
    persoArmes.find((entry) => entry.perso_id === perso.id && entry.equipee)
      ?.arme_id ?? null;
  const carriedToolIds = persoOutils
    .filter((entry) => entry.perso_id === perso.id)
    .map((entry) => entry.outil_id);
  const carriedBagIds = persoSacs
    .filter((entry) => entry.perso_id === perso.id)
    .map((entry) => entry.sac_id);
  const carriedResourceQuantities = new Map<number, number>(
    persoResources
      .filter((entry) => entry.perso_id === perso.id)
      .map((entry) => [entry.resource_id, Number(entry.quantity ?? 0)]),
  );
  const equippedBagId =
    persoSacs.find((entry) => entry.perso_id === perso.id && entry.equipe)
      ?.sac_id ?? null;
  const equippedBag = sacs.find((sac) => sac.id === equippedBagId) ?? null;
  const effectiveWeightLimit = Number(
    perso.poidsMaxEffectif ?? perso.poidsMax ?? 20,
  );
  const isOverweight = Number(perso.poidsTotal ?? 0) > effectiveWeightLimit;

  const toggleWeapon = (weaponId: number, checked: boolean) => {
    const nextCarriedWeaponIds = checked
      ? [...carriedWeaponIds, weaponId]
      : carriedWeaponIds.filter((id) => id !== weaponId);

    const nextEquippedWeaponId =
      !checked && equippedWeaponId === weaponId ? null : equippedWeaponId;

    handlePersoWeaponsUpdate(
      perso.id,
      nextCarriedWeaponIds,
      nextEquippedWeaponId,
    );
  };

  const toggleTool = (toolId: number, checked: boolean) => {
    const nextCarriedToolIds = checked
      ? [...carriedToolIds, toolId]
      : carriedToolIds.filter((id) => id !== toolId);

    handlePersoToolsUpdate(perso.id, nextCarriedToolIds);
  };

  const toggleBag = (bagId: number, checked: boolean) => {
    const nextCarriedBagIds = checked
      ? [...carriedBagIds, bagId]
      : carriedBagIds.filter((id) => id !== bagId);

    const nextEquippedBagId =
      !checked && equippedBagId === bagId ? null : equippedBagId;

    handlePersoBagsUpdate(perso.id, nextCarriedBagIds, nextEquippedBagId);
  };

  return (
    <div className='panel'>
      <button type='button' onClick={closePage}>
        ← Retour à l'Effectif
      </button>
      <h2>Modifier {perso.nom || "le personnage"}</h2>
      <p className='info-text'>
        Poids total porté :{" "}
        <strong className={isOverweight ? "danger" : undefined}>
          {Number(perso.poidsTotal ?? 0).toFixed(2)} /{" "}
          {effectiveWeightLimit.toFixed(2)}
        </strong>
        {equippedBag
          ? ` — sac équipé : ${equippedBag.name} (+${Number(equippedBag.capacite ?? 0).toFixed(2)})`
          : ""}
        {isOverweight ? " — surcharge, déplacement impossible" : ""}
      </p>
      <div className='perso-form'>
        {persoFields.map((field) => {
          const value = perso[field.key];
          const step = shouldUseIncrementStep(field.key)
            ? capacityStep(value)
            : field.step;

          return (
            <label key={field.key} className='perso-field'>
              <span className='perso-field-label'>{field.label}</span>
              <input
                className='perso-field-input'
                type={field.type}
                step={step}
                min={
                  field.key === "pv" ||
                  field.key === "pvmax" ||
                  field.key === "poidsMax"
                    ? 0
                    : undefined
                }
                value={toInputValue(value)}
                onChange={(event) =>
                  handlePersoUpdate(
                    perso.id,
                    field.key,
                    event.target.value,
                    field.type === "text" ? { persist: false } : undefined,
                  )
                }
                onBlur={
                  field.type === "text"
                    ? (event) =>
                        handlePersoUpdate(
                          perso.id,
                          field.key,
                          event.target.value,
                          { persist: true },
                        )
                    : undefined
                }
              />
            </label>
          );
        })}
        <label className='perso-field'>
          <span className='perso-field-label'>Groupe</span>
          <select
            className='perso-field-input'
            value={perso.groupId ?? ""}
            onChange={(event) =>
              handlePersoUpdate(
                perso.id,
                "groupId",
                event.target.value === "" ? null : Number(event.target.value),
              )
            }
          >
            <option value=''>Aucun</option>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className='perso-form-section'>
        <h3>Ressources portées</h3>
        <p className='info-text'>
          Chaque ressource portée ajoute son équivalent en poids, sauf `crd` qui
          a un poids nul : 1 ressource = 1 de poids, 0,1 ressource = 0,1 de
          poids, mais `crd` = 0.
        </p>

        {resources.length === 0 ? (
          <p>Aucune ressource disponible pour le moment.</p>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: "12px",
            }}
          >
            {orderedResources.map((resource) => (
              <label key={resource.id} className='perso-field'>
                <span className='perso-field-label'>
                  {resource.code?.toUpperCase() || "Ressource"}
                  <span
                    title={getResourceDisplayName(resource)}
                    aria-label={`Nom complet: ${getResourceDisplayName(resource)}`}
                    style={{
                      display: "inline-block",
                      marginLeft: "0.25rem",
                      width: "1.1rem",
                      height: "1.1rem",
                      lineHeight: "1.1rem",
                      textAlign: "center",
                      fontSize: "0.85rem",
                      cursor: "help",
                    }}
                  >
                    ❔
                  </span>
                </span>
                <input
                  className='perso-field-input'
                  type='number'
                  step='0.1'
                  min='0'
                  value={carriedResourceQuantities.get(resource.id) ?? 0}
                  onChange={(event) =>
                    handlePersoResourceUpdate(
                      perso.id,
                      resource.id,
                      event.target.value,
                    )
                  }
                />
              </label>
            ))}
          </div>
        )}
      </div>

      <div className='perso-form-section'>
        <h3>Armes portées</h3>
        <p className='info-text'>
          Sélectionne les armes portées par ce perso, puis choisis laquelle est
          équipée.
        </p>

        {armes.length === 0 ? (
          <p>Aucune arme disponible pour le moment.</p>
        ) : (
          <>
            <div className='group-members-list'>
              {armes.map((arme) => {
                const isCarried = carriedWeaponIds.includes(arme.id);
                const maxQuantity = Math.max(
                  0,
                  Math.floor(Number(arme.quantity ?? 1) || 0),
                );
                const assignedCount = persoArmes.filter(
                  (entry) => entry.arme_id === arme.id,
                ).length;
                const isUnavailable =
                  !isCarried && assignedCount >= maxQuantity;

                return (
                  <label key={arme.id} className='group-member-item'>
                    <input
                      type='checkbox'
                      checked={isCarried}
                      disabled={isUnavailable}
                      onChange={(event) =>
                        toggleWeapon(arme.id, event.target.checked)
                      }
                    />
                    <span>
                      {arme.name} (x{arme.att} att, dégâts {arme.degats}) •{" "}
                      {assignedCount}/{maxQuantity} attribuée(s)
                      {isUnavailable ? " — indisponible" : ""}
                    </span>
                  </label>
                );
              })}
            </div>

            <label className='perso-field'>
              <span className='perso-field-label'>Arme équipée</span>
              <select
                className='perso-field-input'
                value={equippedWeaponId ?? ""}
                onChange={(event) =>
                  handlePersoWeaponsUpdate(
                    perso.id,
                    carriedWeaponIds,
                    event.target.value === ""
                      ? null
                      : Number(event.target.value),
                  )
                }
              >
                <option value=''>Aucune</option>
                {armes
                  .filter((arme) => carriedWeaponIds.includes(arme.id))
                  .map((arme) => (
                    <option key={arme.id} value={arme.id}>
                      {arme.name} (x{arme.att})
                    </option>
                  ))}
              </select>
            </label>
          </>
        )}
      </div>

      <div className='perso-form-section'>
        <h3>Sacs portés</h3>
        <p className='info-text'>
          Un perso peut porter plusieurs sacs. Un seul sac équipé ajoute sa
          capacité au poids max, mais le poids de tous les sacs portés compte
          dans le poids total, équipés ou non.
        </p>

        {sacs.length === 0 ? (
          <p>Aucun sac disponible pour le moment.</p>
        ) : (
          <>
            <div className='group-members-list'>
              {sacs.map((sac) => {
                const isCarried = carriedBagIds.includes(sac.id);
                const maxQuantity = Math.max(
                  0,
                  Math.floor(Number(sac.quantity ?? 1) || 0),
                );
                const assignedCount = persoSacs.filter(
                  (entry) => entry.sac_id === sac.id,
                ).length;
                const isUnavailable =
                  !isCarried && assignedCount >= maxQuantity;

                return (
                  <label key={sac.id} className='group-member-item'>
                    <input
                      type='checkbox'
                      checked={isCarried}
                      disabled={isUnavailable}
                      onChange={(event) =>
                        toggleBag(sac.id, event.target.checked)
                      }
                    />
                    <span>
                      {sac.name} (+{sac.capacite} capacité, poids {sac.poids}) •{" "}
                      {assignedCount}/{maxQuantity} attribué(s)
                      {isUnavailable ? " — indisponible" : ""}
                    </span>
                  </label>
                );
              })}
            </div>

            <label className='perso-field'>
              <span className='perso-field-label'>Sac équipé</span>
              <select
                className='perso-field-input'
                value={equippedBagId ?? ""}
                onChange={(event) =>
                  handlePersoBagsUpdate(
                    perso.id,
                    carriedBagIds,
                    event.target.value === ""
                      ? null
                      : Number(event.target.value),
                  )
                }
              >
                <option value=''>Aucun</option>
                {sacs
                  .filter((sac) => carriedBagIds.includes(sac.id))
                  .map((sac) => (
                    <option key={sac.id} value={sac.id}>
                      {sac.name} (+{sac.capacite})
                    </option>
                  ))}
              </select>
            </label>
          </>
        )}
      </div>

      <div className='perso-form-section'>
        <h3>Outils portés</h3>
        <p className='info-text'>
          Les bonus des outils s'appliquent automatiquement dès qu'ils sont
          portés par le personnage.
        </p>

        {outils.length === 0 ? (
          <p>Aucun outil disponible pour le moment.</p>
        ) : (
          <div className='group-members-list'>
            {outils.map((outil) => {
              const isCarried = carriedToolIds.includes(outil.id);
              const maxQuantity = Math.max(
                0,
                Math.floor(Number(outil.quantity ?? 1) || 0),
              );
              const assignedCount = persoOutils.filter(
                (entry) => entry.outil_id === outil.id,
              ).length;
              const isUnavailable = !isCarried && assignedCount >= maxQuantity;

              return (
                <label key={outil.id} className='group-member-item'>
                  <input
                    type='checkbox'
                    checked={isCarried}
                    disabled={isUnavailable}
                    onChange={(event) =>
                      toggleTool(outil.id, event.target.checked)
                    }
                  />
                  <span>
                    {outil.name} (x{outil.bonus}{" "}
                    {specialiteLabels[outil.specialite ?? "eau"] ||
                      outil.specialite ||
                      "eau"}
                    ) • {assignedCount}/{maxQuantity} attribué(s)
                    {isUnavailable ? " — indisponible" : ""}
                  </span>
                </label>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default PersoPage;
