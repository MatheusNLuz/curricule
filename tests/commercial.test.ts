import test, { mock } from "node:test";
import assert from "node:assert/strict";
import { HttpError } from "../lib/http-error.ts";
import { type BillingProvider, type BillingEvent, BillingEventSchema, billingReadiness, getBillingProvider, safeBillingRedirect } from "../lib/billing/provider.ts";

type User = { id: string; role: string; status: string };
let session: { userId: string; email: string; role?: string } | null;
let users: User[] = [], audits: unknown[] = [], events: { provider: string; eventId: string; payloadHash: string }[] = [];
type Access = { userId: string; status: string; lastEventAt: Date; validUntil: Date | null };
let access: Access | null = null, customerKnown = true, accessWrites = 0;
const tx = {
  $executeRaw: async () => 1,
  user: {
    findUnique: async ({ where }: { where: { id: string } }) => users.find(user => user.id === where.id) || null,
    count: async () => users.filter(user => user.role === "ADMIN" && user.status === "ACTIVE").length,
    update: async ({ where, data }: { where: { id: string }; data: Partial<User> }) => { const user = users.find(user => user.id === where.id)!; Object.assign(user, data); return user; },
  },
  adminAudit: { create: async (input: unknown) => { audits.push(input); return input; } },
  billingWebhook: {
    findUnique: async ({ where }: { where: { provider_eventId: { provider: string; eventId: string } } }) => events.find(event => event.provider === where.provider_eventId.provider && event.eventId === where.provider_eventId.eventId) || null,
    create: async ({ data }: { data: typeof events[number] }) => { events.push(data); return data; },
  },
  billingCustomer: { findUnique: async () => customerKnown ? { userId: "customer" } : null },
  billingEntitlement: {
    findUnique: async () => access,
    upsert: async ({ create, update }: { create: Access; update: Access }) => { access = access ? { ...access, ...update } : create; accessWrites++; return access; },
  },
};
const prisma = { ...tx, $transaction: async <T>(operation: (db: typeof tx) => Promise<T>) => operation(tx) };
mock.module(new URL("../lib/db.ts", import.meta.url).href, { namedExports: { prisma } });
mock.module(new URL("../lib/auth.ts", import.meta.url).href, { namedExports: { getSessionUser: async () => session } });
const { requireAdmin, updateManagedUser } = await import("../lib/admin.ts");
const { processBillingWebhook, requireAnalysisAccess } = await import("../lib/billing/service.ts");
const adminRoute = await import("../app/api/admin/users/[id]/route.ts");
const checkout = await import("../app/api/billing/checkout/route.ts");
const webhook = await import("../app/api/billing/webhook/route.ts");

test.beforeEach(() => {
  session = { userId: "admin", email: "operator@example.test", role: "ADMIN" };
  users = [{ id: "admin", role: "ADMIN", status: "ACTIVE" }, { id: "customer", role: "USER", status: "ACTIVE" }];
  audits = []; events = []; access = null; customerKnown = true; accessWrites = 0;
  process.env.BILLING_ENABLED = "false"; delete process.env.BILLING_PROVIDER;
});
const expectStatus = (status: number) => (error: unknown) => error instanceof HttpError && error.status === status;

