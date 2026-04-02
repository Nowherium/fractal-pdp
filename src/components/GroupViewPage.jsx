import React from "react";
import {
  calculateGroupTotals,
  getGroupCapacity,
  getGroupLeader,
  getGroupMembers,
  getPersoCapacityValue,
  getPersoCombatValue,
  getPersoWeightLimit,
  getPersoWeightValue,
  isPersoOverweight,
} from "../utils/groupUtils";

const formatNumber = (value) => Number(value ?? 0).toFixed(2);

function GroupViewPage({ group, persos, closePage }) {
  if (!group) {
    return (
      <div className='panel'>
        <button type='button' onClick={closePage}>
          ← Retour aux Groupes
        </button>
        <h2>Groupe introuvable</h2>
        <p>Le groupe sélectionné n'existe plus ou a été supprimé.</p>
      </div>
    );
  }

  const memberPersos = getGroupMembers(persos, group.id);
  const leader = getGroupLeader(group, persos);
  const totals = calculateGroupTotals(memberPersos);
  const groupCapacity = getGroupCapacity(leader);

  return (
    <div className='panel'>
      <button type='button' onClick={closePage}>
        ← Retour aux Groupes
      </button>

      <h2>Récapitulatif de {group.name || "ce groupe"}</h2>
      <p className='info-text'>
        Chef: <strong>{leader?.nom || "Aucun"}</strong> • Membres:{" "}
        {memberPersos.length} • Capacité max du groupe:{" "}
        <strong>
          {memberPersos.length} / {groupCapacity}
        </strong>
      </p>

      {memberPersos.length === 0 ? (
        <p>Ce groupe ne contient actuellement aucun membre.</p>
      ) : (
        <>
          <table>
            <thead>
              <tr>
                <th>Nom</th>
                <th>Rôle</th>
                <th>Eau</th>
                <th>Nrt</th>
                <th>Med</th>
                <th>Mat</th>
                <th>Art</th>
                <th>Combat</th>
                <th>Poids</th>
              </tr>
            </thead>
            <tbody>
              {memberPersos.map((perso) => (
                <tr key={perso.id}>
                  <td>{perso.nom}</td>
                  <td>{perso.id === group.chef ? "Leader" : "Membre"}</td>
                  <td>{formatNumber(getPersoCapacityValue(perso, "eau"))}</td>
                  <td>{formatNumber(getPersoCapacityValue(perso, "nrt"))}</td>
                  <td>{formatNumber(getPersoCapacityValue(perso, "med"))}</td>
                  <td>{formatNumber(getPersoCapacityValue(perso, "mat"))}</td>
                  <td>{formatNumber(getPersoCapacityValue(perso, "art"))}</td>
                  <td>{formatNumber(getPersoCombatValue(perso))}</td>
                  <td
                    className={isPersoOverweight(perso) ? "danger" : undefined}
                  >
                    {formatNumber(getPersoWeightValue(perso))} /{" "}
                    {formatNumber(getPersoWeightLimit(perso))}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th colSpan='2'>Total</th>
                <th>{formatNumber(totals.eau)}</th>
                <th>{formatNumber(totals.nrt)}</th>
                <th>{formatNumber(totals.med)}</th>
                <th>{formatNumber(totals.mat)}</th>
                <th>{formatNumber(totals.art)}</th>
                <th>{formatNumber(totals.combat)}</th>
                <th>{formatNumber(totals.poids)}</th>
              </tr>
            </tfoot>
          </table>

          <div className='perso-form'>
            <div className='perso-field'>
              <span className='perso-field-label'>Production totale Eau</span>
              <strong>{formatNumber(totals.eau)}</strong>
            </div>
            <div className='perso-field'>
              <span className='perso-field-label'>Production totale Nrt</span>
              <strong>{formatNumber(totals.nrt)}</strong>
            </div>
            <div className='perso-field'>
              <span className='perso-field-label'>Production totale Med</span>
              <strong>{formatNumber(totals.med)}</strong>
            </div>
            <div className='perso-field'>
              <span className='perso-field-label'>Production totale Mat</span>
              <strong>{formatNumber(totals.mat)}</strong>
            </div>
            <div className='perso-field'>
              <span className='perso-field-label'>Production totale Art</span>
              <strong>{formatNumber(totals.art)}</strong>
            </div>
            <div className='perso-field'>
              <span className='perso-field-label'>Combat total</span>
              <strong>{formatNumber(totals.combat)}</strong>
            </div>
            <div className='perso-field'>
              <span className='perso-field-label'>Poids total porté</span>
              <strong>{formatNumber(totals.poids)}</strong>
            </div>
            <div className='perso-field'>
              <span className='perso-field-label'>Capacité max du groupe</span>
              <strong>
                {memberPersos.length} / {groupCapacity}
              </strong>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default GroupViewPage;
