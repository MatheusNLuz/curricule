import { getOAuthCallbackUrl } from "../api-client.ts";

export function createGoogleSignInOptions(nextPath: string | null) {
  return {
    provider: "google" as const,
    callbackURL: getOAuthCallbackUrl(nextPath),
  };
}
