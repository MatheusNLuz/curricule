/** Operator-only bootstrap. Never expose this operation as a public HTTP endpoint. */
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient({ log: [] });
const userId = process.argv[process.argv.indexOf("--user-id") + 1];
if (!process.argv.includes("--user-id") || !userId || userId.startsWith("--")) throw new Error("Usage: node --env-file=.env --import ./tests/register.mjs scripts/promote-admin.ts --user-id USER_ID");
try {
  await prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('curriculy-admin-users'))`;
    const user = await tx.user.findUnique({ where: { id: userId }, select: { role: true, status: true } });
    if (!user) throw new Error("User ID not found. Create the account first.");
    if (user.status !== "ACTIVE") throw new Error("Suspended users cannot be promoted by this bootstrap.");
    if (user.role === "ADMIN") return;
    await tx.user.update({ where: { id: userId }, data: { role: "ADMIN" } });
    await tx.adminAudit.create({ data: { actorId: null, targetUserId: userId, action: "ADMIN_BOOTSTRAPPED", details: JSON.stringify({ before: { role: user.role }, after: { role: "ADMIN" } }) } });
  });
  console.log("Administrative access is ready for the specified user ID.");
} finally { await prisma.$disconnect(); }
