import assert from "node:assert/strict";
import test from "node:test";
import { hasNeonOAuthSessionCallback } from "./oauth-callback.ts";

const callbackUrl = "http://localhost:3000/?neon_auth_session_verifier=verified-token";

test("recognizes the Neon OAuth callback when its verifier and challenge cookie are present", () => {
  assert.equal(
    hasNeonOAuthSessionCallback(
      callbackUrl,
      "__Secure-neon-auth.session_challenge=challenge-token",
    ),
    true,
  );
});

test("does not treat a public-page request without the OAuth challenge as a callback", () => {
  assert.equal(
    hasNeonOAuthSessionCallback(callbackUrl, "__Secure-neon-auth.session_token=session-token"),
    false,
  );
  assert.equal(
    hasNeonOAuthSessionCallback("http://localhost:3000/", "__Secure-neon-auth.session_challenge=challenge-token"),
    false,
  );
});

test("recognizes Neon Auth's legacy misspelled challenge cookie", () => {
  assert.equal(
    hasNeonOAuthSessionCallback(
      callbackUrl,
      "__Secure-neon-auth.session_challange=challenge-token",
    ),
    true,
  );
});
