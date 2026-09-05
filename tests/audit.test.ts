import { describe, it, expect, vi } from "vitest";
import { logAudit } from "../lib/audit";
import { prisma } from "../lib/prisma";

vi.mock("../lib/prisma", () => ({
  prisma: {
    auditLog: {
      create: vi.fn(),
    },
  },
}));

describe("logAudit", () => {
  it("creates an audit log record with actor, action, and entity details", async () => {
    vi.mocked(prisma.auditLog.create).mockResolvedValueOnce({
      id: "audit_1",
      patientId: "patient_1",
      actorId: "actor_1",
      action: "verify_lab_result",
      entityType: "LabResult",
      entityId: "res_1",
      timestamp: new Date(),
      details: { testName: "Hemoglobin" },
    } as any);

    await logAudit({
      patientId: "patient_1",
      actorId: "actor_1",
      action: "verify_lab_result",
      entityType: "LabResult",
      entityId: "res_1",
      details: { testName: "Hemoglobin" },
    });

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        patientId: "patient_1",
        actorId: "actor_1",
        action: "verify_lab_result",
        entityType: "LabResult",
        entityId: "res_1",
      }),
    });
  });

  it("does not throw an unhandled error if database audit logging fails", async () => {
    vi.mocked(prisma.auditLog.create).mockRejectedValueOnce(new Error("DB unavailable"));

    await expect(
      logAudit({
        patientId: "patient_1",
        actorId: "actor_1",
        action: "create_patient",
        entityType: "Patient",
        entityId: "p_1",
      })
    ).resolves.not.toThrow();
  });
});
