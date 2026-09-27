import assert from "node:assert/strict";
import test from "node:test";
import { resolveAnalysisMode } from "./analysis-modes.ts";

test("recognizes every existing analysis mode without changing stored identifiers", () => {
  const validModes = [
    "MAKE_ATS_FRIENDLY",
    "COMPARE_AGAINST_JOB",
    "OPTIMIZE_FOR_JOB",
    "LINKEDIN_OPTIMIZATION",
    "COVER_LETTER_ONLY",
  ];

  for (const mode of validModes) assert.equal(resolveAnalysisMode(mode), mode);
});

test("does not silently choose an analysis mode for missing or unknown input", () => {
  assert.equal(resolveAnalysisMode(null), null);
  assert.equal(resolveAnalysisMode(""), null);
  assert.equal(resolveAnalysisMode("UNKNOWN_MODE"), null);
});
