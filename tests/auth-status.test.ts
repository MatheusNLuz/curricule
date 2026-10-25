import test, { mock } from "node:test";
import assert from "node:assert/strict";
let token: string | undefined;
let persisted: { id: string; email: string; name: string; role: string; status: string } | null;
mock.module("next/headers.js", { namedExports: { cookies: async () => ({ get: () => token ? { value: token } : undefined }) } });
mock.module(new URL("../lib/auth/server.ts", import.meta.url).href, { namedExports: { getNeonAuth: () => null } });
mock.module(new URL("../lib/db.ts", import.meta.url).href, { namedExports: { prisma: { user: { findUnique: async () => persisted } } } });
const { getSessionUser, signToken } = await import("../lib/auth.ts");
test.beforeEach(async () => {
  process.env.JWT_SECRET = "synthetic-test-secret-at-least-32-characters-long";
  persisted = { id: "user-1", email: "actual@example.test", name: "Test", role: "USER", status: "ACTIVE" };
  token = await signToken({ userId: "user-1", email: "old@example.test" });
});
test("legacy authentication refreshes identity and permission from the database", async () => {
  const session = await getSessionUser();
  assert.equal(session?.email, "actual@example.test"); assert.equal(session?.role, "USER");
  persisted!.role = "ADMIN";
  assert.equal((await getSessionUser())?.role, "ADMIN");
});
test("suspension invalidates an otherwise valid existing signed session", async () => {
  persisted!.status = "SUSPENDED";
  assert.equal(await getSessionUser(), null);
});
test("deleted users and invalid signatures cannot retain legacy access", async () => {
  persisted = null; assert.equal(await getSessionUser(), null);
  token += "tampered"; assert.equal(await getSessionUser(), null);
});
