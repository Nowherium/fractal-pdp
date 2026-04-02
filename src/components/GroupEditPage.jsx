import React from "react";
import {
  getGroupCapacity,
  getGroupLeader,
  getGroupMembers,
} from "../utils/groupUtils";

function GroupEditPage({
  group,
  persos,
  handleGroupUpdate,
  handleGroupMembersUpdate,
  closePage,
}) {
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
  const memberIds = memberPersos.map((perso) => perso.id);
  const leader = getGroupLeader(group, persos);
  const groupCapacity = getGroupCapacity(leader);
  const isAtCapacity = memberPersos.length >= groupCapacity;

  const toggleMember = (persoId, checked) => {
    const nextMemberIds = checked
      ? [...memberIds, persoId]
      : memberIds.filter((id) => id !== persoId);
    handleGroupMembersUpdate(group.id, nextMemberIds);
  };

  return (
    <div className='panel'>
      <button type='button' onClick={closePage}>
        ← Retour aux Groupes
      </button>
      <h2>Modifier {group.name || "le groupe"}</h2>

      <div className='perso-form'>
        <label className='perso-field'>
          <span className='perso-field-label'>Nom du groupe</span>
          <input
            className='perso-field-input'
            type='text'
            value={group.name}
            onChange={(event) =>
              handleGroupUpdate(group.id, "name", event.target.value)
            }
          />
        </label>

        <label className='perso-field'>
          <span className='perso-field-label'>Chef du groupe</span>
          <select
            className='perso-field-input'
            value={group.chef ?? ""}
            onChange={(event) =>
              handleGroupUpdate(
                group.id,
                "chef",
                event.target.value === "" ? null : Number(event.target.value),
              )
            }
          >
            <option value=''>Sélectionner</option>
            {memberPersos.map((perso) => {
              const optionCapacity = getGroupCapacity(perso);
              const isTooSmall = memberPersos.length > optionCapacity;
              return (
                <option key={perso.id} value={perso.id} disabled={isTooSmall}>
                  {perso.nom} (cap. {optionCapacity})
                </option>
              );
            })}
          </select>
        </label>
      </div>

      <div className='perso-form-section'>
        <h3>Membres du groupe</h3>
        <p className='info-text'>
          Coche un perso pour l'ajouter à ce groupe. Le décocher le retire du
          groupe et le laisse sans groupe.
          <br />
          Capacité actuelle: {memberPersos.length}/{groupCapacity} membres
          (`cmd` du leader + 1).
        </p>

        {persos.length === 0 ? (
          <p>Aucun perso disponible.</p>
        ) : (
          <div className='group-members-list'>
            {persos.map((perso) => {
              const isMember = memberIds.includes(perso.id);
              const disableCheck = !isMember && isAtCapacity;
              return (
                <label key={perso.id} className='group-member-item'>
                  <input
                    type='checkbox'
                    checked={isMember}
                    disabled={disableCheck}
                    onChange={(event) =>
                      toggleMember(perso.id, event.target.checked)
                    }
                  />
                  <span>
                    {perso.nom} (#{perso.id})
                  </span>
                </label>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default GroupEditPage;
