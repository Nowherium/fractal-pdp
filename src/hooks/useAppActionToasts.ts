import type {
  Arme,
  Group,
  Lune,
  LuneConstruction,
  Outil,
  Perso,
  Resource,
  Sac,
} from "../types";

interface UseAppActionToastsParams {
  resources: Resource[];
  persos: Perso[];
  groups: Group[];
  constructions: LuneConstruction[];
  lunes: Lune[];
  armes: Arme[];
  outils: Outil[];
  sacs: Sac[];
  addResource: () => void;
  removeResource: (index: number) => void;
  addPerso: () => void;
  removePerso: (index: number) => void;
  addGroup: () => void;
  removeGroup: (groupId: number) => void;
  addConstruction: () => void;
  removeConstruction: (constructionId: string) => void;
  addLune: () => void;
  removeLune: (luneIndex: number) => void;
  addArme: () => void;
  removeArme: (index: number) => void;
  addOutil: () => void;
  removeOutil: (index: number) => void;
  addSac: () => void;
  removeSac: (index: number) => void;
  showToast: (message: string) => void;
}

const getDisplayName = (
  value: string | null | undefined,
  fallback: string,
): string => value || fallback;

export const useAppActionToasts = ({
  resources,
  persos,
  groups,
  constructions,
  lunes,
  armes,
  outils,
  sacs,
  addResource,
  removeResource,
  addPerso,
  removePerso,
  addGroup,
  removeGroup,
  addConstruction,
  removeConstruction,
  addLune,
  removeLune,
  addArme,
  removeArme,
  addOutil,
  removeOutil,
  addSac,
  removeSac,
  showToast,
}: UseAppActionToastsParams) => {
  const handleAddResource = () => {
    addResource();
    showToast("Ressource ajoutée.");
  };

  const handleRemoveResource = (index: number) => {
    const resource = resources[index];
    removeResource(index);
    showToast(
      `Ressource ${getDisplayName(resource?.name, resource?.code?.toUpperCase() || "supprimée")}.`,
    );
  };

  const handleAddPerso = () => {
    addPerso();
    showToast("Membre recruté.");
  };

  const handleRemovePerso = (index: number) => {
    const perso = persos[index];
    removePerso(index);
    showToast(`${getDisplayName(perso?.nom, "Le personnage")} a été renvoyé.`);
  };

  const handleAddGroup = () => {
    addGroup();
    showToast("Groupe créé.");
  };

  const handleRemoveGroup = (groupId: number) => {
    const group = groups.find((item) => item.id === groupId);
    removeGroup(groupId);
    showToast(`${getDisplayName(group?.name, "Le groupe")} a été supprimé.`);
  };

  const handleAddConstruction = () => {
    addConstruction();
    showToast("Chantier ajouté.");
  };

  const handleRemoveConstruction = (constructionId: string) => {
    const construction = constructions.find(
      (item) => item.id === constructionId,
    );
    removeConstruction(constructionId);
    showToast(
      `${getDisplayName(construction?.name, "Le chantier")} a été supprimé.`,
    );
  };

  const handleAddLune = () => {
    addLune();
    showToast("Nouvelle lune ajoutée.");
  };

  const handleRemoveLune = (luneIndex: number) => {
    const luneId = Number(lunes[luneIndex]?.id ?? luneIndex + 1);
    removeLune(luneIndex);
    showToast(`Lune ${luneId} supprimée.`);
  };

  const handleAddArme = () => {
    addArme();
    showToast("Arme ajoutée.");
  };

  const handleRemoveArme = (index: number) => {
    const arme = armes[index];
    removeArme(index);
    showToast(`${getDisplayName(arme?.name, "L'arme")} a été supprimée.`);
  };

  const handleAddOutil = () => {
    addOutil();
    showToast("Outil ajouté.");
  };

  const handleRemoveOutil = (index: number) => {
    const outil = outils[index];
    removeOutil(index);
    showToast(`${getDisplayName(outil?.name, "L'outil")} a été supprimé.`);
  };

  const handleAddSac = () => {
    addSac();
    showToast("Sac ajouté.");
  };

  const handleRemoveSac = (index: number) => {
    const sac = sacs[index];
    removeSac(index);
    showToast(`${getDisplayName(sac?.name, "Le sac")} a été supprimé.`);
  };

  return {
    handleAddResource,
    handleRemoveResource,
    handleAddPerso,
    handleRemovePerso,
    handleAddGroup,
    handleRemoveGroup,
    handleAddConstruction,
    handleRemoveConstruction,
    handleAddLune,
    handleRemoveLune,
    handleAddArme,
    handleRemoveArme,
    handleAddOutil,
    handleRemoveOutil,
    handleAddSac,
    handleRemoveSac,
  };
};
