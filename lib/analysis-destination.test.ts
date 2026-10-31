import test from "node:test";
import assert from "node:assert/strict";
import { getAnalysisDestination } from "./analysis-destination.ts";

const draft = { id: "example", mode: "MAKE_ATS_FRIENDLY", hasAnalysis: false, hasResume: false, hasLetter: false };

test("a stored resume opens its preview even when there is no initial assessment", () => {
  assert.equal(getAnalysisDestination({ ...draft, hasResume: true }), "/analysis/example/preview");
  assert.equal(getAnalysisDestination({ ...draft, hasResume: true, hasAnalysis: true }), "/analysis/example/preview");
});

test("drafts, assessments, letters and running tasks retain their own destinations", () => {
  assert.equal(getAnalysisDestination(draft), "/analysis/new?mode=MAKE_ATS_FRIENDLY&draft=example");
  assert.equal(getAnalysisDestination({ ...draft, hasAnalysis: true }), "/analysis/example");
  assert.equal(getAnalysisDestination({ ...draft, hasLetter: true }), "/analysis/example");
  assert.equal(getAnalysisDestination({ ...draft, hasResume: true, running: true }), "/analysis/example");
});

test("LinkedIn results open their dashboard rather than the resume preview", () => {
  assert.equal(getAnalysisDestination({ ...draft, mode: "LINKEDIN_OPTIMIZATION", hasResume: true }), "/analysis/example");
});
