import type { Group, Perso } from "../types";
import {
  getGroupCapacity,
  getGroupLeader,
  getGroupMembers,
} from "../utils/groupUtils";

const panelClassName =
  "mb-5 rounded-lg border border-border-strong bg-panel p-[15px]";
const formGridClassName =
  "mt-4 grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4";
const fieldCardClassName =
  "flex flex-col gap-2 rounded-[10px] border border-border-main bg-[#141414] p-[14px]";
const fieldLabelClassName = "text-[0.92em] tracking-[0.02em] text-accent-blue";
const fieldInputClassName =
  "w-full rounded-lg border border-border-strong bg-[#111] px-3 py-2.5 text-[#f1f1f1]";
const infoTextClassName = "mb-2.5 text-[0.85em] italic text-[#888]";
const sectionClassName = "mt-6 space-y-2.5";
const memberListClassName = "flex flex-col gap-2";
const memberItemClassName =
  "flex items-center gap-2 rounded-lg border border-border-soft bg-soft-bg px-3 py-2";

function GroupEditPage({
  group,
  persos,
  handleGroupUpdate,
  handleGroupMembersUpdate,
  closePage,
}: {
  group?: Group | undefined;
  persos: Perso[];
  handleGroupUpdate: (
    groupId: number,
    field: string,
    rawValue: string | number | null,
    options?: { persist?: boolean },
  ) => void;
  handleGroupMembersUpdate: (
    groupId: number,
    selectedMemberIds: Array<number | string>,
  ) => void;
  closePage: () => void;
}) {
  if (!group) {
    return (
      <div className={panelClassName}>
        <button className='mt-0' type='button' onClick={closePage}>
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

  const toggleMember = (persoId: number, checked: boolean) => {
    const nextMemberIds = checked
      ? [...memberIds, persoId]
      : memberIds.filter((id) => id !== persoId);
    handleGroupMembersUpdate(group.id, nextMemberIds);
  };

  return (
    <div className={panelClassName}>
      <button className='mt-0' type='button' onClick={closePage}>
        ← Retour aux Groupes
      </button>
      <h2>Modifier {group.name || "le groupe"}</h2>

      <div className={formGridClassName}>
        <label className={fieldCardClassName}>
          <span className={fieldLabelClassName}>Nom du groupe</span>
          <input
            className={fieldInputClassName}
            type='text'
            value={group.name}
            onChange={(event) =>
              handleGroupUpdate(group.id, "name", event.target.value, {
                persist: false,
              })
            }
            onBlur={(event) =>
              handleGroupUpdate(group.id, "name", event.target.value, {
                persist: true,
              })
            }
          />
        </label>

        <label className={fieldCardClassName}>
          <span className={fieldLabelClassName}>Chef du groupe</span>
          <select
            className={fieldInputClassName}
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

      <div className={sectionClassName}>
        <h3>Membres du groupe</h3>
        <p className={infoTextClassName}>
          Coche un perso pour l'ajouter à ce groupe. Le décocher le retire du
          groupe et le laisse sans groupe.
          <br />
          Capacité actuelle: {memberPersos.length}/{groupCapacity} membres
          (`cmd` du leader + 1).
        </p>

        {persos.length === 0 ? (
          <p>Aucun perso disponible.</p>
        ) : (
          <div className={memberListClassName}>
            {persos.map((perso) => {
              const isMember = memberIds.includes(perso.id);
              const disableCheck = !isMember && isAtCapacity;
              return (
                <label key={perso.id} className={memberItemClassName}>
                  <input
                    type='checkbox'
                    className='h-4 w-4 cursor-pointer accent-green-500'
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
