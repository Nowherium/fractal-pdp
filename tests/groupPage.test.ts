import test from "node:test";
import assert from "node:assert/strict";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import GroupPage from "../src/components/GroupPage";
import GroupViewPage from "../src/components/GroupViewPage";

const groups = [{ id: 1, name: "Alpha", chef: 1 }];
const persos = [
  {
    id: 1,
    nom: "Alya",
    groupId: 1,
    pv: 5,
    capEau: 1.33,
    capEauEffectif: 9.33,
    capNrt: 0.7,
    capNrtEffectif: 5.7,
    capMed: 0.4,
    capMedEffectif: 4.4,
    capMat: 0.1,
    capMatEffectif: 3.1,
    capArt: 0.2,
    capArtEffectif: 2.2,
    combat: 1.1,
    combatEffectif: 7.1,
    poidsTotal: 2,
  },
  {
    id: 2,
    nom: "Bram",
    groupId: 1,
    pv: 5,
    capEau: 0.22,
    capEauEffectif: 5.22,
    capNrt: 0.3,
    capNrtEffectif: 4.3,
    capMed: 0.2,
    capMedEffectif: 3.2,
    capMat: 0.1,
    capMatEffectif: 2.1,
    capArt: 0.1,
    capArtEffectif: 1.1,
    combat: 0.2,
    combatEffectif: 5.2,
    poidsTotal: 1,
  },
  {
    id: 3,
    nom: "Cad",
    groupId: 1,
    pv: 0,
    capEau: 4,
    capEauEffectif: 8,
    combat: 3,
    combatEffectif: 6,
    poidsTotal: 2,
  },
];

test("shows raw group totals in the groups list", () => {
  const markup = renderToStaticMarkup(
    createElement(GroupPage, {
      groups,
      persos,
      openGroupPage: () => undefined,
      openGroupViewPage: () => undefined,
      addGroup: () => undefined,
      removeGroup: () => undefined,
      setGroupPresence: () => undefined,
    }),
  );

  assert.match(markup, /Alpha/);
  assert.match(markup, /1\.55/);
  assert.match(markup, /12\.30/);
  assert.doesNotMatch(markup, /14\.55/);
  assert.doesNotMatch(markup, /1\.30/);
});

test("shows raw perso stats in the group detail page", () => {
  const markup = renderToStaticMarkup(
    createElement(GroupViewPage, {
      group: groups[0],
      persos,
      closePage: () => undefined,
      openEditPage: () => undefined,
    }),
  );

  assert.match(markup, /1\.33/);
  assert.match(markup, /0\.22/);
  assert.match(markup, /7\.10/);
  assert.doesNotMatch(markup, /9\.33/);
  assert.doesNotMatch(markup, /5\.22/);
  assert.doesNotMatch(markup, /1\.10/);
});
