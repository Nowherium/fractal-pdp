import Button from "./ui/Button";
import InfoText from "./ui/InfoText";
import Panel from "./ui/Panel";

import type { Perso } from "../types";
import { confirmAction } from "../utils/confirmAction";
import {
  getPersoCapacityValue,
  getPersoCombatValue,
  getPersoWeightLimit,
  getPersoWeightValue,
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

const capacityFields = [
  { key: "eau", label: "💧 Eau" },
  { key: "nrt", label: "🍗 Nrt" },
  { key: "med", label: "💊 Med" },
  { key: "mat", label: "🧱 Mat" },
  { key: "art", label: "🎭 Art" },
] as const;

function EffectifPage({
  persos,
  removePerso,
  addPerso,
  openPersoPage,
  updatePersoPresence,
}: {
  persos: Perso[];
  removePerso: (index: number) => void;
  addPerso: () => void;
  openPersoPage: (persoId: number) => void;
  updatePersoPresence: (persoId: number, isPresent: boolean) => void;
}) {
  return (
    <Panel>
      <h2>2. L'Effectif & Potentiel de base</h2>
      <InfoText>
        Indiquez la capacité originelle. Les modifications au fil du temps se
        feront directement dans les blocs Lunes via le bouton ⚙️.
      </InfoText>
      <table>
        <thead>
          <tr>
            <th>Nom</th>
            <th>PV</th>
            <th>PV Max</th>
            {capacityFields.map((field) => (
              <th key={field.key} className={highlightCellClassName}>
                {field.label}
                <br />
                <span className={headerHintClassName}>Capacité</span>
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
          {persos.map((p, index) => (
            <tr key={p.id}>
              <td>{p.nom}</td>
              <td>{p.pv ?? 0}</td>
              <td>{p.pvmax ?? 0}</td>
              {capacityFields.map((field) => (
                <td key={field.key} className={highlightCellClassName}>
                  {formatCombat(getPersoCapacityValue(p, field.key))}
                </td>
              ))}
              <td className={highlightCellClassName}>{p.cmd}</td>
              <td className={highlightCellClassName}>
                {formatCombat(getPersoCombatValue(p))}
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
                  checked={p.present !== false}
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
          ))}
        </tbody>
      </table>
      <Button className='mt-3' variant='success' onClick={addPerso}>
        + Recruter un membre
      </Button>
    </Panel>
  );
}

export default EffectifPage;
