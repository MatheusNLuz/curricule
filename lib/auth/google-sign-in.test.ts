import assert from "node:assert/strict";
import test from "node:test";
import { createGoogleSignInOptions } from "./google-sign-in.ts";

test("Google sign-in preserves a safe in-app destination", () => {
  assert.deepEqual(createGoogleSignInOptions("/analysis/new?mode=OPTIMIZE_FOR_JOB"), {
    provider: "google",
    callbackURL: "/analysis/new?mode=OPTIMIZE_FOR_JOB",
  });
});

test("Google sign-in falls back to home for an external destination", () => {
  assert.deepEqual(createGoogleSignInOptions("//attacker.example"), {
    provider: "google",
    callbackURL: "/",
  });
});
