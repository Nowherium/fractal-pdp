import type { Group, Perso } from "../types";
import {
  calculateGroupTotals,
  getGroupCapacity,
  getGroupLeader,
  getGroupMembers,
  getPersoCapacityValue,
  getPersoCombatValue,
  getPersoWeightLimit,
  getPersoWeightValue,
  isPersoCadavre,
  isPersoOverweight,
} from "../utils/groupUtils";
import Button from "./ui/Button";
import InfoText from "./ui/InfoText";
import Panel from "./ui/Panel";

const formatNumber = (value: number | string | null | undefined) =>
  Number(value ?? 0).toFixed(2);

const statGridClassName =
  "mt-4 grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4";
const statCardClassName =
  "flex flex-col gap-2 rounded-[10px] border border-border-main bg-[#141414] p-[14px]";
const statLabelClassName = "text-[0.92em] tracking-[0.02em] text-accent-blue";

function GroupViewPage({
  group,
  persos,
  closePage,
  openEditPage,
}: {
  group?: Group | undefined;
  persos: Perso[];
  closePage: () => void;
  openEditPage: (groupId: number) => void;
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
  const leader = getGroupLeader(group, persos);
  const totals = calculateGroupTotals(memberPersos);
  const groupCapacity = getGroupCapacity(leader);

  return (
    <Panel>
      <div className='flex flex-wrap gap-2'>
        <Button className='mt-0' variant='muted' onClick={closePage}>
          ← Retour aux Groupes
        </Button>
        <Button className='mt-0' onClick={() => openEditPage(group.id)}>
          Modifier ce groupe
        </Button>
      </div>

      <h2>Récapitulatif de {group.name || "ce groupe"}</h2>
      <InfoText>
        Chef: <strong>{leader?.nom || "Aucun"}</strong> • Membres:{" "}
        {memberPersos.length} • Capacité max du groupe:{" "}
        <strong>
          {memberPersos.length} / {groupCapacity}
        </strong>
      </InfoText>

      {memberPersos.length === 0 ? (
        <p>Ce groupe ne contient actuellement aucun membre.</p>
      ) : (
        <>
          <table>
            <thead>
              <tr>
                <th>Nom</th>
                <th>Rôle</th>
                <th>Eau</th>
                <th>Nrt</th>
                <th>Med</th>
                <th>Mat</th>
                <th>Art</th>
                <th>Combat</th>
                <th>Poids</th>
              </tr>
            </thead>
            <tbody>
              {memberPersos.map((perso) => (
                <tr
                  key={perso.id}
                  className={isPersoCadavre(perso) ? "dead" : undefined}
                >
                  <td>
                    {perso.nom}
                    {isPersoCadavre(perso) ? (
                      <div className='inactive-note text-accent-red'>
                        Cadavre
                      </div>
                    ) : null}
                  </td>
                  <td>
                    {perso.id === group.chef ? "Leader" : "Membre"}
                    {isPersoCadavre(perso) ? " (cadavre)" : ""}
                  </td>
                  <td>{formatNumber(getPersoCapacityValue(perso, "eau"))}</td>
                  <td>{formatNumber(getPersoCapacityValue(perso, "nrt"))}</td>
                  <td>{formatNumber(getPersoCapacityValue(perso, "med"))}</td>
                  <td>{formatNumber(getPersoCapacityValue(perso, "mat"))}</td>
                  <td>{formatNumber(getPersoCapacityValue(perso, "art"))}</td>
                  <td>{formatNumber(getPersoCombatValue(perso))}</td>
                  <td
                    className={isPersoOverweight(perso) ? "danger" : undefined}
                  >
                    {formatNumber(getPersoWeightValue(perso))} /{" "}
                    {formatNumber(getPersoWeightLimit(perso))}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th colSpan={2}>Total</th>
                <th>{formatNumber(totals.eau)}</th>
                <th>{formatNumber(totals.nrt)}</th>
                <th>{formatNumber(totals.med)}</th>
                <th>{formatNumber(totals.mat)}</th>
                <th>{formatNumber(totals.art)}</th>
                <th>{formatNumber(totals.combat)}</th>
                <th>{formatNumber(totals.poids)}</th>
              </tr>
            </tfoot>
          </table>

          <div className={statGridClassName}>
            <div className={statCardClassName}>
              <span className={statLabelClassName}>Production totale Eau</span>
              <strong>{formatNumber(totals.eau)}</strong>
            </div>
            <div className={statCardClassName}>
              <span className={statLabelClassName}>Production totale Nrt</span>
              <strong>{formatNumber(totals.nrt)}</strong>
            </div>
            <div className={statCardClassName}>
              <span className={statLabelClassName}>Production totale Med</span>
              <strong>{formatNumber(totals.med)}</strong>
            </div>
            <div className={statCardClassName}>
              <span className={statLabelClassName}>Production totale Mat</span>
              <strong>{formatNumber(totals.mat)}</strong>
            </div>
            <div className={statCardClassName}>
              <span className={statLabelClassName}>Production totale Art</span>
              <strong>{formatNumber(totals.art)}</strong>
            </div>
            <div className={statCardClassName}>
              <span className={statLabelClassName}>Combat total</span>
              <strong>{formatNumber(totals.combat)}</strong>
            </div>
            <div className={statCardClassName}>
              <span className={statLabelClassName}>Poids total porté</span>
              <strong>{formatNumber(totals.poids)}</strong>
            </div>
            <div className={statCardClassName}>
              <span className={statLabelClassName}>Capacité max du groupe</span>
              <strong>
                {memberPersos.length} / {groupCapacity}
              </strong>
            </div>
          </div>
        </>
      )}
    </Panel>
  );
}

export default GroupViewPage;
