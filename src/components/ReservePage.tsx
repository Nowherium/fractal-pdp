import Field from "./ui/Field";
import InfoText from "./ui/InfoText";
import Panel from "./ui/Panel";

import { formControlClassName } from "../utils/formUtils";

import type {
  Arme,
  CityMultipliers,
  Outil,
  PersoArme,
  PersoOutil,
  PersoSac,
  Resource,
  Sac,
  Stocks,
} from "../types";
import { sortResources } from "../utils/resourceOrder";
import { normalizeStockQuantity } from "../utils/stateUtils";

const formatWeight = (value: number | string | null | undefined) =>
  Number(value ?? 0).toFixed(2);
const getResourceUnitWeight = (resource?: Resource | null) =>
  resource?.code === "crd" ? 0 : 1;
const getResourceDisplayName = (resource?: Resource | null) =>
  resource?.name || resource?.code?.toUpperCase() || "Ressource";

const cityBonusFields: Array<{ key: keyof CityMultipliers; label: string }> = [
  { key: "eau", label: "💧 Eau" },
  { key: "nrt", label: "🍗 Nrt" },
  { key: "med", label: "💊 Med" },
  { key: "mat", label: "🧱 Mat" },
];

const cardGridClassName =
  "grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3";
const fieldInputClassName = `${formControlClassName} text-right`;

type ReserveItem = {
  id: number;
  name: string;
  quantity: number;
  poids: number;
  totalWeight: number;
};

function ReservePage({
  resources,
  stocks,
  cityMultipliers,
  handleStockChange,
  handleCityMultiplierChange,
  armes,
  persoArmes,
  outils,
  persoOutils,
  sacs,
  persoSacs,
}: {
  resources: Resource[];
  stocks: Stocks;
  cityMultipliers: CityMultipliers;
  handleStockChange: (field: string, rawValue: string | number) => void;
  handleCityMultiplierChange: (
    field: keyof CityMultipliers,
    rawValue: string | number,
  ) => void;
  armes: Arme[];
  persoArmes: PersoArme[];
  outils: Outil[];
  persoOutils: PersoOutil[];
  sacs: Sac[];
  persoSacs: PersoSac[];
}) {
  const orderedResources = sortResources(resources);

  const totalResourcesWeight = resources.reduce(
    (total, resource) =>
      total +
      Number(stocks[resource.code] ?? 0) *
        Number(getResourceUnitWeight(resource)),
    0,
  );

  const reserveArmes = armes
    .map((arme) => {
      const assignedCount = persoArmes.filter(
        (entry) => entry.arme_id === arme.id,
      ).length;
      const reserveQuantity = Math.max(
        0,
        Math.floor(Number(arme.quantity ?? 1) || 0) - assignedCount,
      );

      return {
        id: arme.id,
        name: arme.name,
        quantity: reserveQuantity,
        poids: Number(arme.poids ?? 0),
        totalWeight: reserveQuantity * Number(arme.poids ?? 0),
      };
    })
    .filter((arme) => arme.quantity > 0);

  const reserveOutils = outils
    .map((outil) => {
      const assignedCount = persoOutils.filter(
        (entry) => entry.outil_id === outil.id,
      ).length;
      const reserveQuantity = Math.max(
        0,
        Math.floor(Number(outil.quantity ?? 1) || 0) - assignedCount,
      );

      return {
        id: outil.id,
        name: outil.name,
        quantity: reserveQuantity,
        poids: Number(outil.poids ?? 0),
        totalWeight: reserveQuantity * Number(outil.poids ?? 0),
      };
    })
    .filter((outil) => outil.quantity > 0);

  const reserveSacs = sacs
    .map((sac) => {
      const assignedCount = persoSacs.filter(
        (entry) => entry.sac_id === sac.id,
      ).length;
      const reserveQuantity = Math.max(
        0,
        Math.floor(Number(sac.quantity ?? 1) || 0) - assignedCount,
      );

      return {
        id: sac.id,
        name: sac.name,
        quantity: reserveQuantity,
        poids: Number(sac.poids ?? 0),
        totalWeight: reserveQuantity * Number(sac.poids ?? 0),
      };
    })
    .filter((sac) => sac.quantity > 0);

  const totalReserveGearWeight = [
    ...reserveArmes,
    ...reserveOutils,
    ...reserveSacs,
  ].reduce((total, item) => total + Number(item.totalWeight ?? 0), 0);

  const totalReserveWeight = totalResourcesWeight + totalReserveGearWeight;

  const renderReserveItems = (
    title: string,
    items: ReserveItem[],
    emptyLabel: string,
  ) => (
    <div className='mt-4'>
      <h3>{title}</h3>
      {items.length === 0 ? (
        <p>{emptyLabel}</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Nom</th>
              <th>Quantité en réserve</th>
              <th>Poids unitaire</th>
              <th>Poids total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>{item.name}</td>
                <td>{item.quantity}</td>
                <td>{formatWeight(item.poids)}</td>
                <td>{formatWeight(item.totalWeight)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  return (
    <Panel>
      <h2>1. Ville</h2>
      <InfoText>
        La ville applique ici des <strong>multiplicateurs de production</strong>{" "}
        pour tous les persos. <strong>1</strong> = normal, <strong>1.2</strong>{" "}
        = +20 %, <strong>0</strong> = aucune production.
      </InfoText>

      <div className={`${cardGridClassName} mb-4`}>
        {cityBonusFields.map((field) => (
          <Field key={field.key} label={`Bonus ${field.label}`}>
            <input
              className={fieldInputClassName}
              type='number'
              min='0'
              step='0.05'
              value={cityMultipliers[field.key] ?? 1}
              onChange={(event) =>
                handleCityMultiplierChange(field.key, event.target.value)
              }
            />
          </Field>
        ))}
      </div>

      <h3>Réserve centrale</h3>
      <div className={cardGridClassName}>
        {orderedResources.map((resource) => (
          <Field
            key={resource.code}
            label={
              <>
                Stock {resource.code.toUpperCase()}{" "}
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
              className={fieldInputClassName}
              type='number'
              value={normalizeStockQuantity(stocks[resource.code] ?? 0)}
              step='0.1'
              onChange={(event) =>
                handleStockChange(resource.code, event.target.value)
              }
            />
          </Field>
        ))}
      </div>

      <InfoText className='mt-4'>
        <strong>Poids total des ressources :</strong>{" "}
        {formatWeight(totalResourcesWeight)}
        <br />
        <strong>Poids total des armes / outils / sacs en réserve :</strong>{" "}
        {formatWeight(totalReserveGearWeight)}
        <br />
        <strong>Poids total de la réserve centrale :</strong>{" "}
        {formatWeight(totalReserveWeight)}
      </InfoText>

      {renderReserveItems(
        "Armes en réserve",
        reserveArmes,
        "Aucune arme en réserve.",
      )}
      {renderReserveItems(
        "Outils en réserve",
        reserveOutils,
        "Aucun outil en réserve.",
      )}
      {renderReserveItems(
        "Sacs en réserve",
        reserveSacs,
        "Aucun sac en réserve.",
      )}
    </Panel>
  );
}

export default ReservePage;
