import { useState } from "react";

import Button from "./ui/Button";
import InfoText from "./ui/InfoText";
import Panel from "./ui/Panel";
import Toggle from "./ui/Toggle";

import type { Perso, PersoResource, Resource } from "../types";
import { confirmAction } from "../utils/confirmAction";
import { normalizeStockQuantity } from "../utils/stateUtils";
import {
  getPersoRawCapacityValue,
  getPersoRawCombatValue,
  getPersoWeightLimit,
  getPersoWeightValue,
  isPersoCadavre,
  isPersoOverweight,
} from "../utils/groupUtils";

const formatCombat = (value: number | string | null | undefined) => {
  const numericValue = Number(value ?? 0);
  return Number.isInteger(numericValue)
    ? numericValue
    : numericValue.toFixed(2);
};

const highlightCellClassName = "bg-[#2a2a2a]";
const headerHintClassName = "text-[0.7em] text-[#4caf50]";
const actionGroupClassName = "flex flex-wrap gap-2";
const quickEditResourceCodes = new Set(["eau", "nrt", "med"]);

const normalizeResourceCode = (value: string | null | undefined) =>
  String(value ?? "")
    .trim()
    .toLowerCase();

const capacityFields = [
  { key: "nrt", label: "🍗 Nrt" },
  { key: "eau", label: "💧 Eau" },
  { key: "med", label: "💊 Med" },
  { key: "mat", label: "🧱 Mat" },
  { key: "art", label: "🎭 Art" },
] as const;

const carriedResourceFields = [
  { key: "nrt", label: "🍗 Nrt" },
  { key: "eau", label: "💧 Eau" },
  { key: "med", label: "💊 Med" },
  { key: "mat", label: "🧱 Mat" },
] as const;

