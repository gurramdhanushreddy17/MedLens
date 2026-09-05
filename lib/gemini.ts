/**
 * Server-side Google Gemini API wrapper using the official @google/genai SDK.
 * NEVER import this in client components — server-only.
 * Reads API key from process.env.GEMINI_API_KEY (or process.env.GOOGLE_API_KEY).
 */

import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { LabResultExtractedArraySchema } from "./schemas";



const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";
const ai = new GoogleGenAI({ apiKey });

const CANDIDATE_MODELS = [
  "gemini-3.7-flash",
  "gemini-3.5-flash-lite",
  "gemini-3.6-flash",
  "gemini-flash-latest",
];
const MODEL_VERSION = "gemini-3.7-flash";

async function generateWithFallback(options: {
  contents: unknown;
  config?: Record<string, unknown>;
}) {
  let lastError: unknown;
  for (const model of CANDIDATE_MODELS) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: options.contents as Parameters<typeof ai.models.generateContent>[0]["contents"],
        config: options.config as Parameters<typeof ai.models.generateContent>[0]["config"],
      });
      return response;
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.warn(`[Gemini] Model ${model} call failed (${errMsg}). Trying fallback...`);
      lastError = err;
    }
  }
  throw lastError;
}

// ─── Diagnostic/Prescriptive Language Safety Check ────────────────────────────
const DIAGNOSTIC_PATTERNS = [
  /you have\b/i,
  /this means you\b/i,
  /this suggests\b/i,
  /you should (take|stop|increase|decrease|start|change)/i,
  /I (recommend|suggest|advise)/i,
  /diagnos(is|ed|tic)/i,
  /prescri(be|ption)/i,
  /medication (change|adjustment|modification)/i,
  /consult your doctor about changing/i,
  /stop taking/i,
  /increase your dose/i,
  /decrease your dose/i,
];

export function hasDiagnosticLanguage(text: string): boolean {
  return DIAGNOSTIC_PATTERNS.some((pattern) => pattern.test(text));
}

const SUMMARY_DISCLAIMER =
  "This summary is for informational purposes only and organizes existing record data. It is not a medical diagnosis. Please consult a qualified healthcare professional.";

// ─── Extraction Prompt ────────────────────────────────────────────────────────
const EXTRACTION_SYSTEM_PROMPT = `You are a strict medical-report data extractor. You will be given raw text or a document image/PDF from a lab/medical report.

Extract ONLY information explicitly present in the document. Return a JSON array of objects with this exact schema:
[{
  "test_name": string,
  "value": string,
  "unit": string | null,
  "reference_range_low": number | null,
  "reference_range_high": number | null,
  "reference_range_raw": string | null,
  "observation_note": string | null,
  "confidence": number (0 to 1)
}]

Rules:
- If a reference range is not explicitly written in the document, set reference_range_low/high to null. Do NOT use general medical knowledge to fill in a "normal" range.
- If a value is qualitative (e.g. Positive/Negative/Reactive), put it in "value" and leave numeric fields null.
- If you are not confident a line is actually a lab test result, omit it rather than guessing.
- Return ONLY the JSON array. No prose, no markdown, no explanation.`;

// ─── Summary Prompt ───────────────────────────────────────────────────────────
const SUMMARY_SYSTEM_PROMPT = `You are summarizing an existing structured medical record for a patient to read. You are NOT a doctor and must not diagnose, interpret causes, or recommend treatment.

You will receive: patient-provided info (symptoms, conditions, medications, allergies) and structured lab results with flags (low/normal/high/unknown) as already computed by the system — do not recompute or reinterpret flags yourself.

Write a short (120-180 word) plain-language paragraph that:
- Restates what information is currently on record.
- Mentions which lab results are flagged high/low, using only the flag already provided.
- Uses neutral, descriptive language only.

Never say: "you have", "this means you", "this suggests", "you should take/stop/increase", or any diagnostic or prescriptive phrase.
End with exactly: "This summary is for informational purposes only and organizes existing record data. It is not a medical diagnosis. Please consult a qualified healthcare professional."`;

