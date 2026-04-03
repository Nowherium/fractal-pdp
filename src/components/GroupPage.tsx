import type { Group, Perso } from "../types";
import { confirmAction } from "../utils/confirmAction";
import { calculateGroupTotals, getGroupMembers } from "../utils/groupUtils";
import Button from "./ui/Button";
import InfoText from "./ui/InfoText";
import Panel from "./ui/Panel";

const formatNumber = (value: number | string | null | undefined) => {
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
  removeGroup,
  setGroupPresence,
}: {
  groups: Group[];
  persos: Perso[];
  openGroupPage: (groupId: number) => void;
  openGroupViewPage: (groupId: number) => void;
  addGroup: () => void;
  removeGroup: (groupId: number) => void;
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
    <Panel>
      <h2>3. Groupe</h2>
      <InfoText>
        Liste des groupes connus. Chaque groupe affiche son chef et peut être
        consulté ou modifié. La colonne <strong>Présents</strong> permet de
        basculer tout le groupe en présent/absent.
      </InfoText>
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
                      <Button
                        className='mt-0'
                        size='sm'
                        variant='muted'
                        onClick={() => openGroupViewPage(group.id)}
                      >
                        Voir
                      </Button>
                      <Button
                        className='mt-0'
                        size='sm'
                        onClick={() => openGroupPage(group.id)}
                      >
                        Modifier
                      </Button>
                      <Button
                        className='mt-0'
                        size='sm'
                        variant='danger'
                        onClick={() =>
                          confirmAction(
                            `Supprimer le groupe ${group.name || "sélectionné"} ? Les personnages resteront actifs et seront simplement retirés de ce groupe.`,
                            () => removeGroup(group.id),
                          )
                        }
                      >
                        Supprimer
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <Button className='mt-3' variant='success' onClick={addGroup}>
        + Créer un groupe
      </Button>
    </Panel>
  );
}

export default GroupPage;
