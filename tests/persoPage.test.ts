import test from "node:test";
import assert from "node:assert/strict";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import PersoPage from "../src/components/PersoPage";

const persoPageProps = {
  perso: {
    id: 1,
    nom: "Alya",
    pv: 4,
    pvmax: 6,
    capEau: 1,
    capNrt: 1,
    capMed: 0,
    capMat: 0,
    capart: 0,
    cmd: 1,
    combat: 1,
    poidsMax: 20,
    poidsTotal: 2,
    groupId: null,
  },
  resources: [],
  groups: [],
  armes: [],
  persoArmes: [],
  outils: [],
  persoOutils: [],
  sacs: [],
  persoSacs: [],
  persoResources: [],
  handlePersoUpdate: () => undefined,
  handlePersoResourceUpdate: () => undefined,
  handlePersoWeaponsUpdate: () => undefined,
  handlePersoToolsUpdate: () => undefined,
  handlePersoBagsUpdate: () => undefined,
  closePage: () => undefined,
};

test("groups PV and PV max in the perso editor", () => {
  const markup = renderToStaticMarkup(createElement(PersoPage, persoPageProps));

  assert.match(markup, /PV \/ PV max/);
  assert.match(markup, /Actuels/);
  assert.match(markup, /Max/);
  assert.match(markup, /type="number" min="0" step="0\.1" value="4"/);
  assert.match(markup, /type="number" min="0" step="0\.05" value="6"/);
  assert.doesNotMatch(markup, /Poids max<\/span><input[^>]*type="number"/);
  assert.doesNotMatch(markup, />PV actuels<\/span>/);
  assert.doesNotMatch(markup, />PV max<\/span>/);
});
