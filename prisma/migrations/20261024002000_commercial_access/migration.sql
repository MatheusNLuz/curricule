-- AlterTable
ALTER TABLE "User" ADD COLUMN     "role" TEXT NOT NULL DEFAULT 'USER',
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'ACTIVE';

-- CreateTable
CREATE TABLE "AdminAudit" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "targetUserId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingCustomer" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "externalCustomerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BillingCustomer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingEntitlement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "externalReference" TEXT NOT NULL,
    "key" TEXT NOT NULL DEFAULT 'analysis',
    "source" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "validUntil" TIMESTAMP(3),
    "lastEventAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillingEntitlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingWebhook" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BillingWebhook_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdminAudit_createdAt_idx" ON "AdminAudit"("createdAt");

-- CreateIndex
CREATE INDEX "AdminAudit_targetUserId_createdAt_idx" ON "AdminAudit"("targetUserId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "BillingCustomer_userId_provider_key" ON "BillingCustomer"("userId", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "BillingCustomer_provider_externalCustomerId_key" ON "BillingCustomer"("provider", "externalCustomerId");

-- CreateIndex
CREATE INDEX "BillingEntitlement_userId_key_status_idx" ON "BillingEntitlement"("userId", "key", "status");

-- CreateIndex
CREATE UNIQUE INDEX "BillingEntitlement_provider_externalReference_key" ON "BillingEntitlement"("provider", "externalReference");

-- CreateIndex
CREATE UNIQUE INDEX "BillingWebhook_provider_eventId_key" ON "BillingWebhook"("provider", "eventId");

-- AddForeignKey
ALTER TABLE "AdminAudit" ADD CONSTRAINT "AdminAudit_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingCustomer" ADD CONSTRAINT "BillingCustomer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingEntitlement" ADD CONSTRAINT "BillingEntitlement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Domain invariants also apply to operator scripts and future gateway adapters.
ALTER TABLE "User" ADD CONSTRAINT "User_role_check" CHECK ("role" IN ('USER', 'ADMIN'));
ALTER TABLE "User" ADD CONSTRAINT "User_status_check" CHECK ("status" IN ('ACTIVE', 'SUSPENDED'));
ALTER TABLE "BillingEntitlement" ADD CONSTRAINT "BillingEntitlement_status_check" CHECK ("status" IN ('PENDING', 'ACTIVE', 'REVOKED', 'EXPIRED', 'SUSPENDED'));
ALTER TABLE "BillingEntitlement" ADD CONSTRAINT "BillingEntitlement_source_check" CHECK ("source" IN ('subscription', 'purchase'));
ALTER TABLE "BillingEntitlement" ADD CONSTRAINT "BillingEntitlement_key_check" CHECK ("key" = 'analysis');
ALTER TABLE "BillingEntitlement" ADD CONSTRAINT "BillingEntitlement_subscription_expiry_check" CHECK ("source" <> 'subscription' OR "status" <> 'ACTIVE' OR "validUntil" IS NOT NULL);
