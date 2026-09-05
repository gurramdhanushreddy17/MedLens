import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { err, serverErr } from "@/lib/api";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

export const dynamic = "force-dynamic";

const DISCLAIMER =
  "This summary is for informational purposes only and organizes existing record data. It is not a medical diagnosis. Please consult a qualified healthcare professional.";

interface Params {
  params: { patientId: string };
}

function wrapText(
  text: string,
  maxWidth: number,
  font: { widthOfTextAtSize: (t: string, s: number) => number },
  fontSize: number
): string[] {
  if (!text) return [];
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const width = font.widthOfTextAtSize(testLine, fontSize);
    if (width <= maxWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

export async function GET(_req: NextRequest, { params }: Params) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  try {
    const patient = await prisma.patient.findUnique({
      where: { id: params.patientId },
      include: {
        profileEntries: true,
        labResults: {
          include: {
            report: { select: { reportDate: true, originalFilename: true } },
          },
          orderBy: { testName: "asc" },
        },
        summaries: {
          orderBy: { generatedAt: "desc" },
          take: 1,
        },
      },
    });

    if (!patient) return err("Patient not found", 404);

    if (auth.user.role !== "admin" && patient.createdBy !== auth.user.id) {
      return err("Access denied", 403);
    }

    const pdfDoc = await PDFDocument.create();
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const helveticaOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

    const pageWidth = 595.28; // A4 width
    const pageHeight = 841.89; // A4 height
    const margin = 40;
    const contentWidth = pageWidth - margin * 2;

    const pages: ReturnType<typeof pdfDoc.addPage>[] = [];
    let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
    pages.push(currentPage);

    let y = pageHeight - margin;

    const ensureSpace = (neededHeight: number) => {
      if (y - neededHeight < margin + 30) {
        currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
        pages.push(currentPage);
        y = pageHeight - margin - 20;
      }
    };

    // ─── Header ──────────────────────────────────────────
    currentPage.drawRectangle({
      x: margin,
      y: y - 48,
      width: contentWidth,
      height: 52,
      color: rgb(0.98, 0.968, 0.949), // Warm cream
      borderColor: rgb(0.906, 0.886, 0.851),
      borderWidth: 1,
    });

    currentPage.drawText("MedLens", {
      x: margin + 14,
      y: y - 22,
      size: 20,
      font: helveticaBold,
      color: rgb(0.878, 0.353, 0.169), // Orange #E05A2B
    });

    currentPage.drawText("Comprehensive Clinical Record & Laboratory Summary", {
      x: margin + 14,
      y: y - 38,
      size: 9.5,
      font: helvetica,
      color: rgb(0.3, 0.3, 0.3),
    });

    const exportDateStr = `Exported: ${new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })}`;

    const dateWidth = helvetica.widthOfTextAtSize(exportDateStr, 9);
    currentPage.drawText(exportDateStr, {
      x: margin + contentWidth - dateWidth - 14,
      y: y - 26,
      size: 9,
      font: helvetica,
      color: rgb(0.4, 0.4, 0.4),
    });

    y -= 66;

    // ─── Patient Demographics ────────────────────────────
    ensureSpace(100);

    currentPage.drawText("PATIENT DEMOGRAPHICS", {
      x: margin,
      y: y,
      size: 11,
      font: helveticaBold,
      color: rgb(0.878, 0.353, 0.169),
    });

    currentPage.drawLine({
      start: { x: margin, y: y - 4 },
      end: { x: margin + contentWidth, y: y - 4 },
      thickness: 1,
      color: rgb(0.906, 0.886, 0.851),
    });

    y -= 20;

    const dobFormatted = patient.dateOfBirth
      ? new Date(patient.dateOfBirth).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "Not recorded";

    const demoFields = [
      ["Full Name", patient.name, "Age / Sex", `${patient.age} years · ${patient.sex}`],
      ["Date of Birth", dobFormatted, "Record ID", patient.id.slice(0, 16)],
      ["Contact Information", patient.contactInfo || "None recorded", "Status", "Active Clinical Record"],
    ];

    for (const [l1, v1, l2, v2] of demoFields) {
      currentPage.drawText(`${l1}:`, { x: margin, y: y, size: 9, font: helveticaBold, color: rgb(0.3, 0.3, 0.3) });
      currentPage.drawText(v1, { x: margin + 95, y: y, size: 9, font: helvetica, color: rgb(0.1, 0.1, 0.1) });

      currentPage.drawText(`${l2}:`, { x: margin + 265, y: y, size: 9, font: helveticaBold, color: rgb(0.3, 0.3, 0.3) });
      currentPage.drawText(v2, { x: margin + 345, y: y, size: 9, font: helvetica, color: rgb(0.1, 0.1, 0.1) });
      y -= 14;
    }

    y -= 10;

    // ─── Clinical Profile (Allergies, Meds, Conditions) ──
    const entriesByCategory = (cat: string) =>
      patient.profileEntries.filter((e) => e.category === cat).map((e) => e.value);

    const conditions = entriesByCategory("existing_condition");
    const allergies = entriesByCategory("allergy");
    const medications = entriesByCategory("medication");
    const symptoms = entriesByCategory("symptom");

    ensureSpace(80);

    currentPage.drawText("CLINICAL PROFILE", {
      x: margin,
      y: y,
      size: 11,
      font: helveticaBold,
      color: rgb(0.878, 0.353, 0.169),
    });

    currentPage.drawLine({
      start: { x: margin, y: y - 4 },
      end: { x: margin + contentWidth, y: y - 4 },
      thickness: 1,
      color: rgb(0.906, 0.886, 0.851),
    });

    y -= 18;

    const profileSections = [
      ["Active Conditions", conditions.length ? conditions.join(", ") : "None reported"],
      ["Known Allergies", allergies.length ? allergies.join(", ") : "No known allergies"],
      ["Current Medications", medications.length ? medications.join(", ") : "None reported"],
      ["Reported Symptoms", symptoms.length ? symptoms.join(", ") : "None reported"],
    ];

    for (const [lbl, val] of profileSections) {
      currentPage.drawText(`${lbl}:`, { x: margin, y: y, size: 9, font: helveticaBold, color: rgb(0.25, 0.25, 0.25) });
      const wrapped = wrapText(val, contentWidth - 120, helvetica, 9);
      currentPage.drawText(wrapped[0] || "None", { x: margin + 115, y: y, size: 9, font: helvetica, color: rgb(0.1, 0.1, 0.1) });
      y -= 14;
      for (let i = 1; i < wrapped.length; i++) {
        ensureSpace(14);
        currentPage.drawText(wrapped[i], { x: margin + 115, y: y, size: 9, font: helvetica, color: rgb(0.1, 0.1, 0.1) });
        y -= 14;
      }
    }

    y -= 10;

    // ─── Laboratory Results Table ─────────────────────────
    if (patient.labResults.length > 0) {
      ensureSpace(80);

      currentPage.drawText(`LABORATORY RESULTS (${patient.labResults.length} Tests Recorded)`, {
        x: margin,
        y: y,
        size: 11,
        font: helveticaBold,
        color: rgb(0.878, 0.353, 0.169),
      });

      currentPage.drawLine({
        start: { x: margin, y: y - 4 },
        end: { x: margin + contentWidth, y: y - 4 },
        thickness: 1,
        color: rgb(0.906, 0.886, 0.851),
      });

      y -= 20;

      // Table Header Row
      currentPage.drawRectangle({
        x: margin,
        y: y - 3,
        width: contentWidth,
        height: 18,
        color: rgb(0.93, 0.94, 0.94),
      });

      currentPage.drawText("Test Name", { x: margin + 6, y: y + 2, size: 8.5, font: helveticaBold, color: rgb(0.2, 0.2, 0.2) });
      currentPage.drawText("Result Value", { x: margin + 180, y: y + 2, size: 8.5, font: helveticaBold, color: rgb(0.2, 0.2, 0.2) });
      currentPage.drawText("Reference Range", { x: margin + 280, y: y + 2, size: 8.5, font: helveticaBold, color: rgb(0.2, 0.2, 0.2) });
      currentPage.drawText("Report Date", { x: margin + 390, y: y + 2, size: 8.5, font: helveticaBold, color: rgb(0.2, 0.2, 0.2) });
      currentPage.drawText("Flag", { x: margin + 465, y: y + 2, size: 8.5, font: helveticaBold, color: rgb(0.2, 0.2, 0.2) });

      y -= 18;

      for (let i = 0; i < patient.labResults.length; i++) {
        const lab = patient.labResults[i];
        ensureSpace(20);

        if (i % 2 === 1) {
          currentPage.drawRectangle({
            x: margin,
            y: y - 3,
            width: contentWidth,
            height: 16,
            color: rgb(0.98, 0.98, 0.97),
          });
        }

        currentPage.drawLine({
          start: { x: margin, y: y - 3 },
          end: { x: margin + contentWidth, y: y - 3 },
          thickness: 0.5,
          color: rgb(0.92, 0.92, 0.92),
        });

        // Test name
        const testNameTrunc = lab.testName.length > 28 ? lab.testName.slice(0, 26) + "…" : lab.testName;
        currentPage.drawText(testNameTrunc, { x: margin + 6, y: y + 1, size: 8.5, font: helvetica, color: rgb(0.1, 0.1, 0.1) });

        // Result value + unit
        const valStr = `${lab.value} ${lab.unit}`;
        currentPage.drawText(valStr, { x: margin + 180, y: y + 1, size: 8.5, font: helveticaBold, color: rgb(0.1, 0.1, 0.1) });

        // Range
        const rangeStr =
          lab.referenceRangeLow !== null && lab.referenceRangeHigh !== null
            ? `${lab.referenceRangeLow} – ${lab.referenceRangeHigh} ${lab.unit}`
            : "—";
        currentPage.drawText(rangeStr, { x: margin + 280, y: y + 1, size: 8, font: helvetica, color: rgb(0.35, 0.35, 0.35) });

        // Date
        const rDate = lab.report.reportDate
          ? new Date(lab.report.reportDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" })
          : "—";
        currentPage.drawText(rDate, { x: margin + 390, y: y + 1, size: 8, font: helvetica, color: rgb(0.4, 0.4, 0.4) });

        // Flag
        const flagText = (lab.flag || "NORMAL").toUpperCase();
        let flagColor = rgb(0.18, 0.5, 0.2); // Green
        if (flagText === "HIGH") flagColor = rgb(0.75, 0.15, 0.15); // Red
        else if (flagText === "LOW") flagColor = rgb(0.85, 0.45, 0.05); // Amber

        currentPage.drawText(flagText, { x: margin + 465, y: y + 1, size: 8, font: helveticaBold, color: flagColor });

        y -= 17;
      }
    }

    y -= 12;

    // ─── AI Clinical Summary ──────────────────────────────
    const summary = patient.summaries[0];
    if (summary?.summaryText) {
      ensureSpace(120);

      currentPage.drawText("CLINICAL OVERVIEW & ANALYSIS", {
        x: margin,
        y: y,
        size: 11,
        font: helveticaBold,
        color: rgb(0.878, 0.353, 0.169),
      });

      currentPage.drawLine({
        start: { x: margin, y: y - 4 },
        end: { x: margin + contentWidth, y: y - 4 },
        thickness: 1,
        color: rgb(0.906, 0.886, 0.851),
      });

      y -= 18;

      const summaryLines = wrapText(summary.summaryText, contentWidth, helvetica, 9);
      for (const line of summaryLines) {
        ensureSpace(14);
        currentPage.drawText(line, { x: margin, y: y, size: 9, font: helvetica, color: rgb(0.15, 0.15, 0.15) });
        y -= 13;
      }

      y -= 6;
      ensureSpace(14);
      const provStr = `Source: Verified Clinical Intelligence Engine · Generated: ${new Date(summary.generatedAt).toLocaleDateString()}`;
      currentPage.drawText(provStr, {
        x: margin,
        y: y,
        size: 7.5,
        font: helveticaOblique,
        color: rgb(0.5, 0.5, 0.5),
      });
      y -= 16;
    }

    // ─── Disclaimer ───────────────────────────────────────
    ensureSpace(50);
    currentPage.drawLine({
      start: { x: margin, y: y },
      end: { x: margin + contentWidth, y: y },
      thickness: 0.5,
      color: rgb(0.85, 0.85, 0.85),
    });
    y -= 12;

    const disclaimerLines = wrapText(DISCLAIMER, contentWidth, helveticaOblique, 7.5);
    for (const line of disclaimerLines) {
      currentPage.drawText(line, { x: margin, y: y, size: 7.5, font: helveticaOblique, color: rgb(0.45, 0.45, 0.45) });
      y -= 10;
    }

    // ─── Footers across all pages ─────────────────────────
    const totalPages = pages.length;
    for (let i = 0; i < totalPages; i++) {
      const p = pages[i];
      p.drawLine({
        start: { x: margin, y: margin + 12 },
        end: { x: margin + contentWidth, y: margin + 12 },
        thickness: 0.5,
        color: rgb(0.88, 0.88, 0.88),
      });

      p.drawText("MedLens Clinical Management System · Confidential Medical Record", {
        x: margin,
        y: margin,
        size: 7.5,
        font: helvetica,
        color: rgb(0.5, 0.5, 0.5),
      });

      const pageStr = `Page ${i + 1} of ${totalPages}`;
      const pageStrW = helvetica.widthOfTextAtSize(pageStr, 7.5);
      p.drawText(pageStr, {
        x: margin + contentWidth - pageStrW,
        y: margin,
        size: 7.5,
        font: helvetica,
        color: rgb(0.5, 0.5, 0.5),
      });
    }

    const pdfBytes = await pdfDoc.save();

    return new NextResponse(pdfBytes as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="medlens-${patient.name.replace(/\s+/g, "-").toLowerCase()}.pdf"`,
        "Content-Length": pdfBytes.byteLength.toString(),
      },
    });
  } catch (e) {
    console.error("PDF generation error:", e);
    return serverErr(e);
  }
}
