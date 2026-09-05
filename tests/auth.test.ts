import { describe, it, expect, vi } from "vitest";
import { requireAuth, requireAdmin, canAccessPatient } from "../lib/auth";
import { getServerSession } from "next-auth";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

describe("Authentication & Authorization Guards", () => {
  it("requireAuth returns 401 error response when no session is present", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null);

    const result = await requireAuth();
    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect(result.error.status).toBe(401);
    }
  });

  it("requireAuth returns user when authenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: "user_1", name: "Admin", email: "admin@medlens.dev", role: "admin" },
    });

    const result = await requireAuth();
    expect("user" in result).toBe(true);
    if ("user" in result) {
      expect(result.user.id).toBe("user_1");
      expect(result.user.role).toBe("admin");
    }
  });

  it("requireAdmin returns 403 error for non-admin roles", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: "user_2", name: "Clinician", email: "doc@medlens.dev", role: "clinician" },
    });

    const result = await requireAdmin();
    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect(result.error.status).toBe(403);
    }
  });

  it("canAccessPatient allows admin to access any patient", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: "admin_id", role: "admin" },
    });

    const access = await canAccessPatient({} as any, "other_user_id");
    expect(access).toBe(true);
  });

  it("canAccessPatient denies unauthenticated user", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null);
    const access = await canAccessPatient({} as any, "user_id");
    expect(access).toBe(false);
  });
});
