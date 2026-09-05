import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { ok, err, serverErr } from "@/lib/api";

interface Params {
  params: { id: string };
}

// PATCH /api/inconsistencies/[id]/resolve — mark an inconsistency as resolved
export async function PATCH(_req: NextRequest, { params }: Params) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  try {
    const flag = await prisma.inconsistencyFlag.findUnique({
      where: { id: params.id },
      include: { patient: true },
    });

    if (!flag) return err("Inconsistency flag not found", 404);

    const f = flag as typeof flag & { patient: { createdBy: string } };
    if (auth.user.role !== "admin" && f.patient.createdBy !== auth.user.id) {
      return err("Access denied", 403);
    }

    const updated = await prisma.inconsistencyFlag.update({
      where: { id: params.id },
      data: {
        resolved: true,
        resolvedBy: auth.user.id,
        resolvedAt: new Date(),
      },
    });

    return ok(updated);
  } catch (e) {
    return serverErr(e);
  }
}
