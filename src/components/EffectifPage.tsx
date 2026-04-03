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

function EffectifPage({
  persos,
  removePerso,
  addPerso,
  openPersoPage,
}: {
  persos: Perso[];
  removePerso: (index: number) => void;
  addPerso: () => void;
  openPersoPage: (persoId: number) => void;
}) {
  return (
    <div className='panel'>
      <h2>2. L'Effectif & Potentiel de base</h2>
      <p className='info-text'>
        Indiquez la capacité originelle. Les modifications au fil du temps se
        feront directement dans les blocs Lunes via le bouton ⚙️.
      </p>
      <table>
        <thead>
          <tr>
            <th>Nom</th>
            <th>PV</th>
            <th>PV Max</th>
            <th className='highlight'>
              💧 Eau
              <br />
              <span style={{ fontSize: "0.7em", color: "#4caf50" }}>
                Capacité
              </span>
            </th>
            <th className='highlight'>
              🍗 Nrt
              <br />
              <span style={{ fontSize: "0.7em", color: "#4caf50" }}>
                Capacité
              </span>
            </th>
            <th className='highlight'>
              💊 Med
              <br />
              <span style={{ fontSize: "0.7em", color: "#4caf50" }}>
                Capacité
              </span>
            </th>
            <th className='highlight'>
              🧱 Mat
              <br />
              <span style={{ fontSize: "0.7em", color: "#4caf50" }}>
                Capacité
              </span>
            </th>
            <th className='highlight'>
              🎭 Art
              <br />
              <span style={{ fontSize: "0.7em", color: "#4caf50" }}>
                Capacité
              </span>
            </th>
            <th className='highlight'>CMD</th>
            <th className='highlight'>Combat</th>
            <th className='highlight'>Poids</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {persos.map((p, index) => (
            <tr key={p.id}>
              <td>{p.nom}</td>
              <td>{p.pv ?? 0}</td>
              <td>{p.pvmax ?? 0}</td>
              <td className='highlight'>
                {formatCombat(getPersoCapacityValue(p, "eau"))}
              </td>
              <td className='highlight'>
                {formatCombat(getPersoCapacityValue(p, "nrt"))}
              </td>
              <td className='highlight'>
                {formatCombat(getPersoCapacityValue(p, "med"))}
              </td>
              <td className='highlight'>
                {formatCombat(getPersoCapacityValue(p, "mat"))}
              </td>
              <td className='highlight'>
                {formatCombat(getPersoCapacityValue(p, "art"))}
              </td>
              <td className='highlight'>{p.cmd}</td>
              <td className='highlight'>
                {formatCombat(getPersoCombatValue(p))}
              </td>
              <td
                className={`highlight ${isPersoOverweight(p) ? "danger" : ""}`}
              >
                {formatCombat(getPersoWeightValue(p))} /{" "}
                {formatCombat(getPersoWeightLimit(p))}
              </td>
              <td>
                <button
                  className='btn-edit'
                  type='button'
                  onClick={() => openPersoPage(p.id)}
                >
                  Modifier
                </button>
                <button
                  className='btn-del'
                  type='button'
                  onClick={() => removePerso(index)}
                >
                  Renvoyer
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button className='btn-add' type='button' onClick={addPerso}>
        + Recruter un membre
      </button>
    </div>
  );
}

export default EffectifPage;
