import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

/**
 * Writes an AuditLog row for an admin action.
 *
 * Sessions are signed tokens; in sandbox mode a session may belong to a
 * fixture user that has no AdminUser row. The audit record must still be
 * written, so on a foreign-key failure the row is kept with `userId: null`
 * and the acting user is preserved inside `details.actorId`.
 */
export async function writeAudit(args: Prisma.AuditLogCreateArgs) {
  try {
    return await db.auditLog.create(args);
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === "P2003" && args.data.userId) {
      const details = (args.data.details && typeof args.data.details === "object" ? args.data.details : {}) as Record<string, unknown>;
      return db.auditLog.create({
        ...args,
        data: { ...args.data, userId: null, details: { ...details, actorId: args.data.userId } },
      });
    }
    throw error;
  }
}
