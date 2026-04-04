import test from "node:test";
import assert from "node:assert/strict";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import ExchangeModeToggle from "../src/components/shared/ExchangeModeToggle";

test("shows a visible warning when exchange mode is inactive", () => {
  const markup = renderToStaticMarkup(
    createElement(ExchangeModeToggle, {
      checked: false,
      onChange: () => undefined,
    }),
  );

  assert.match(markup, /échange ville &lt;=&gt; persos/);
  assert.match(markup, /warning/i);
  assert.match(markup, /inactif/i);
});

test("shows an active status when exchange mode is enabled", () => {
  const markup = renderToStaticMarkup(
    createElement(ExchangeModeToggle, {
      checked: true,
      onChange: () => undefined,
    }),
  );

  assert.match(markup, /mode actif/i);
  assert.doesNotMatch(markup, /warning/i);
});
