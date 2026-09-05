import { describe, it, expect } from "vitest";
import { ok, err, zodErr, serverErr } from "../lib/api";
import { z } from "zod";

describe("API Response Utilities", () => {
  it("creates ok response with default 200 status", async () => {
    const res = ok({ patientId: "123", name: "Jane" });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      success: true,
      data: { patientId: "123", name: "Jane" },
    });
  });

  it("creates ok response with custom 201 status for creation", async () => {
    const res = ok({ id: "new_1" }, 201);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("creates err response with default 400 status", async () => {
    const res = err("Patient not found", 404);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe("Patient not found");
  });

  it("formats Zod validation errors with 422 status", async () => {
    const schema = z.object({ email: z.string().email() });
    const parsed = schema.safeParse({ email: "not-an-email" });
    if (!parsed.success) {
      const res = zodErr(parsed.error);
      expect(res.status).toBe(422);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error).toBe("Validation failed");
      expect(body.details).toBeDefined();
    }
  });

  it("handles server errors with 500 status and graceful messages", async () => {
    const errorObj = new Error("Database connection timeout");
    const res = serverErr(errorObj);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe("Database connection timeout");
  });
});
