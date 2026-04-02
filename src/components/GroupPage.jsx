import React from "react";

function GroupPage({ groups, persos, openGroupPage, openGroupViewPage }) {
  const getChefLabel = (chefId) => {
    if (chefId === null || chefId === undefined) return "Aucun";
    const chef = persos.find((p) => p.id === chefId);
    return chef ? chef.nom : "Chef introuvable";
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
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => (
              <tr key={group.id}>
                <td>{group.name}</td>
                <td>{getChefLabel(group.chef)}</td>
                <td>
                  <div
                    style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}
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
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default GroupPage;
