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
const fieldInputClassName =
  "w-full rounded-lg border border-border-strong bg-[#111] px-3 py-2.5 text-left text-[#f1f1f1]";
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
      label: `${outil.name} (x${outil.bonus} ${specialiteLabels[outil.specialite ?? "eau"] || outil.specialite || "eau"}) • ${assignedCount}/${maxQuantity} attribué(s)${isUnavailable ? " — indisponible" : ""}`,
    };
  });

  return (
    <Panel>
      <Button className='mt-0' variant='muted' onClick={closePage}>
        ← Retour à l'Effectif
      </Button>
      <h2>Modifier {perso.nom || "le personnage"}</h2>
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
        {persoFields.map((field) => {
          const value = perso[field.key];
          const step = shouldUseIncrementStep(field.key)
            ? capacityStep(value)
            : field.step;

          return (
            <Field key={field.key} label={field.label}>
              <input
                className={`${fieldInputClassName} ${field.type === "number" ? "text-right" : ""}`}
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
            </Field>
          );
        })}
        <Field label='Groupe'>
          <select
            className={fieldInputClassName}
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
                  className={`${fieldInputClassName} text-right`}
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