function EffectifPage({
  persos,
  resources,
  persoResources,
  removePerso,
  addPerso,
  openPersoPage,
  updatePersoPresence,
  handlePersoResourceUpdate,
  showStocks: controlledShowStocks,
  setShowStocks,
  defaultShowStocks = false,
}: {
  persos: Perso[];
  resources: Resource[];
  persoResources: PersoResource[];
  removePerso: (index: number) => void;
  addPerso: () => void;
  openPersoPage: (persoId: number) => void;
  updatePersoPresence: (persoId: number, isPresent: boolean) => void;
  handlePersoResourceUpdate: (
    persoId: number,
    resourceId: number,
    rawValue: string | number,
  ) => void;
  showStocks?: boolean;
  setShowStocks?: (checked: boolean) => void;
  defaultShowStocks?: boolean;
}) {
  const [localShowStocks, setLocalShowStocks] = useState(defaultShowStocks);
  const showStocks = controlledShowStocks ?? localShowStocks;

  const handleShowStocksChange = (checked: boolean) => {
    setShowStocks?.(checked);

    if (controlledShowStocks === undefined) {
      setLocalShowStocks(checked);
    }
  };
  const resourceIdByCode = new Map(
    resources.map((resource) => [
      normalizeResourceCode(resource.code),
      Number(resource.id),
    ]),
  );
  const resourceCodeById = new Map(
    resources.map((resource) => [
      Number(resource.id),
      normalizeResourceCode(resource.code),
    ]),
  );
  const resourceQuantityByPersoAndCode = new Map(
    persoResources.map((entry) => [
      `${Number(entry.perso_id)}-${resourceCodeById.get(Number(entry.resource_id)) ?? ""}`,
      Number(entry.quantity ?? 0),
    ]),
  );
  const presentPersoIds = new Set(
    persos
      .filter((perso) => perso.present !== false && !isPersoCadavre(perso))
      .map((perso) => Number(perso.id)),
  );
  const carriedTotals = new Map(
    carriedResourceFields.map(({ key }) => [
      key,
      normalizeStockQuantity(
        persoResources.reduce((total, entry) => {
          if (!presentPersoIds.has(Number(entry.perso_id))) {
            return total;
          }

          const resourceCode = resourceCodeById.get(Number(entry.resource_id));

          return resourceCode === key
            ? total + Number(entry.quantity ?? 0)
            : total;
        }, 0),
      ),
    ]),
  );

  return (
    <Panel>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <h2 className='mb-0'>2. L'Effectif & Potentiel de base</h2>
        <Toggle
          label='stocks'
          srLabel='Afficher les stocks'
          checked={showStocks}
          onChange={(event) => handleShowStocksChange(event.target.checked)}
        />
      </div>
      <InfoText>
        Indiquez la capacité originelle. Les colonnes affichent ici les
        <strong> caractéristiques brutes</strong> des persos. Depuis cette vue,
        vous pouvez aussi ajuster rapidement les stocks portés de
        <strong>`eau`</strong>, <strong>`nrt`</strong> et <strong>`med`</strong>
        directement dans le tableau.
      </InfoText>
      <table>
        <thead>
          <tr>
            <th>Nom</th>
            <th>PV / Max</th>
            {capacityFields.map((field) => (
              <th key={field.key} className={highlightCellClassName}>
                {field.label}
                <br />
                <span className={headerHintClassName}>
                  {quickEditResourceCodes.has(field.key) && showStocks
                    ? "Cap. + stock"
                    : "Capacité"}
                </span>
              </th>
            ))}
            <th className={highlightCellClassName}>CMD</th>
            <th className={highlightCellClassName}>Combat</th>
            <th className={highlightCellClassName}>Poids</th>
            <th className={highlightCellClassName}>Présent</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {persos.map((p, index) => {
            const isCadavre = isPersoCadavre(p);

            return (
              <tr key={p.id} className={isCadavre ? "dead" : undefined}>
                <td>
                  {p.nom}
                  {isCadavre ? (
                    <div className='inactive-note text-accent-red'>Cadavre</div>
                  ) : null}
                </td>
                <td>
                  {p.pv ?? 0} / {p.pvmax ?? 0}
                </td>
                {capacityFields.map((field) => {
                  const resourceCode = String(field.key);
                  const resourceId = resourceIdByCode.get(resourceCode);
                  const quantity = normalizeStockQuantity(
                    resourceQuantityByPersoAndCode.get(
                      `${Number(p.id)}-${resourceCode}`,
                    ) ?? 0,
                  );
                  const canQuickEdit = quickEditResourceCodes.has(resourceCode);

                  return (
                    <td key={field.key} className={highlightCellClassName}>
                      <div className='flex min-w-[72px] flex-col gap-1'>
                        <span className='font-semibold'>
                          {formatCombat(getPersoRawCapacityValue(p, field.key))}
                        </span>
                        {canQuickEdit && showStocks ? (
                          <label className='flex items-center gap-1 text-[0.72rem] text-[#9ea7b3]'>
                            <span>stk</span>
                            <input
                              type='number'
                              min='0'
                              step='0.1'
                              inputMode='numeric'
                              className='w-[52px] rounded border border-[#3a3a3a] bg-[#111] px-1 py-0.5 text-center text-[0.78rem]'
                              aria-label={`Stock ${resourceCode} de ${p.nom}`}
                              value={quantity}
                              disabled={resourceId === undefined}
                              onChange={(event) => {
                                if (resourceId === undefined) {
                                  return;
                                }

                                handlePersoResourceUpdate(
                                  p.id,
                                  resourceId,
                                  event.target.value,
                                );
                              }}
                            />
                          </label>
                        ) : null}
                      </div>
                    </td>
                  );
                })}
                <td className={highlightCellClassName}>{p.cmd}</td>
                <td className={highlightCellClassName}>
                  {formatCombat(getPersoRawCombatValue(p))}
                </td>
                <td
                  className={`${highlightCellClassName} ${isPersoOverweight(p) ? "font-bold text-accent-red" : ""}`}
                >
                  {formatCombat(getPersoWeightValue(p))} /{" "}
                  {formatCombat(getPersoWeightLimit(p))}
                </td>
                <td className={highlightCellClassName}>
                  <input
                    type='checkbox'
                    className='h-[18px] w-[18px] cursor-pointer accent-green-500'
                    checked={p.present !== false && !isCadavre}
                    aria-label={`Présence de ${p.nom}`}
                    onChange={(event) =>
                      updatePersoPresence(p.id, event.target.checked)
                    }
                  />
                </td>
                <td>
                  <div className={actionGroupClassName}>
                    <Button
                      className='mt-0'
                      size='sm'
                      onClick={() => openPersoPage(p.id)}
                    >
                      Modifier
                    </Button>
                    <Button
                      className='mt-0'
                      size='sm'
                      variant='danger'
                      onClick={() =>
                        confirmAction(
                          `Renvoyer ${p.nom || "ce personnage"} ? Cette action le supprimera définitivement.`,
                          () => removePerso(index),
                        )
                      }
                    >
                      Renvoyer
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className='mt-4 rounded-lg border border-[#2a2a2a] bg-[#151515] p-3'>
        <div className='mb-2 text-sm font-semibold text-[#d7e3f4]'>
          Porté par les présents
        </div>
        <div className='grid gap-2 sm:grid-cols-2 xl:grid-cols-4'>
          {carriedResourceFields.map((field) => (
            <div
              key={field.key}
              className='rounded-md border border-[#2f2f2f] bg-[#101010] px-3 py-2'
            >
              <div className='text-[0.72rem] uppercase tracking-[0.08em] text-[#9ea7b3]'>
                {field.label}
              </div>
              <div className='text-lg font-semibold text-[#f5f7fa]'>
                {carriedTotals.get(field.key) ?? 0}
              </div>
            </div>
          ))}
        </div>
      </div>
      <Button className='mt-3' variant='success' onClick={addPerso}>
        + Recruter un membre
      </Button>
    </Panel>
  );
}

export default EffectifPage;
