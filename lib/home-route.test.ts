import assert from "node:assert/strict";
import test from "node:test";
import { getHomeRedirect } from "./home-route.ts";

test("sends an authenticated visitor from the landing page to their history", () => {
  assert.equal(getHomeRedirect({ userId: "user-1" }), "/history");
});

test("keeps the landing page for visitors without a session", () => {
  assert.equal(getHomeRedirect(null), null);
});
