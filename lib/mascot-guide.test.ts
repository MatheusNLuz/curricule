import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_GUIDE_PREFERENCES, GUIDE_STEPS, MASCOT_POSES, parseGuidePreferences } from "./mascot-guide.ts";

test("guide preferences accept only explicit booleans and recover from invalid storage", () => {
  for (const value of ["", "{", "null", "[]", '"false"']) assert.deepEqual(parseGuidePreferences(value), DEFAULT_GUIDE_PREFERENCES);
  assert.deepEqual(parseGuidePreferences('{"visible":false,"motion":false,"welcomeDismissed":true,"tutorialSeen":true}'), { visible: false, motion: false, welcomeDismissed: true, tutorialSeen: true });
  assert.deepEqual(parseGuidePreferences('{"visible":"false","motion":0,"tutorialSeen":"true"}'), DEFAULT_GUIDE_PREFERENCES);
});

test("the walkthrough only visits non-processing pages and uses supported mascot poses", () => {
  assert.equal(GUIDE_STEPS.length, 6);
  for (const step of GUIDE_STEPS) {
    const url = new URL(step.path, "https://curricule.example");
    assert.ok(["/analysis/new", "/resumes", "/history"].includes(url.pathname));
    assert.ok(MASCOT_POSES.includes(step.pose));
    assert.ok(step.target);
  }
  assert.equal(new Set(GUIDE_STEPS.map(step => step.target)).size, GUIDE_STEPS.length);
});
