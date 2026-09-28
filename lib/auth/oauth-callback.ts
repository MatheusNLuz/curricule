import { NEON_AUTH_SESSION_CHALLENGE_COOKIE_NAME } from "@neondatabase/auth/server";

const LEGACY_SESSION_CHALLENGE_COOKIE_NAME = "__Secure-neon-auth.session_challange";

export function hasNeonOAuthSessionCallback(url: string, cookieHeader: string | null) {
  if (!new URL(url).searchParams.has("neon_auth_session_verifier") || !cookieHeader) return false;

  const cookieNames = new Set(
    cookieHeader.split(";").map((cookie) => cookie.trim().split("=", 1)[0]),
  );

  return (
    cookieNames.has(NEON_AUTH_SESSION_CHALLENGE_COOKIE_NAME) ||
    cookieNames.has(LEGACY_SESSION_CHALLENGE_COOKIE_NAME)
  );
}
