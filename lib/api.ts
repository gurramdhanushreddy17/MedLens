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

/**
 * Constructs a standardized successful API response envelope.
 * @param data The payload to return in `data`
 * @param status HTTP response code (defaults to 200)
 */
export function ok<T>(data: T, status = 200): NextResponse<ApiSuccess<T>> {
  return NextResponse.json({ success: true, data }, { status });
}

/**
 * Constructs a standardized client error response envelope.
 * @param message Human-readable error explanation
 * @param status HTTP client error code (defaults to 400)
 * @param details Optional structured error metadata
 */
export function err(
  message: string,
  status = 400,
  details?: unknown
): NextResponse<ApiError> {
  return NextResponse.json({ success: false, error: message, details }, { status });
}

/**
 * Transforms Zod schema validation errors into a formatted 422 Unprocessable Entity response.
 * @param error The ZodError containing field-level issues
 */
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

/**
 * Handles unexpected server errors gracefully with a 500 status code and diagnostic logging.
 * @param e The caught error or exception
 */
export function serverErr(e: unknown): NextResponse<ApiError> {
  console.error("[API Error]", e);
  const message =
    e instanceof Error ? e.message : "An unexpected error occurred";
  return NextResponse.json({ success: false, error: message }, { status: 500 });
}
