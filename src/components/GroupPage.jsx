import React from "react";
import { calculateGroupTotals, getGroupMembers } from "../utils/groupUtils";

const formatNumber = (value) => {
  const numericValue = Number(value ?? 0);
  return Number.isInteger(numericValue)
    ? numericValue
    : numericValue.toFixed(2);
};

function GroupPage({
  groups,
  persos,
  openGroupPage,
  openGroupViewPage,
  addGroup,
}) {
  const getChefLabel = (chefId) => {
    if (chefId === null || chefId === undefined) return "Aucun";
    const chef = persos.find((p) => p.id === chefId);
    return chef ? chef.nom : "Chef introuvable";
  };

  const getMembersLabel = (groupId) => {
    const members = getGroupMembers(persos, groupId);
    if (members.length === 0) return "Aucun membre";
    return members.map((member) => member.nom).join(", ");
  };

  return (
    <div className='panel'>
      <h2>3. Groupe</h2>
      <p className='info-text'>
        Liste des groupes connus. Chaque groupe affiche son chef et peut être
        consulté ou modifié.
      </p>
      {groups.length === 0 ? (
        <p>Aucun groupe défini pour le moment.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Groupe</th>
              <th>Chef</th>
              <th>Membres</th>
              <th>💧 Eau</th>
              <th>🍗 Nrt</th>
              <th>💊 Med</th>
              <th>🧱 Mat</th>
              <th>🎭 Art</th>
              <th>⚔️ Combat</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => {
              const totals = calculateGroupTotals(
                getGroupMembers(persos, group.id),
              );

              return (
                <tr key={group.id}>
                  <td>{group.name}</td>
                  <td>{getChefLabel(group.chef)}</td>
                  <td>{getMembersLabel(group.id)}</td>
                  <td>{formatNumber(totals.eau)}</td>
                  <td>{formatNumber(totals.nrt)}</td>
                  <td>{formatNumber(totals.med)}</td>
                  <td>{formatNumber(totals.mat)}</td>
                  <td>{formatNumber(totals.art)}</td>
                  <td>{formatNumber(totals.combat)}</td>
                  <td>
                    <div
                      style={{
                        display: "flex",
                        gap: "0.5rem",
                        flexWrap: "wrap",
                      }}
                    >
                      <button
                        className='btn-edit'
                        type='button'
                        onClick={() => openGroupViewPage(group.id)}
                      >
                        Voir
                      </button>
                      <button
                        className='btn-edit'
                        type='button'
                        onClick={() => openGroupPage(group.id)}
                      >
                        Modifier
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <button className='btn-add' type='button' onClick={addGroup}>
        + Créer un groupe
      </button>
    </div>
  );
}

export default GroupPage;
