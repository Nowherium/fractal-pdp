import AssignmentChecklist from "./shared/AssignmentChecklist";
import OptionalItemSelect from "./shared/OptionalItemSelect";
import Button from "./ui/Button";
import Field from "./ui/Field";
import InfoText from "./ui/InfoText";
import Panel from "./ui/Panel";

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
import {
  formControlClassName,
  getIncrementStep,
  toFormInputValue,
} from "../utils/formUtils";
import { sortResources } from "../utils/resourceOrder";
import { isPersoCadavre } from "../utils/groupUtils";
import { normalizeStockQuantity } from "../utils/stateUtils";
import { toolSpecialiteLabels } from "../utils/toolUtils";

const persoFields: Array<{
  key: string;
  label: string;
  type: "number";
  step?: string;
}> = [
  { key: "capNrt", label: "Capacité Nrt", type: "number" },
  { key: "capEau", label: "Capacité Eau", type: "number" },
  { key: "capMed", label: "Capacité Med", type: "number" },
  { key: "capMat", label: "Capacité Mat", type: "number" },
  { key: "capArt", label: "Capacité Art", type: "number" },
  { key: "cmd", label: "CMD", type: "number", step: "0.1" },
  { key: "combat", label: "Combat", type: "number", step: "0.1" },
];

const shouldUseIncrementStep = (fieldKey: string) => fieldKey !== "poidsMax";

const getNumericFieldStep = (
  fieldKey: string,
  value: unknown,
  fallbackStep?: string,
) =>
  shouldUseIncrementStep(fieldKey) ? getIncrementStep(value) : fallbackStep;

const getResourceDisplayName = (resource?: Resource | null) =>
  resource?.name || resource?.code?.toUpperCase() || "Ressource";

const toggleIdInList = (ids: number[], itemId: number, checked: boolean) =>
  checked ? [...ids, itemId] : ids.filter((id) => id !== itemId);

const getAssignmentAvailability = (
  quantity: unknown,
  assignedCount: number,
  isCarried: boolean,
) => {
  const maxQuantity = Math.max(0, Math.floor(Number(quantity ?? 1) || 0));

  return {
    maxQuantity,
    isUnavailable: !isCarried && assignedCount >= maxQuantity,
  };
};

const formGridClassName =
  "mt-4 grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4";