// ─── Clarification Prompt ─────────────────────────────────────────────────────
const CLARIFICATION_SYSTEM_PROMPT = `Given the following incomplete or ambiguous medical record data, generate 1-3 short, specific clarification questions a clinician or patient could answer to complete the record. Do not guess or fill in the missing data yourself. Return a JSON array of strings only, no prose.`;

// ─── API Functions ────────────────────────────────────────────────────────────

/**
 * Extract structured lab results from raw report text using Gemini.
 */
export async function extractLabResults(rawText: string) {
  const response = await generateWithFallback({
    contents: `Extract lab results from this medical report text:\n\n${rawText}`,
    config: {
      systemInstruction: EXTRACTION_SYSTEM_PROMPT,
      responseMimeType: "application/json",
    },
  });

  const text = response.text?.trim() || "";
  let parsed: unknown;
  try {
    const cleaned = text
      .replace(/^```(?:json)?\n?/m, "")
      .replace(/\n?```$/m, "")
      .trim();
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(`Gemini returned invalid JSON: ${text.slice(0, 200)}`);
  }

  const validated = LabResultExtractedArraySchema.safeParse(parsed);
  if (!validated.success) {
    throw new Error(
      `Gemini response failed schema validation: ${validated.error.message}`
    );
  }

  return validated.data;
}

/**
 * Extract structured lab results directly from a PDF or image file buffer using Gemini multimodal.
 */
export async function extractLabResultsFromBuffer(
  fileBuffer: Buffer,
  mimeType: string
) {
  const base64Data = fileBuffer.toString("base64");
  const response = await generateWithFallback({
    contents: [
      {
        inlineData: {
          mimeType,
          data: base64Data,
        },
      },
      "Extract lab results from this medical report. Extract ONLY information explicitly present in the document. Follow the schema and rules strictly.",
    ],
    config: {
      systemInstruction: EXTRACTION_SYSTEM_PROMPT,
      responseMimeType: "application/json",
    },
  });

  const text = response.text?.trim() || "";
  let parsed: unknown;
  try {
    const cleaned = text
      .replace(/^```(?:json)?\n?/m, "")
      .replace(/\n?```$/m, "")
      .trim();
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(`Gemini returned invalid JSON: ${text.slice(0, 200)}`);
  }

  const validated = LabResultExtractedArraySchema.safeParse(parsed);
  if (!validated.success) {
    throw new Error(
      `Gemini response failed schema validation: ${validated.error.message}`
    );
  }

  return validated.data;
}

/**
 * Transcribe the readable contents from a PDF or image file buffer for clinical record archiving.
 */
export async function transcribeDocument(
  fileBuffer: Buffer,
  mimeType: string
): Promise<string> {
  try {
    const base64Data = fileBuffer.toString("base64");
    const response = await generateWithFallback({
      contents: [
        {
          inlineData: {
            mimeType,
            data: base64Data,
          },
        },
        "Transcribe all readable clinical information, patient details, test names, values, units, reference ranges, and observations from this document verbatim. Return the plain text transcription only.",
      ],
    });

    return response.text?.trim() || "";
  } catch {
    return "";
  }
}

interface SummaryInput {
  patientName: string;
  age: number;
  sex: string;
  symptoms: string[];
  conditions: string[];
  allergies: string[];
  medications: Array<{ name: string; dose?: string | null; frequency?: string | null }>;
  labResults: Array<{
    testName: string;
    value: string;
    unit?: string | null;
    flag: string;
    referenceRangeRaw?: string | null;
  }>;
}

/**
 * Generate an AI summary with Gemini and a safety-check wrapper.
 * Regenerates once if diagnostic language is detected.
 * Falls back to a templated summary if still unsafe.
 */
