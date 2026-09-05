import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

/**
 * Append an audit log entry for any create/edit/verify/delete action.
 */
export async function logAudit(params: {
  patientId: string;
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  details?: Record<string, unknown>;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        patientId: params.patientId,
        actorId: params.actorId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        details: (params.details ?? {}) as Prisma.InputJsonValue,
      },
    });
  } catch (e) {
    // Audit log failure should never crash a user action
    console.error("[AuditLog] Failed to write audit entry:", e);
  }
}
