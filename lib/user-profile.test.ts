import assert from "node:assert/strict";
import test from "node:test";
import { getProfileInitials, getSafeProfileImage } from "./user-profile.ts";

test("uses the user's initials when a profile photo is unavailable", () => {
  assert.equal(getProfileInitials("Matheus Luz", "matheus@example.com"), "ML");
  assert.equal(getProfileInitials(null, "maria.luz@example.com"), "ML");
  assert.equal(getProfileInitials(null, null), "U");
});

test("only renders HTTPS profile image URLs", () => {
  assert.equal(getSafeProfileImage("https://lh3.googleusercontent.com/avatar"), "https://lh3.googleusercontent.com/avatar");
  assert.equal(getSafeProfileImage("javascript:alert(1)"), null);
  assert.equal(getSafeProfileImage(null), null);
});
