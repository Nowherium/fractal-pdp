import React from "react";

const persoFields = [
  { key: "nom", label: "Nom", type: "text" },
  { key: "pvBase", label: "PV Début", type: "number", step: "1" },
  { key: "capEau", label: "Capacité Eau", type: "number" },
  { key: "capNrt", label: "Capacité Nrt", type: "number" },
  { key: "capMed", label: "Capacité Med", type: "number" },
  { key: "capMat", label: "Capacité Mat", type: "number" },
  { key: "capart", label: "Capacité Art", type: "number" },
  { key: "cmd", label: "CMD", type: "number", step: "1" },
  { key: "combat", label: "Combat", type: "number", step: "1" },
  { key: "groupId", label: "Groupe", type: "number", step: "1" },
];

const capacityStep = (value) => {
  const numericValue = Number(value);
  if (Number.isNaN(numericValue)) return "0.1";
  if (numericValue < 4) return "0.1";
  if (numericValue <= 6) return "0.05";
  return "0.01";
};

const shouldUseIncrementStep = (fieldKey) =>
  fieldKey.startsWith("cap") || fieldKey === "cmd" || fieldKey === "combat";

function PersoPage({ perso, groups, handlePersoUpdate, closePage }) {
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
      <div className='perso-form'>
        {persoFields.map((field) => {
          const value = perso[field.key];
          const step = shouldUseIncrementStep(field.key)
            ? capacityStep(value)
            : field.step;

          return (
            <label key={field.key} className='perso-field'>
              <span className='perso-field-label'>{field.label}</span>
              <input
                className='perso-field-input'
                type={field.type}
                step={step}
                value={value ?? ""}
                onChange={(event) =>
                  handlePersoUpdate(perso.id, field.key, event.target.value)
                }
              />
            </label>
          );
        })}
        <label className='perso-field'>
          <span className='perso-field-label'>Groupe</span>
          <select
            className='perso-field-input'
            value={perso.groupId ?? ""}
            onChange={(event) =>
              handlePersoUpdate(
                perso.id,
                "groupId",
                event.target.value === "" ? null : Number(event.target.value),
              )
            }
          >
            <option value=''>Aucun</option>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}

export default PersoPage;