export async function generateSummary(input: SummaryInput): Promise<{
  summaryText: string;
  modelVersion: string;
  usedFallback: boolean;
}> {
  const userContent = buildSummaryUserContent(input);

  const attemptGeneration = async (): Promise<string> => {
    const response = await generateWithFallback({
      contents: userContent,
      config: {
        systemInstruction: SUMMARY_SYSTEM_PROMPT,
      },
    });

    return response.text?.trim() || "";
  };

  try {
    let summaryText = await attemptGeneration();

    if (hasDiagnosticLanguage(summaryText)) {
      // Regenerate once
      summaryText = await attemptGeneration();

      if (hasDiagnosticLanguage(summaryText)) {
        // Fall back to templated summary
        return {
          summaryText: buildFallbackSummary(input),
          modelVersion: MODEL_VERSION,
          usedFallback: true,
        };
      }
    }

    // Ensure disclaimer is always present
    if (!summaryText.includes(SUMMARY_DISCLAIMER)) {
      summaryText = summaryText.trimEnd() + "\n\n" + SUMMARY_DISCLAIMER;
    }

    return { summaryText, modelVersion: MODEL_VERSION, usedFallback: false };
  } catch {
    return {
      summaryText: buildFallbackSummary(input),
      modelVersion: MODEL_VERSION,
      usedFallback: true,
    };
  }
}

function buildSummaryUserContent(input: SummaryInput): string {
  const lines: string[] = [
    `Patient: ${input.patientName}, ${input.age} years old, ${input.sex}`,
    "",
    "Reported symptoms: " + (input.symptoms.join(", ") || "None recorded"),
    "Existing conditions: " + (input.conditions.join(", ") || "None recorded"),
    "Allergies: " + (input.allergies.join(", ") || "None recorded"),
    "Current medications: " +
      (input.medications.length === 0
        ? "None recorded"
        : input.medications
            .map((m) => `${m.name}${m.dose ? ` ${m.dose}` : ""}${m.frequency ? ` ${m.frequency}` : ""}`)
            .join(", ")),
    "",
    "Lab results (flags computed by system, do not recompute):",
  ];

  for (const lr of input.labResults) {
    const range = lr.referenceRangeRaw ? ` [ref: ${lr.referenceRangeRaw}]` : "";
    lines.push(
      `- ${lr.testName}: ${lr.value}${lr.unit ? ` ${lr.unit}` : ""}${range} → FLAG: ${lr.flag.toUpperCase()}`
    );
  }

  return lines.join("\n");
}

function buildFallbackSummary(input: SummaryInput): string {
  const highLow = input.labResults.filter(
    (lr) => lr.flag === "high" || lr.flag === "low"
  );

  const parts: string[] = [
    `The record for ${input.patientName} (${input.age} years old, ${input.sex}) currently includes the following information.`,
  ];

  if (input.symptoms.length > 0) {
    parts.push(`Reported symptoms: ${input.symptoms.join(", ")}.`);
  }
  if (input.conditions.length > 0) {
    parts.push(`Existing conditions on record: ${input.conditions.join(", ")}.`);
  }
  if (input.medications.length > 0) {
    parts.push(
      `Current medications listed: ${input.medications.map((m) => m.name).join(", ")}.`
    );
  }
  if (input.allergies.length > 0) {
    parts.push(`Allergies noted: ${input.allergies.join(", ")}.`);
  }

  if (input.labResults.length > 0) {
    parts.push(`${input.labResults.length} lab result(s) are on record.`);
  }

  if (highLow.length > 0) {
    const described = highLow
      .map((lr) => `${lr.testName} (flagged ${lr.flag})`)
      .join(", ");
    parts.push(`The following results are flagged outside normal range: ${described}.`);
  }

  parts.push(SUMMARY_DISCLAIMER);

  return parts.join(" ");
}

/**
 * Generate clarification questions for incomplete/ambiguous record data.
 */
export async function generateClarificationQuestions(
  context: string
): Promise<string[]> {
  try {
    const response = await generateWithFallback({
      contents: context,
      config: {
        systemInstruction: CLARIFICATION_SYSTEM_PROMPT,
        responseMimeType: "application/json",
      },
    });

    const text = response.text?.trim() || "";
    const cleaned = text
      .replace(/^```(?:json)?\n?/m, "")
      .replace(/\n?```$/m, "")
      .trim();
    const parsed = JSON.parse(cleaned);
    const validated = z.array(z.string()).safeParse(parsed);
    return validated.success ? validated.data : [];
  } catch {
    return [];
  }
}
