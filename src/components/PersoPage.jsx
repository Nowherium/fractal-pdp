import React from "react";

const persoFields = [
  { key: "nom", label: "Nom", type: "text" },
  { key: "pvBase", label: "PV Début", type: "number", step: "1" },
  { key: "capEau", label: "Capacité Eau", type: "number", step: "0.01" },
  { key: "capNrt", label: "Capacité Nrt", type: "number", step: "0.01" },
  { key: "capMed", label: "Capacité Med", type: "number", step: "0.01" },
  { key: "capMat", label: "Capacité Mat", type: "number", step: "0.01" },
  { key: "combat", label: "Combat", type: "number", step: "1" },
  { key: "groupId", label: "Groupe", type: "number", step: "1" },
];

function PersoPage({ perso, handlePersoUpdate, closePage }) {
  if (!perso) {
    return (
      <div className='panel'>
        <button type='button' onClick={closePage}>
          ← Retour à l'Effectif
        </button>
        <h2>Personnage introuvable</h2>
        <p>Ce personnage a probablement été supprimé ou n'existe plus.</p>
      </div>
    );
  }

  return (
    <div className='panel'>
      <button type='button' onClick={closePage}>
        ← Retour à l'Effectif
      </button>
      <h2>Modifier {perso.nom || "le personnage"}</h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "16px",
          marginTop: "16px",
        }}
      >
        {persoFields.map((field) => (
          <label key={field.key}>
            {field.label}
            <input
              type={field.type}
              step={field.step}
              value={perso[field.key] ?? ""}
              onChange={(event) =>
                handlePersoUpdate(perso.id, field.key, event.target.value)
              }
            />
          </label>
        ))}
      </div>
    </div>
  );
}

export default PersoPage;
