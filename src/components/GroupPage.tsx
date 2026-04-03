import type { Group, Perso } from "../types";
import { calculateGroupTotals, getGroupMembers } from "../utils/groupUtils";

const formatNumber = (value: number | string | null | undefined) => {
  const numericValue = Number(value ?? 0);
  return Number.isInteger(numericValue)
    ? numericValue
    : numericValue.toFixed(2);
};

const panelClassName =
  "mb-5 rounded-lg border border-border-strong bg-panel p-[15px]";
const infoTextClassName = "mb-2.5 text-[0.85em] italic text-[#888]";

function GroupPage({
  groups,
  persos,
  openGroupPage,
  openGroupViewPage,
  addGroup,
  setGroupPresence,
}: {
  groups: Group[];
  persos: Perso[];
  openGroupPage: (groupId: number) => void;
  openGroupViewPage: (groupId: number) => void;
  addGroup: () => void;
  setGroupPresence: (groupId: number, isPresent: boolean) => void;
}) {
  const getChefLabel = (chefId: number | null | undefined) => {
    if (chefId === null || chefId === undefined) return "Aucun";
    const chef = persos.find((p) => p.id === chefId);
    return chef ? chef.nom : "Chef introuvable";
  };

  const getMembersLabel = (groupId: number) => {
    const members = getGroupMembers(persos, groupId);
    if (members.length === 0) return "Aucun membre";
    return members.map((member) => member.nom).join(", ");
  };

  return (
    <div className={panelClassName}>
      <h2>3. Groupe</h2>
      <p className={infoTextClassName}>
        Liste des groupes connus. Chaque groupe affiche son chef et peut être
        consulté ou modifié. La colonne <strong>Présents</strong> permet de
        basculer tout le groupe en présent/absent.
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
              <th>Présents</th>
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
              const members = getGroupMembers(persos, group.id);
              const totals = calculateGroupTotals(members);
              const presentCount = members.filter(
                (member) => member.present !== false,
              ).length;
              const allPresent =
                members.length > 0 && presentCount === members.length;

              return (
                <tr key={group.id}>
                  <td>{group.name}</td>
                  <td>{getChefLabel(group.chef)}</td>
                  <td>{getMembersLabel(group.id)}</td>
                  <td>
                    <label className='inline-flex items-center gap-2 text-[0.9em]'>
                      <input
                        type='checkbox'
                        className='h-[18px] w-[18px] cursor-pointer accent-green-500'
                        checked={allPresent}
                        disabled={members.length === 0}
                        aria-label={`Présence du groupe ${group.name}`}
                        onChange={(event) =>
                          setGroupPresence(group.id, event.target.checked)
                        }
                      />
                      <span>
                        {presentCount}/{members.length}
                      </span>
                    </label>
                  </td>
                  <td>{formatNumber(totals.eau)}</td>
                  <td>{formatNumber(totals.nrt)}</td>
                  <td>{formatNumber(totals.med)}</td>
                  <td>{formatNumber(totals.mat)}</td>
                  <td>{formatNumber(totals.art)}</td>
                  <td>{formatNumber(totals.combat)}</td>
                  <td>
                    <div className='flex flex-wrap gap-2'>
                      <button
                        className='mt-0'
                        type='button'
                        onClick={() => openGroupViewPage(group.id)}
                      >
                        Voir
                      </button>
                      <button
                        className='mt-0'
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

      <button className='btn-add mt-3' type='button' onClick={addGroup}>
        + Créer un groupe
      </button>
    </div>
  );
}

export default GroupPage;
