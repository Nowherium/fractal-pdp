import test from "node:test";
import assert from "node:assert/strict";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import App from "../src/App";

test("disables current lune and pass-turn controls when there are no persos", () => {
  const markup = renderToStaticMarkup(createElement(App));

  assert.match(markup, /aria-disabled="true"[^>]*>🌘 Lune actuelle/);
  assert.match(markup, /🌘 Lune actuelle[\s\S]*?<input[^>]*disabled=""/);
  assert.match(
    markup,
    /<button[^>]*disabled=""[^>]*>⏭️ Passer le tour<\/button>/,
  );
});
