import type { Group, Perso } from "../types";
import {
  getGroupCapacity,
  getGroupLeader,
  getGroupMembers,
} from "../utils/groupUtils";
import Button from "./ui/Button";
import Field from "./ui/Field";
import InfoText from "./ui/InfoText";
import Panel from "./ui/Panel";

const formGridClassName =
  "mt-4 grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4";
const fieldInputClassName =
  "w-full rounded-lg border border-border-strong bg-[#111] px-3 py-2.5 text-[#f1f1f1]";
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
      <Panel>
        <Button className='mt-0' variant='muted' onClick={closePage}>
          ← Retour aux Groupes
        </Button>
        <h2>Groupe introuvable</h2>
        <p>Le groupe sélectionné n'existe plus ou a été supprimé.</p>
      </Panel>
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
    <Panel>
      <Button className='mt-0' variant='muted' onClick={closePage}>
        ← Retour aux Groupes
      </Button>
      <h2>Modifier {group.name || "le groupe"}</h2>

      <div className={formGridClassName}>
        <Field label='Nom du groupe'>
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
        </Field>

        <Field label='Chef du groupe'>
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
        </Field>
      </div>

      <div className={sectionClassName}>
        <h3>Membres du groupe</h3>
        <InfoText>
          Coche un perso pour l'ajouter à ce groupe. Le décocher le retire du
          groupe et le laisse sans groupe.
          <br />
          Capacité actuelle: {memberPersos.length}/{groupCapacity} membres (
          <code className='font-mono'>cmd</code> du leader + 1).
        </InfoText>

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
    </Panel>
  );
}

export default GroupEditPage;
