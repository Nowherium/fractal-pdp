import { useEffect } from "react";
import type { Dispatch, SetStateAction } from "react";
import type {
  Arme,
  Outil,
  Perso,
  PersoArme,
  PersoOutil,
  PersoResource,
  PersoSac,
  Resource,
  Sac,
} from "../types";

interface UseDerivedPersoStateParams {
  resources: Resource[];
  armes: Arme[];
  persoArmes: PersoArme[];
  outils: Outil[];
  persoOutils: PersoOutil[];
  sacs: Sac[];
  persoSacs: PersoSac[];
  persoResources: PersoResource[];
  setPersos: Dispatch<SetStateAction<Perso[]>>;
}

export const useDerivedPersoState = ({
  resources,
  armes,
  persoArmes,
  outils,
  persoOutils,
  sacs,
  persoSacs,
  persoResources,
  setPersos,
}: UseDerivedPersoStateParams) => {
  useEffect(() => {
    const resourcesById = new Map<number, Resource>(
      resources.map((resource) => [resource.id, resource]),
    );
    const armesById = new Map<number, Arme>(
      armes.map((arme) => [arme.id, arme]),
    );
    const outilsById = new Map<number, Outil>(
      outils.map((outil) => [outil.id, outil]),
    );
    const sacsById = new Map<number, Sac>(sacs.map((sac) => [sac.id, sac]));

    setPersos((previous) =>
      previous.map((perso) => {
        const equippedEntry = persoArmes.find(
          (entry) => entry.perso_id === perso.id && entry.equipee,
        );
        const nextEquippedWeaponId = equippedEntry?.arme_id ?? null;
        const equippedArme =
          nextEquippedWeaponId === null
            ? undefined
            : armesById.get(nextEquippedWeaponId);
        const nextCombatEffectif =
          nextEquippedWeaponId === null
            ? Number(perso.combat ?? 0)
            : Number(perso.combat ?? 0) * Number(equippedArme?.att ?? 1);

        const equippedBagEntry = persoSacs.find(
          (entry) => entry.perso_id === perso.id && entry.equipe,
        );
        const nextEquippedBagId = equippedBagEntry?.sac_id ?? null;
        const equippedSac =
          nextEquippedBagId === null
            ? undefined
            : sacsById.get(nextEquippedBagId);
        const nextPoidsMaxEffectif =
          Number(perso.poidsMax ?? 20) + Number(equippedSac?.capacite ?? 0);

        const carriedWeapons = persoArmes
          .filter((entry) => entry.perso_id === perso.id)
          .map((entry) => armesById.get(entry.arme_id))
          .filter((arme): arme is Arme => Boolean(arme));

        const carriedTools = persoOutils
          .filter((entry) => entry.perso_id === perso.id)
          .map((entry) => outilsById.get(entry.outil_id))
          .filter((outil): outil is Outil => Boolean(outil));

        const carriedBags = persoSacs
          .filter((entry) => entry.perso_id === perso.id)
          .map((entry) => sacsById.get(entry.sac_id))
          .filter((sac): sac is Sac => Boolean(sac));

        const carriedResourcesWeight = persoResources
          .filter((entry) => entry.perso_id === perso.id)
          .reduce((total, entry) => {
            const resource = resourcesById.get(entry.resource_id);
            const unitWeight = resource?.code === "crd" ? 0 : 1;
            return (
              total +
              Math.max(0, Number(entry.quantity ?? 0)) * Number(unitWeight)
            );
          }, 0);

        const multiplierBySpecialite = carriedTools.reduce<
          Record<string, number>
        >(
          (acc, outil) => ({
            ...acc,
            [outil.specialite ?? "eau"]:
              Number(acc[outil.specialite ?? "eau"] ?? 1) *
              Number(outil.bonus ?? 1),
          }),
          { eau: 1, nrt: 1, mat: 1, art: 1 },
        );

        const nextCapEauEffectif =
          Number(perso.capEau ?? 0) * Number(multiplierBySpecialite.eau ?? 1);
        const nextCapNrtEffectif =
          Number(perso.capNrt ?? 0) * Number(multiplierBySpecialite.nrt ?? 1);
        const nextCapMedEffectif = Number(perso.capMed ?? 0);
        const nextCapMatEffectif =
          Number(perso.capMat ?? 0) * Number(multiplierBySpecialite.mat ?? 1);
        const nextCapArtEffectif =
          Number(perso.capart ?? 0) * Number(multiplierBySpecialite.art ?? 1);
        const nextPoidsTotal =
          carriedWeapons.reduce(
            (total, arme) => total + Number(arme.poids ?? 0),
            0,
          ) +
          carriedTools.reduce(
            (total, outil) => total + Number(outil.poids ?? 0),
            0,
          ) +
          carriedBags.reduce(
            (total, sac) => total + Number(sac.poids ?? 0),
            0,
          ) +
          carriedResourcesWeight;

        if (
          perso.equippedWeaponId === nextEquippedWeaponId &&
          perso.equippedBagId === nextEquippedBagId &&
          Number(perso.combatEffectif ?? 0) === nextCombatEffectif &&
          Number(perso.capEauEffectif ?? 0) === nextCapEauEffectif &&
          Number(perso.capNrtEffectif ?? 0) === nextCapNrtEffectif &&
          Number(perso.capMedEffectif ?? 0) === nextCapMedEffectif &&
          Number(perso.capMatEffectif ?? 0) === nextCapMatEffectif &&
          Number(perso.capArtEffectif ?? 0) === nextCapArtEffectif &&
          Number(perso.poidsMaxEffectif ?? perso.poidsMax ?? 20) ===
            nextPoidsMaxEffectif &&
          Number(perso.poidsTotal ?? 0) === nextPoidsTotal
        ) {
          return perso;
        }

        return {
          ...perso,
          equippedWeaponId: nextEquippedWeaponId,
          equippedBagId: nextEquippedBagId,
          combatEffectif: nextCombatEffectif,
          capEauEffectif: nextCapEauEffectif,
          capNrtEffectif: nextCapNrtEffectif,
          capMedEffectif: nextCapMedEffectif,
          capMatEffectif: nextCapMatEffectif,
          capArtEffectif: nextCapArtEffectif,
          poidsMaxEffectif: nextPoidsMaxEffectif,
          poidsTotal: nextPoidsTotal,
        };
      }),
    );
  }, [
    resources,
    armes,
    persoArmes,
    outils,
    persoOutils,
    sacs,
    persoSacs,
    persoResources,
    setPersos,
  ]);
};
