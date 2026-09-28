import assert from "node:assert/strict";
import test from "node:test";
import { createLogoutRedirectResponse } from "./logout-response.ts";

test("logout redirects to a same-origin path instead of Render's internal host", () => {
  const response = createLogoutRedirectResponse();

  assert.equal(response.status, 303);
  assert.equal(response.headers.get("location"), "/login");
});
