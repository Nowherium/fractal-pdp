import type { Perso } from "../types";
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

const panelClassName =
  "mb-5 rounded-lg border border-border-strong bg-panel p-[15px]";
const infoTextClassName = "mb-2.5 text-[0.85em] italic text-[#888]";
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
    <div className={panelClassName}>
      <h2>2. L'Effectif & Potentiel de base</h2>
      <p className={infoTextClassName}>
        Indiquez la capacité originelle. Les modifications au fil du temps se
        feront directement dans les blocs Lunes via le bouton ⚙️.
      </p>
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
                  <button
                    className='mt-0'
                    type='button'
                    onClick={() => openPersoPage(p.id)}
                  >
                    Modifier
                  </button>
                  <button
                    className='btn-del mt-0'
                    type='button'
                    onClick={() => removePerso(index)}
                  >
                    Renvoyer
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button className='btn-add mt-3' type='button' onClick={addPerso}>
        + Recruter un membre
      </button>
    </div>
  );
}

export default EffectifPage;
