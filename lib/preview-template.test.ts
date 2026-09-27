import assert from "node:assert/strict";
import test from "node:test";
import { normalizeTemplateId } from "./preview-template.ts";

test("keeps the selected modern template for the live preview", () => {
  assert.equal(normalizeTemplateId("modern-ats"), "modern-ats");
});

test("falls back to the basic template when the selection is missing or unknown", () => {
  assert.equal(normalizeTemplateId(undefined), "basic-ats");
  assert.equal(normalizeTemplateId("unknown-template"), "basic-ats");
});
