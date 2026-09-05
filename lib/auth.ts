import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/authOptions";
import { err } from "./api";
import type { NextRequest } from "next/server";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

/**
 * Get the authenticated session user, or return a 401 error response.
 */
export async function requireAuth(): Promise<
  { user: SessionUser } | { error: ReturnType<typeof err> }
> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { error: err("Authentication required", 401) };
  }
  return { user: session.user as SessionUser };
}

/**
 * Get the authenticated admin user, or return a 403 error response.
 */
export async function requireAdmin(): Promise<
  { user: SessionUser } | { error: ReturnType<typeof err> }
> {
  const result = await requireAuth();
  if ("error" in result) return result;

  if (result.user.role !== "admin") {
    return { error: err("Admin access required", 403) };
  }
  return result;
}

/**
 * Check if the session user can access a patient's record.
 * Administrators can access all patients.
 */
export async function canAccessPatient(
  _req: NextRequest,
  patientCreatedBy: string
): Promise<boolean> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return false;

  const user = session.user as SessionUser;
  if (user.role === "admin") return true;
  return user.id === patientCreatedBy;
}
