import { NextResponse } from "next/server";
import type { ZodError } from "zod";

export type ApiSuccess<T> = {
  success: true;
  data: T;
};

export type ApiError = {
  success: false;
  error: string;
  details?: unknown;
};

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export function ok<T>(data: T, status = 200): NextResponse<ApiSuccess<T>> {
  return NextResponse.json({ success: true, data }, { status });
}

export function err(
  message: string,
  status = 400,
  details?: unknown
): NextResponse<ApiError> {
  return NextResponse.json({ success: false, error: message, details }, { status });
}

export function zodErr(error: ZodError): NextResponse<ApiError> {
  return NextResponse.json(
    {
      success: false,
      error: "Validation failed",
      details: error.flatten(),
    },
    { status: 422 }
  );
}

export function serverErr(e: unknown): NextResponse<ApiError> {
  console.error("[API Error]", e);
  const message =
    e instanceof Error ? e.message : "An unexpected error occurred";
  return NextResponse.json({ success: false, error: message }, { status: 500 });
}
