import React from "react";

const bagFields = [
  { key: "name", label: "Nom", type: "text" },
  { key: "pv", label: "PV", type: "number", step: "1" },
  { key: "pvmax", label: "PV Max", type: "number", step: "1" },
  { key: "poids", label: "Poids", type: "number", step: "0.1" },
  { key: "capacite", label: "Capacité", type: "number", step: "0.1" },
  { key: "quantity", label: "Quantité", type: "number", step: "1" },
];

function BagsPage({ sacs, addSac, updateSac, removeSac }) {
  return (
    <div className='panel'>
      <h2>7. Administration des sacs</h2>
      <p className='info-text'>
        Gère ici les sacs disponibles pour les personnages. Un perso peut en
        porter plusieurs, un seul sac équipé ajoute sa capacité au poids max, et
        le poids de chaque sac porté compte dans le poids total.
      </p>

      {sacs.length === 0 ? (
        <p>Aucun sac défini pour le moment.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Nom</th>
              <th>PV</th>
              <th>PV Max</th>
              <th>Poids</th>
              <th>Capacité</th>
              <th>Quantité</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {sacs.map((sac, index) => (
              <tr key={sac.id}>
                {bagFields.map((field) => (
                  <td key={field.key}>
                    <input
                      className='perso-field-input'
                      type={field.type}
                      step={field.step}
                      min={field.key === "name" ? undefined : 0}
                      value={sac[field.key] ?? ""}
                      onChange={(event) =>
                        updateSac(index, field.key, event.target.value)
                      }
                    />
                  </td>
                ))}
                <td>
                  <button
                    className='btn-del'
                    type='button'
                    onClick={() => removeSac(index)}
                  >
                    Supprimer
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <button className='btn-add' type='button' onClick={addSac}>
        + Ajouter un sac
      </button>
    </div>
  );
}

export default BagsPage;
