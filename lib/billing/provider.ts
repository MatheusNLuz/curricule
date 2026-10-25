import { z } from "zod";
import { HttpError } from "../http-error";

export const BillingEventSchema = z.object({
  id: z.string().min(1).max(200), occurredAt: z.coerce.date(),
  type: z.enum(["access.updated", "ignored"]),
  access: z.object({ customerId: z.string().min(1).max(200), reference: z.string().min(1).max(200), key: z.literal("analysis"), source: z.enum(["subscription", "purchase"]), status: z.enum(["PENDING", "ACTIVE", "REVOKED", "EXPIRED", "SUSPENDED"]), validUntil: z.coerce.date().nullable() }).strict().optional(),
}).strict().superRefine((event, ctx) => {
  if (event.type === "access.updated" && !event.access) ctx.addIssue({ code: "custom", message: "Missing access" });
  if (event.access?.source === "subscription" && event.access.status === "ACTIVE" && !event.access.validUntil) ctx.addIssue({ code: "custom", message: "Subscriptions require an expiry" });
});
export type BillingEvent = z.infer<typeof BillingEventSchema>;
export interface BillingProvider {
  readonly name: string;
  readonly redirectHosts: readonly string[];
  ensureCustomer(input: { userId: string; email: string; idempotencyKey: string }): Promise<string>;
  createCheckout(input: { customerId: string; offerId: string; successUrl: string; cancelUrl: string; idempotencyKey: string }): Promise<{ url: string }>;
  createPortal(input: { customerId: string; returnUrl: string }): Promise<{ url: string }>;
  // Must verify the provider signature against the ORIGINAL bytes before decoding the event.
  verifyWebhook(raw: Buffer, headers: Headers): Promise<BillingEvent>;
}
export const billingEnabled = () => process.env.BILLING_ENABLED === "true";
// Register a real adapter here only after its signature, retry and refund tests pass.
const providers: Readonly<Record<string, BillingProvider>> = {};
export function getBillingProvider(): BillingProvider {
  if (!billingEnabled()) throw new HttpError(503, "A cobrança ainda não está disponível.");
  const provider = providers[process.env.BILLING_PROVIDER || ""];
  if (!provider) throw new HttpError(503, "O gateway de pagamento ainda não foi configurado.");
  return provider;
}
export function billingReadiness() {
  const configured = !!providers[process.env.BILLING_PROVIDER || ""];
  return { enabled: billingEnabled(), configured, ready: billingEnabled() && configured && !!process.env.BILLING_OFFER_ID };
}
export function safeBillingRedirect(url: string, provider: BillingProvider) {
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.port || !provider.redirectHosts.includes(parsed.hostname)) throw new HttpError(502, "O gateway retornou um endereço inválido.");
  return parsed.href;
}
export function billingReturnUrl() {
  const url = new URL(process.env.APP_URL || "http://localhost:3000");
  if (url.username || url.password || (process.env.NODE_ENV === "production" && url.protocol !== "https:")) throw new HttpError(503, "Configure o endereço público do aplicativo.");
  return new URL("/settings/billing", url.origin).href;
}