const sectionClassName = "mt-6 space-y-2.5";

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
  perso?: Perso | undefined;
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
      <Panel>
        <Button className='mt-0' variant='muted' onClick={closePage}>
          ← Retour à l'Effectif
        </Button>
        <h2>Personnage introuvable</h2>
        <p>Ce personnage a probablement été supprimé ou n'existe plus.</p>
      </Panel>
    );
  }

  const orderedResources = sortResources(resources);
  const isCadavre = isPersoCadavre(perso);

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
  const totalWeight = Number(perso.poidsTotal ?? 0);
  const baseWeightLimit = Number(perso.poidsMax ?? 20);
  const effectiveWeightLimit = Number(
    perso.poidsMaxEffectif ?? baseWeightLimit,
  );
  const deltaWeightLimit = effectiveWeightLimit - totalWeight;
  const isOverweight = Number(totalWeight ?? 0) > effectiveWeightLimit;

  const toggleWeapon = (weaponId: number, checked: boolean) => {
    const nextCarriedWeaponIds = toggleIdInList(
      carriedWeaponIds,
      weaponId,
      checked,
    );

    const nextEquippedWeaponId =
      !checked && equippedWeaponId === weaponId ? null : equippedWeaponId;

    handlePersoWeaponsUpdate(
      perso.id,
      nextCarriedWeaponIds,
      nextEquippedWeaponId,
    );
  };

  const toggleTool = (toolId: number, checked: boolean) => {
    const nextCarriedToolIds = toggleIdInList(carriedToolIds, toolId, checked);

    handlePersoToolsUpdate(perso.id, nextCarriedToolIds);
  };

  const toggleBag = (bagId: number, checked: boolean) => {
    const nextCarriedBagIds = toggleIdInList(carriedBagIds, bagId, checked);

    const nextEquippedBagId =
      !checked && equippedBagId === bagId ? null : equippedBagId;

    handlePersoBagsUpdate(perso.id, nextCarriedBagIds, nextEquippedBagId);
  };

  const weaponAssignmentItems = armes.map((arme) => {
    const isCarried = carriedWeaponIds.includes(arme.id);
    const assignedCount = persoArmes.filter(
      (entry) => entry.arme_id === arme.id,
    ).length;
    const { maxQuantity, isUnavailable } = getAssignmentAvailability(
      arme.quantity,
      assignedCount,
      isCarried,
    );

    return {
      id: arme.id,
      checked: isCarried,
      disabled: isUnavailable,
      label: `${arme.name} (x${arme.att} att, dégâts ${arme.degats}) • ${assignedCount}/${maxQuantity} attribuée(s)${isUnavailable ? " — indisponible" : ""}`,
    };
  });

  const carriedWeaponOptions = armes
    .filter((arme) => carriedWeaponIds.includes(arme.id))
    .map((arme) => ({
      value: arme.id,
      label: `${arme.name} (x${arme.att})`,
    }));

  const bagAssignmentItems = sacs.map((sac) => {
    const isCarried = carriedBagIds.includes(sac.id);
    const assignedCount = persoSacs.filter(
      (entry) => entry.sac_id === sac.id,
    ).length;
    const { maxQuantity, isUnavailable } = getAssignmentAvailability(
      sac.quantity,
      assignedCount,
      isCarried,
    );

    return {
      id: sac.id,
      checked: isCarried,
      disabled: isUnavailable,
      label: `${sac.name} (+${sac.capacite} capacité, poids ${sac.poids}) • ${assignedCount}/${maxQuantity} attribué(s)${isUnavailable ? " — indisponible" : ""}`,
    };
  });

  const carriedBagOptions = sacs
    .filter((sac) => carriedBagIds.includes(sac.id))
    .map((sac) => ({
      value: sac.id,
      label: `${sac.name} (+${sac.capacite})`,
    }));

  const toolAssignmentItems = outils.map((outil) => {
    const isCarried = carriedToolIds.includes(outil.id);
    const assignedCount = persoOutils.filter(
      (entry) => entry.outil_id === outil.id,
    ).length;
    const { maxQuantity, isUnavailable } = getAssignmentAvailability(
      outil.quantity,
      assignedCount,
      isCarried,
    );

    return {
      id: outil.id,
      checked: isCarried,
      disabled: isUnavailable,
      label: `${outil.name} (x${outil.bonus} ${toolSpecialiteLabels[outil.specialite ?? "eau"] || outil.specialite || "eau"}) • ${assignedCount}/${maxQuantity} attribué(s)${isUnavailable ? " — indisponible" : ""}`,
    };
  });

  return (
    <Panel>
      <Button className='mt-0' variant='muted' onClick={closePage}>
        ← Retour à l'Effectif
      </Button>
      <h2>Modifier {perso.nom || "le personnage"}</h2>
      {isCadavre ? (
        <InfoText className='font-semibold not-italic text-accent-red'>
          ☠️ Statut : cadavre — ce personnage est hors d’état tant que ses PV
          restent à 0.
        </InfoText>
      ) : null}
      <InfoText>
        Poids total porté :{" "}
        <strong
          className={isOverweight ? "font-bold text-accent-red" : undefined}
        >
          {Number(perso.poidsTotal ?? 0).toFixed(2)} /{" "}
          {effectiveWeightLimit.toFixed(2)}
        </strong>
        {equippedBag
          ? ` — sac équipé : ${equippedBag.name} (+${Number(equippedBag.capacite ?? 0).toFixed(2)})`
          : ""}
        {isOverweight ? " — surcharge, déplacement impossible" : ""}
      </InfoText>
      <div className={formGridClassName}>
        <Field label='Nom'>
          <input
            className={formControlClassName}
            type='text'
            value={toFormInputValue(perso.nom)}
            onChange={(event) =>
              handlePersoUpdate(perso.id, "nom", event.target.value, {
                persist: false,
              })
            }
            onBlur={(event) =>
              handlePersoUpdate(perso.id, "nom", event.target.value, {
                persist: true,
              })
            }
          />
        </Field>

        <Field label='PV / PV max'>
          <div className='grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-end gap-2'>
            <div className='flex min-w-0 flex-col gap-1'>
              <span className='text-[0.78rem] text-[#9ea7b3]'>Actuels</span>
              <input
                className={`${formControlClassName} text-right`}
                type='number'
                min='0'
                step={getNumericFieldStep("pv", perso.pv, "1")}
                value={toFormInputValue(perso.pv)}
                onChange={(event) =>
                  handlePersoUpdate(perso.id, "pv", event.target.value)
                }
              />
            </div>
            <span className='pb-2 text-sm font-semibold text-[#9ea7b3]'>/</span>
            <div className='flex min-w-0 flex-col gap-1'>
              <span className='text-[0.78rem] text-[#9ea7b3]'>Max</span>
              <input
                className={`${formControlClassName} text-right`}
                type='number'
                min='0'
                step={getNumericFieldStep("pvmax", perso.pvmax, "1")}
                value={toFormInputValue(perso.pvmax)}
                onChange={(event) =>
                  handlePersoUpdate(perso.id, "pvmax", event.target.value)
                }
              />
            </div>
          </div>
        </Field>

        {persoFields.map((field) => {
          const value = perso[field.key];
          const step = getNumericFieldStep(field.key, value, field.step);

          return (
            <Field key={field.key} label={field.label}>
              <input
                className={`${formControlClassName} text-right`}
                type={field.type}
                step={step}
                value={toFormInputValue(value)}
                onChange={(event) =>
                  handlePersoUpdate(perso.id, field.key, event.target.value)
                }
              />
            </Field>
          );
        })}

        <Field label='Poids max'>
          <div className={`text-[#9ea7b3]`} aria-readonly='true'>
            {totalWeight} / {effectiveWeightLimit} (
            {deltaWeightLimit.toFixed(2)}{" "}
            {deltaWeightLimit >= 0 ? `libre` : `en trop`})
          </div>
        </Field>

        <Field label='Groupe'>
          <select
            className={formControlClassName}
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
        </Field>

        <Field label='Statut spécial'>
          <label className='mt-2 flex cursor-pointer items-center gap-2'>
            <input
              type='checkbox'
              className='h-4 w-4 accent-green-500'
              checked={!!perso.esclave}
              onChange={(event) =>
                handlePersoUpdate(perso.id, "esclave", event.target.checked, {
                  persist: true,
                })
              }
            />
            <span className='text-sm text-[#f1f1f1]'>
              Ce personnage est un esclave
            </span>
          </label>
        </Field>
      </div>

      <div className={sectionClassName}>
        <h3>Ressources portées</h3>
        <InfoText>
          Chaque ressource portée ajoute son équivalent en poids, sauf `crd` qui
          a un poids nul : 1 ressource = 1 de poids, 0,1 ressource = 0,1 de
          poids, mais `crd` = 0.
        </InfoText>

        {resources.length === 0 ? (
          <p>Aucune ressource disponible pour le moment.</p>
        ) : (
          <div className='grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3'>
            {orderedResources.map((resource) => (
              <Field
                key={resource.id}
                className='min-w-0'
                label={
                  <>
                    {resource.code?.toUpperCase() || "Ressource"}
                    <span
                      title={getResourceDisplayName(resource)}
                      aria-label={`Nom complet: ${getResourceDisplayName(resource)}`}
                      className='ml-1 inline-block h-[1.1rem] w-[1.1rem] cursor-help text-center text-[0.85rem] leading-[1.1rem]'
                    >
                      ❔
                    </span>
                  </>
                }
              >
                <input
                  className={`${formControlClassName} text-right`}
                  type='number'
                  step='0.1'
                  min='0'
                  value={normalizeStockQuantity(
                    carriedResourceQuantities.get(resource.id) ?? 0,
                  )}
                  onChange={(event) =>
                    handlePersoResourceUpdate(
                      perso.id,
                      resource.id,
                      event.target.value,
                    )
                  }
                />
              </Field>
            ))}
          </div>
        )}
      </div>

      <div className={sectionClassName}>
        <h3>Armes portées</h3>
        <InfoText>
          Sélectionne les armes portées par ce perso, puis choisis laquelle est
          équipée.
        </InfoText>

        {armes.length === 0 ? (
          <p>Aucune arme disponible pour le moment.</p>
        ) : (
          <>
            <AssignmentChecklist
              items={weaponAssignmentItems}
              onToggle={toggleWeapon}
            />
            <OptionalItemSelect
              label='Arme équipée'
              value={equippedWeaponId ?? ""}
              options={carriedWeaponOptions}
              noneLabel='Aucune'
              onChange={(nextWeaponId) =>
                handlePersoWeaponsUpdate(
                  perso.id,
                  carriedWeaponIds,
                  nextWeaponId,
                )
              }
            />
          </>
        )}
      </div>

      <div className={sectionClassName}>
        <h3>Sacs portés</h3>
        <InfoText>
          Un perso peut porter plusieurs sacs. Un seul sac équipé ajoute sa
          capacité au poids max, mais le poids de tous les sacs portés compte
          dans le poids total, équipés ou non.
        </InfoText>

        {sacs.length === 0 ? (
          <p>Aucun sac disponible pour le moment.</p>
        ) : (
          <>
            <AssignmentChecklist
              items={bagAssignmentItems}
              onToggle={toggleBag}
            />
            <OptionalItemSelect
              label='Sac équipé'
              value={equippedBagId ?? ""}
              options={carriedBagOptions}
              noneLabel='Aucun'
              onChange={(nextBagId) =>
                handlePersoBagsUpdate(perso.id, carriedBagIds, nextBagId)
              }
            />
          </>
        )}
      </div>

      <div className={sectionClassName}>
        <h3>Outils portés</h3>
        <InfoText>
          Les bonus des outils s'appliquent automatiquement dès qu'ils sont
          portés par le personnage.
        </InfoText>

        {outils.length === 0 ? (
          <p>Aucun outil disponible pour le moment.</p>
        ) : (
          <AssignmentChecklist
            items={toolAssignmentItems}
            onToggle={toggleTool}
          />
        )}
      </div>
    </Panel>
  );
}

export default PersoPage;
