import { z } from "zod";
import { prisma } from "./db";
import { getSessionUser } from "./auth";
import { HttpError } from "./http-error";

export const AdminUserUpdate = z.object({ role: z.enum(["USER", "ADMIN"]), status: z.enum(["ACTIVE", "SUSPENDED"]) }).strict();

export async function requireAdmin() {
  const session = await getSessionUser();
  if (!session) throw new HttpError(401, "Faça login para continuar.");
  // Never trust a role from a token or the client. Revocation takes effect immediately.
  const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { id: true, role: true, status: true } });
  if (!user || user.role !== "ADMIN" || user.status !== "ACTIVE") throw new HttpError(403, "Acesso restrito à administração.");
  return user;
}

export async function updateManagedUser(actorId: string, targetId: string, input: unknown) {
  const change = AdminUserUpdate.parse(input);
  return prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('curriculy-admin-users'))`;
    const actor = await tx.user.findUnique({ where: { id: actorId } });
    if (!actor || actor.role !== "ADMIN" || actor.status !== "ACTIVE") throw new HttpError(403, "Permissão administrativa revogada.");
    const target = await tx.user.findUnique({ where: { id: targetId } });
    if (!target) throw new HttpError(404, "Usuário não encontrado.");
    if (targetId === actorId && (change.role !== "ADMIN" || change.status !== "ACTIVE")) throw new HttpError(409, "Você não pode remover seu próprio acesso administrativo.");
    if (target.role === "ADMIN" && target.status === "ACTIVE" && (change.role !== "ADMIN" || change.status !== "ACTIVE")) {
      const remaining = await tx.user.count({ where: { role: "ADMIN", status: "ACTIVE" } });
      if (remaining <= 1) throw new HttpError(409, "Mantenha pelo menos um administrador ativo.");
    }
    if (target.role === change.role && target.status === change.status) return { id: target.id, ...change };
    const updated = await tx.user.update({ where: { id: targetId }, data: change, select: { id: true, role: true, status: true } });
    await tx.adminAudit.create({ data: { actorId, targetUserId: targetId, action: "USER_ACCESS_CHANGED", details: JSON.stringify({ before: { role: target.role, status: target.status }, after: change }) } });
    return updated;
  });
}
