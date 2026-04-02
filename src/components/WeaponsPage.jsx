const weaponFields = [
  { key: "name", label: "Nom", type: "text", step: undefined },
  { key: "att", label: "Att", type: "number", step: "0.1" },
  { key: "degats", label: "Dégâts", type: "number", step: "0.1" },
  { key: "fiabilite", label: "Fiabilité", type: "number", step: "0.1" },
  { key: "pv", label: "PV", type: "number", step: "0.1" },
  { key: "pvm", label: "PVM", type: "number", step: "0.1" },
  { key: "poids", label: "Poids", type: "number", step: "0.1" },
  { key: "quantity", label: "Quantité", type: "number", step: "1" },
];

function WeaponsPage({ armes, addArme, updateArme, removeArme }) {
  return (
    <div className='panel'>
      <h2>5. Administration des armes</h2>
      <p className='info-text'>
        Gère ici le catalogue des armes disponibles pour les personnages.
      </p>

      {armes.length === 0 ? (
        <p>Aucune arme définie pour le moment.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Nom</th>
              <th>Att</th>
              <th>Dégâts</th>
              <th>Fiabilité</th>
              <th>PV</th>
              <th>PVM</th>
              <th>Poids</th>
              <th>Quantité</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {armes.map((arme, index) => (
              <tr key={arme.id}>
                {weaponFields.map((field) => (
                  <td key={field.key}>
                    <input
                      className='perso-field-input'
                      type={field.type}
                      step={field.step}
                      min={field.key === "quantity" ? 0 : undefined}
                      value={arme[field.key] ?? ""}
                      onChange={(event) =>
                        updateArme(
                          index,
                          field.key,
                          event.target.value,
                          field.type === "text"
                            ? { persist: false }
                            : undefined,
                        )
                      }
                      onBlur={
                        field.type === "text"
                          ? (event) =>
                              updateArme(index, field.key, event.target.value, {
                                persist: true,
                              })
                          : undefined
                      }
                    />
                  </td>
                ))}
                <td>
                  <button
                    className='btn-del'
                    type='button'
                    onClick={() => removeArme(index)}
                  >
                    Supprimer
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <button className='btn-add' type='button' onClick={addArme}>
        + Ajouter une arme
      </button>
    </div>
  );
}

export default WeaponsPage;
