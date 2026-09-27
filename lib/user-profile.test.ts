import assert from "node:assert/strict";
import test from "node:test";
import { getPreferredProfileName, getProfileInitials, getSafeProfileImage } from "./user-profile.ts";

test("uses the user's initials when a profile photo is unavailable", () => {
  assert.equal(getProfileInitials("Matheus Luz", "matheus@example.com"), "ML");
  assert.equal(getProfileInitials("Matheus", "matheus.n.luz24@example.com"), "M");
  assert.equal(getProfileInitials(null, "maria.luz@example.com"), "M");
  assert.equal(getProfileInitials(null, null), "U");
});

test("keeps an existing full profile name when the provider only returns a first name", () => {
  assert.equal(getPreferredProfileName("Matheus Luz", "Matheus"), "Matheus Luz");
  assert.equal(getPreferredProfileName("Matheus Luz", "Matheus Nunes Luz"), "Matheus Nunes Luz");
  assert.equal(getPreferredProfileName(null, "Matheus Luz"), "Matheus Luz");
});

test("only renders HTTPS profile image URLs", () => {
  assert.equal(getSafeProfileImage("https://lh3.googleusercontent.com/avatar"), "https://lh3.googleusercontent.com/avatar");
  assert.equal(getSafeProfileImage("javascript:alert(1)"), null);
  assert.equal(getSafeProfileImage(null), null);
});
