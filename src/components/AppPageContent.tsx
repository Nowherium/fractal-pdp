import type { ComponentProps } from "react";

import ReservePage from "./ReservePage";
import ResourcesPage from "./ResourcesPage";
import EffectifPage from "./EffectifPage";
import PersoPage from "./PersoPage";
import GroupPage from "./GroupPage";
import GroupEditPage from "./GroupEditPage";
import GroupViewPage from "./GroupViewPage";
import ChantiersPage from "./ChantiersPage";
import TimelinePage from "./TimelinePage";
import WeaponsPage from "./WeaponsPage";
import ToolsPage from "./ToolsPage";
import BagsPage from "./BagsPage";

import type { AppPage, Group, Perso } from "../types";

type ReserveDomainProps = Pick<
  ComponentProps<typeof ReservePage>,
  | "resources"
  | "stocks"
  | "cityMultipliers"
  | "handleStockChange"
  | "handleCityMultiplierChange"
  | "armes"
  | "persoArmes"
  | "outils"
  | "persoOutils"
  | "sacs"
  | "persoSacs"
>;

type ResourcesDomainProps = ComponentProps<typeof ResourcesPage>;

type EffectifDomainProps = Pick<
  ComponentProps<typeof EffectifPage>,
  | "persos"
  | "resources"
  | "persoResources"
  | "removePerso"
  | "addPerso"
  | "openPersoPage"
  | "updatePersoPresence"
  | "handlePersoResourceUpdate"
  | "showStocks"
  | "setShowStocks"
>;

type GroupDomainProps = {
  list: ComponentProps<typeof GroupPage>;
  edit: Pick<
    ComponentProps<typeof GroupEditPage>,
    "persos" | "handleGroupUpdate" | "handleGroupMembersUpdate" | "closePage"
  >;
  view: Pick<
    ComponentProps<typeof GroupViewPage>,
    "persos" | "openEditPage" | "closePage"
  >;
  groups: Group[];
  selectedGroupId: number | null;
};

type PersoDomainProps = Pick<
  ComponentProps<typeof PersoPage>,
  | "resources"
  | "groups"
  | "armes"
  | "persoArmes"
  | "outils"
  | "persoOutils"
  | "sacs"
  | "persoSacs"
  | "persoResources"
  | "handlePersoUpdate"
  | "handlePersoResourceUpdate"
  | "handlePersoWeaponsUpdate"
  | "handlePersoToolsUpdate"
  | "handlePersoBagsUpdate"
  | "closePage"
> & {
  persos: Perso[];
  selectedPersoId: number | null;
};

type ChantiersDomainProps = Pick<
  ComponentProps<typeof ChantiersPage>,
  | "constructions"
  | "resources"
  | "constructionProgress"
  | "addConstruction"
  | "updateConstruction"
  | "removeConstruction"
> & {
  constructionStates: ComponentProps<
    typeof ChantiersPage
  >["constructionStates"];
};

type TimelineDomainProps = Pick<
  ComponentProps<typeof TimelinePage>,
  | "currentLune"
  | "resources"
  | "constructions"
  | "timelineData"
  | "removeLune"
  | "updateLuneGlobal"
  | "updateRation"
  | "toggleConstructionPlacement"
  | "toggleOverrideMenu"
  | "openOverrides"
  | "setOverride"
  | "clearOverrides"
  | "addLune"
>;

type WeaponsDomainProps = ComponentProps<typeof WeaponsPage>;
type ToolsDomainProps = ComponentProps<typeof ToolsPage>;
type BagsDomainProps = ComponentProps<typeof BagsPage>;

interface AppPageContentProps {
  page: AppPage;
  reserveProps: ReserveDomainProps;
  resourcesProps: ResourcesDomainProps;
  effectifProps: EffectifDomainProps;
  groupProps: GroupDomainProps;
  persoProps: PersoDomainProps;
  chantiersProps: ChantiersDomainProps;
  timelineProps: TimelineDomainProps;
  weaponsProps: WeaponsDomainProps;
  toolsProps: ToolsDomainProps;
  bagsProps: BagsDomainProps;
}

function AppPageContent({
  page,
  reserveProps,
  resourcesProps,
  effectifProps,
  groupProps,
  persoProps,
  chantiersProps,
  timelineProps,
  weaponsProps,
  toolsProps,
  bagsProps,
}: AppPageContentProps) {
  switch (page) {
    case "reserve":
      return <ReservePage {...reserveProps} />;
    case "resources":
      return <ResourcesPage {...resourcesProps} />;
    case "effectif":
      return <EffectifPage {...effectifProps} />;
    case "groupes":
      return <GroupPage {...groupProps.list} />;
    case "group-view":
      return (
        <GroupViewPage
          group={groupProps.groups.find(
            (group) => group.id === groupProps.selectedGroupId,
          )}
          {...groupProps.view}
        />
      );
    case "group":
      return (
        <GroupEditPage
          group={groupProps.groups.find(
            (group) => group.id === groupProps.selectedGroupId,
          )}
          {...groupProps.edit}
        />
      );
    case "perso":
      return (
        <PersoPage
          perso={persoProps.persos.find(
            (perso) => perso.id === persoProps.selectedPersoId,
          )}
          {...persoProps}
        />
      );
    case "chantiers":
      return <ChantiersPage {...chantiersProps} />;
    case "timeline":
      return <TimelinePage {...timelineProps} />;
    case "armes":
      return <WeaponsPage {...weaponsProps} />;
    case "outils":
      return <ToolsPage {...toolsProps} />;
    case "sacs":
      return <BagsPage {...bagsProps} />;
    default:
      return null;
  }
}

export default AppPageContent;