test("admin checks persisted permission, ignoring stale or forged session role", async () => {
  session = null; await assert.rejects(requireAdmin, expectStatus(401));
  session = { userId: "customer", email: "x@example.test", role: "ADMIN" };
  await assert.rejects(requireAdmin, expectStatus(403));
  users[0].status = "SUSPENDED"; session.userId = "admin";
  await assert.rejects(requireAdmin, expectStatus(403));
});
test("admin cannot remove own access or suspend/demote the final active admin", async () => {
  await assert.rejects(() => updateManagedUser("admin", "admin", { role: "USER", status: "ACTIVE" }), expectStatus(409));
  // A concurrent demotion invalidates an already-authenticated actor inside the transaction.
  users[0].role = "USER";
  await assert.rejects(() => updateManagedUser("admin", "customer", { role: "ADMIN", status: "ACTIVE" }), expectStatus(403));
  assert.equal(audits.length, 0);
});
test("user access changes create an audit and reject extra editable fields", async () => {
  await assert.rejects(()=>updateManagedUser("admin","customer",{role:"USER",status:"SUSPENDED"}),expectStatus(400));
  await updateManagedUser("admin", "customer", { role: "USER", status: "SUSPENDED",reason:"Pedido de revisão de acesso" });
  assert.equal(users[1].status, "SUSPENDED"); assert.equal(audits.length, 1);
  assert.doesNotMatch(JSON.stringify(audits), /email|password|resume|token/);
  await assert.rejects(() => updateManagedUser("admin", "customer", { role: "ADMIN", status: "ACTIVE", email: "other@example.test" }));
});
test("actual admin PATCH handler rejects ordinary users before mutating", async () => {
  session!.userId = "customer";
  const response = await adminRoute.PATCH(new Request("https://app.example/api/admin/users/admin", { method: "PATCH", body: JSON.stringify({ role: "USER", status: "SUSPENDED" }) }), { params: Promise.resolve({ id: "admin" }) });
  assert.equal(response.status, 403); assert.equal(audits.length, 0);
});
test("billing is disabled by default and an unregistered gateway fails closed", async () => {
  assert.deepEqual(billingReadiness(), { enabled: false, configured: false, ready: false });
  assert.throws(getBillingProvider, expectStatus(503));
  await requireAnalysisAccess(tx as never, "customer");
  process.env.BILLING_ENABLED = "true"; process.env.BILLING_PROVIDER = "unknown";
  assert.throws(getBillingProvider, expectStatus(503));
  await assert.rejects(() => requireAnalysisAccess(tx as never, "customer"), expectStatus(503));
  assert.equal((await webhook.POST(new Request("https://app.example/api/billing/webhook", { method: "POST", body: "{}" }))).status, 503);
});
test("checkout requires authentication and refuses client-controlled pricing or redirects", async () => {
  session = null;
  assert.equal((await checkout.POST(new Request("https://app.example/api/billing/checkout", { method: "POST", body: "{}" }))).status, 401);
  session = { userId: "customer", email: "x@example.test" };
  assert.equal((await checkout.POST(new Request("https://app.example/api/billing/checkout", { method: "POST", body: JSON.stringify({ amount: 1, successUrl: "https://attacker.example" }) }))).status, 400);
});
function provider(event: BillingEvent): BillingProvider {
  return { name: "fixture", redirectHosts: ["checkout.example.com"], ensureCustomer: async () => "external-customer", createCheckout: async () => ({ url: "https://checkout.example.com" }), createPortal: async () => ({ url: "https://checkout.example.com" }), verifyWebhook: async () => event };
}
function activeEvent(id = "event-1", date = "2026-10-24T12:00:00Z"): BillingEvent {
  return { id, occurredAt: new Date(date), type: "access.updated", access: { customerId: "external-customer", reference: "subscription-1", key: "analysis", source: "subscription", status: "ACTIVE", validUntil: new Date("2026-11-24T12:00:00Z") } };
}
test("payment redirects require an exact, provider-owned HTTPS hostname", () => {
  const gateway = provider(activeEvent());
  assert.equal(safeBillingRedirect("https://checkout.example.com/session", gateway), "https://checkout.example.com/session");
  for (const url of ["http://checkout.example.com", "https://checkout.example.com.attacker.com", "https://user:pass@checkout.example.com", "https://checkout.example.com:8443"]) assert.throws(() => safeBillingRedirect(url, gateway));
});
test("webhooks verify signatures before writing and require linked customers", async () => {
  const gateway = provider(activeEvent()); gateway.verifyWebhook = async () => { throw new HttpError(400, "Invalid signature"); };
  await assert.rejects(() => processBillingWebhook(gateway, Buffer.from("untrusted"), new Headers()), expectStatus(400));
  assert.equal(events.length, 0); assert.equal(accessWrites, 0);
  customerKnown = false;
  await assert.rejects(() => processBillingWebhook(provider(activeEvent()), Buffer.from("valid"), new Headers()), expectStatus(409));
  assert.equal(accessWrites, 0);
});
test("verified duplicate deliveries are idempotent and old events cannot revive revoked access", async () => {
  const original = activeEvent(); const raw = Buffer.from("active");
  await processBillingWebhook(provider(original), raw, new Headers());
  assert.deepEqual(await processBillingWebhook(provider(original), raw, new Headers()), { received: true, duplicate: true });
  assert.equal(accessWrites, 1);
  const revoked = activeEvent("event-2", "2026-10-24T13:00:00Z"); revoked.access!.status = "REVOKED";
  await processBillingWebhook(provider(revoked), Buffer.from("revoked"), new Headers());
  await processBillingWebhook(provider(activeEvent("event-old")), Buffer.from("old"), new Headers());
  assert.equal(access!.status, "REVOKED"); assert.equal(accessWrites, 2);
  const sameTime = activeEvent("event-equal", "2026-10-24T13:00:00Z");
  await processBillingWebhook(provider(sameTime), Buffer.from("equal"), new Headers());
  assert.equal(access!.status, "REVOKED");
});
test("active subscriptions require an expiration and replay IDs cannot change content", async () => {
  const invalid = activeEvent(); invalid.access!.validUntil = null;
  assert.equal(BillingEventSchema.safeParse(invalid).success, false);
  const event = activeEvent(); await processBillingWebhook(provider(event), Buffer.from("original"), new Headers());
  await assert.rejects(() => processBillingWebhook(provider(event), Buffer.from("changed"), new Headers()), expectStatus(409));
});
