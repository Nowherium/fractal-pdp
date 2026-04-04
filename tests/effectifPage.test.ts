import test from "node:test";
import assert from "node:assert/strict";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import EffectifPage from "../src/components/EffectifPage";

const effectifPageProps = {
  persos: [
    {
      id: 1,
      nom: "Alya",
      pv: 5,
      pvmax: 5,
      capEau: 2,
      capNrt: 1,
      capMed: 0,
      capMat: 0,
      capart: 0,
      cmd: 1,
      combat: 1,
      present: true,
    },
  ],
  resources: [
    { id: 1, code: "eau", name: "Eau" },
    { id: 2, code: "nrt", name: "Nourriture" },
    { id: 3, code: "med", name: "Médicaments" },
  ],
  persoResources: [
    { perso_id: 1, resource_id: 1, quantity: 3.24 },
    { perso_id: 1, resource_id: 2, quantity: 2.06 },
    { perso_id: 1, resource_id: 3, quantity: 1.01 },
  ],
  removePerso: () => undefined,
  addPerso: () => undefined,
  openPersoPage: () => undefined,
  updatePersoPresence: () => undefined,
  handlePersoResourceUpdate: () => undefined,
  exchangeCityStocksWithPersos: false,
  setExchangeCityStocksWithPersos: () => undefined,
};

test("hides quick stock edit inputs by default in the effectif table", () => {
  const markup = renderToStaticMarkup(
    createElement(EffectifPage, effectifPageProps),
  );

  assert.doesNotMatch(markup, /aria-label="Stock eau de Alya"/);
  assert.match(markup, /Afficher les stocks/);
  assert.doesNotMatch(markup, /échange ville &lt;=&gt; persos/);
  assert.match(markup, /peer-checked:translate-x-4/);
});

test("shows quick stock edit inputs when stock visibility is controlled externally", () => {
  const markup = renderToStaticMarkup(
    createElement(EffectifPage, {
      ...effectifPageProps,
      showStocks: true,
    }),
  );

  assert.match(markup, /aria-label="Stock eau de Alya"/);
  assert.match(markup, /aria-label="Stock nrt de Alya"/);
  assert.match(markup, /aria-label="Stock med de Alya"/);
  assert.match(markup, /value="3\.2"/);
  assert.match(markup, /value="2\.1"/);
  assert.match(markup, /value="1"/);
});

test("marks a zero-pv personnage as a cadavre while keeping edit actions visible", () => {
  const markup = renderToStaticMarkup(
    createElement(EffectifPage, {
      ...effectifPageProps,
      persos: [{ ...effectifPageProps.persos[0]!, pv: 0 }],
    }),
  );

  assert.match(markup, /Cadavre/i);
  assert.match(markup, /Modifier/);
  assert.match(markup, /Présence de Alya/);
});
