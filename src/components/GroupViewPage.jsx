import React from "react";

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

  const memberPersos = persos.filter((perso) => perso.groupId === group.id);
  const leader = memberPersos.find((perso) => perso.id === group.chef) || null;

  const totals = memberPersos.reduce(
    (acc, perso) => ({
      eau: acc.eau + Number(perso.capEau ?? 0),
      nrt: acc.nrt + Number(perso.capNrt ?? 0),
      med: acc.med + Number(perso.capMed ?? 0),
      mat: acc.mat + Number(perso.capMat ?? 0),
      combat: acc.combat + Number(perso.combat ?? 0),
    }),
    { eau: 0, nrt: 0, med: 0, mat: 0, combat: 0 },
  );

  const groupCapacity = Math.max(1, Math.floor(Number(leader?.cmd ?? 0)) + 1);

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
                <th>Combat</th>
              </tr>
            </thead>
            <tbody>
              {memberPersos.map((perso) => (
                <tr key={perso.id}>
                  <td>{perso.nom}</td>
                  <td>{perso.id === group.chef ? "Leader" : "Membre"}</td>
                  <td>{formatNumber(perso.capEau)}</td>
                  <td>{formatNumber(perso.capNrt)}</td>
                  <td>{formatNumber(perso.capMed)}</td>
                  <td>{formatNumber(perso.capMat)}</td>
                  <td>{formatNumber(perso.combat)}</td>
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
                <th>{formatNumber(totals.combat)}</th>
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
              <span className='perso-field-label'>Combat total</span>
              <strong>{formatNumber(totals.combat)}</strong>
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
