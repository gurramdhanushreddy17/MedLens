import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { err, serverErr } from "@/lib/api";
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import React from "react";

const DISCLAIMER =
  "This summary is for informational purposes only and organizes existing record data. It is not a medical diagnosis. Please consult a qualified healthcare professional.";

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    padding: 48,
    color: "#1C1917",
    backgroundColor: "#FAF7F2",
  },
  header: {
    marginBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#E7E2D9",
    paddingBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#E05A2B",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 11,
    color: "#1C1917",
    opacity: 0.7,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#E05A2B",
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#E7E2D9",
  },
  row: {
    flexDirection: "row",
    marginBottom: 4,
  },
  label: {
    width: 120,
    color: "#101826",
    opacity: 0.7,
  },
  value: {
    flex: 1,
    color: "#101826",
  },
  labTable: {
    marginTop: 4,
  },
  labHeader: {
    flexDirection: "row",
    backgroundColor: "#DDE2E0",
    padding: 6,
    marginBottom: 2,
    fontWeight: "bold",
  },
  labRow: {
    flexDirection: "row",
    padding: 5,
    borderBottomWidth: 1,
    borderBottomColor: "#DDE2E0",
  },
  labRowAlt: {
    backgroundColor: "#F7F8F6",
  },
  col1: { width: "30%" },
  col2: { width: "15%" },
  col3: { width: "15%" },
  col4: { width: "25%" },
  col5: { width: "15%" },
  flagHigh: { color: "#B3492F" },
  flagLow: { color: "#B7822A" },
  flagNormal: { color: "#3F7A54" },
  flagUnknown: { color: "#101826", opacity: 0.5 },
  summaryText: {
    lineHeight: 1.6,
    marginBottom: 8,
  },
  disclaimer: {
    fontSize: 9,
    color: "#101826",
    opacity: 0.6,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#DDE2E0",
    paddingTop: 8,
    lineHeight: 1.4,
  },
  provenanceBadge: {
    fontSize: 8,
    color: "#E05A2B",
    marginTop: 2,
  },
  verified: {
    color: "#15803D",
    fontSize: 8,
  },
  footer: {
    position: "absolute",
    bottom: 32,
    left: 48,
    right: 48,
    borderTopWidth: 1,
    borderTopColor: "#E7E2D9",
    paddingTop: 8,
    fontSize: 8,
    color: "#1C1917",
    opacity: 0.5,
    flexDirection: "row",
    justifyContent: "space-between",
  },
});

function flagStyle(flag: string) {
  if (flag === "high") return styles.flagHigh;
  if (flag === "low") return styles.flagLow;
  if (flag === "normal") return styles.flagNormal;
  return styles.flagUnknown;
}

function flagLabel(flag: string): string {
  if (flag === "high") return "HIGH";
  if (flag === "low") return "LOW";
  if (flag === "normal") return "Normal";
  return "No range";
}

interface PatientForExport {
  id: string;
  name: string;
  age: number;
  sex: string;
  contactInfo: string | null;
  profileEntries: Array<{ category: string; value: string; notes: string | null }>;
  labResults: Array<{
    testName: string;
    value: string;
    unit: string | null;
    flag: string;
    referenceRangeRaw: string | null;
    verifiedByClinician: boolean;
    report: { reportDate: Date | null; originalFilename: string };
  }>;
  summaries: Array<{ summaryText: string; generatedAt: Date; modelVersion: string }>;
}

function MedLensPDF({ patient }: { patient: PatientForExport }) {
  const summary = patient.summaries[0];
  const symptoms = patient.profileEntries.filter((e) => e.category === "symptom");
  const conditions = patient.profileEntries.filter((e) => e.category === "existing_condition");
  const allergies = patient.profileEntries.filter((e) => e.category === "allergy");
  const medications = patient.profileEntries.filter((e) => e.category === "medication");
  const exportDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: "A4", style: styles.page },
      // Header
      React.createElement(
        View,
        { style: styles.header },
        React.createElement(Text, { style: styles.title }, "MedLens Patient Record"),
        React.createElement(
          Text,
          { style: styles.subtitle },
          `Generated: ${exportDate} · Source: MedLens Clinical Information System`
        )
      ),

      // Patient Info
      React.createElement(
        View,
        { style: styles.section },
        React.createElement(Text, { style: styles.sectionTitle }, "Patient Information"),
        React.createElement(
          View,
          { style: styles.row },
          React.createElement(Text, { style: styles.label }, "Name:"),
          React.createElement(Text, { style: styles.value }, patient.name)
        ),
        React.createElement(
          View,
          { style: styles.row },
          React.createElement(Text, { style: styles.label }, "Age / Sex:"),
          React.createElement(Text, { style: styles.value }, `${patient.age} · ${patient.sex}`)
        ),
        patient.contactInfo &&
          React.createElement(
            View,
            { style: styles.row },
            React.createElement(Text, { style: styles.label }, "Contact:"),
            React.createElement(Text, { style: styles.value }, patient.contactInfo)
          )
      ),

      // Symptoms & Conditions
      React.createElement(
        View,
        { style: styles.section },
        React.createElement(Text, { style: styles.sectionTitle }, "Patient-Provided Information"),
        symptoms.length > 0 &&
          React.createElement(
            View,
            { style: styles.row },
            React.createElement(Text, { style: styles.label }, "Symptoms:"),
            React.createElement(
              Text,
              { style: styles.value },
              symptoms.map((s) => s.value).join(", ")
            )
          ),
        conditions.length > 0 &&
          React.createElement(
            View,
            { style: styles.row },
            React.createElement(Text, { style: styles.label }, "Conditions:"),
            React.createElement(
              Text,
              { style: styles.value },
              conditions.map((c) => c.value).join(", ")
            )
          ),
        allergies.length > 0 &&
          React.createElement(
            View,
            { style: styles.row },
            React.createElement(Text, { style: styles.label }, "Allergies:"),
            React.createElement(
              Text,
              { style: styles.value },
              allergies.map((a) => a.value).join(", ")
            )
          ),
        medications.length > 0 &&
          React.createElement(
            View,
            { style: styles.row },
            React.createElement(Text, { style: styles.label }, "Medications:"),
            React.createElement(
              Text,
              { style: styles.value },
              medications
                .map((m) => `${m.value}${m.notes ? ` (${m.notes})` : ""}`)
                .join("; ")
            )
          )
      ),

      // Lab Results
      patient.labResults.length > 0 &&
        React.createElement(
          View,
          { style: styles.section },
          React.createElement(Text, { style: styles.sectionTitle }, "Lab Results"),
          React.createElement(
            View,
            { style: styles.labTable },
            React.createElement(
              View,
              { style: styles.labHeader },
              React.createElement(Text, { style: styles.col1 }, "Test"),
              React.createElement(Text, { style: styles.col2 }, "Value"),
              React.createElement(Text, { style: styles.col3 }, "Unit"),
              React.createElement(Text, { style: styles.col4 }, "Reference Range"),
              React.createElement(Text, { style: styles.col5 }, "Flag")
            ),
            ...patient.labResults.map((lr, i) =>
              React.createElement(
                View,
                { key: i, style: [styles.labRow, i % 2 === 0 ? styles.labRowAlt : {}] },
                React.createElement(
                  View,
                  { style: styles.col1 },
                  React.createElement(Text, null, lr.testName),
                  lr.verifiedByClinician &&
                    React.createElement(Text, { style: styles.verified }, "✓ Verified")
                ),
                React.createElement(Text, { style: styles.col2 }, lr.value),
                React.createElement(Text, { style: styles.col3 }, lr.unit ?? "—"),
                React.createElement(
                  Text,
                  { style: styles.col4 },
                  lr.referenceRangeRaw ?? "Not provided"
                ),
                React.createElement(
                  Text,
                  { style: [styles.col5, flagStyle(lr.flag)] },
                  flagLabel(lr.flag)
                )
              )
            )
          ),
          React.createElement(
            Text,
            { style: styles.provenanceBadge },
            "Source: ai-extracted from uploaded reports"
          )
        ),

      // AI Summary
      summary &&
        React.createElement(
          View,
          { style: styles.section },
          React.createElement(Text, { style: styles.sectionTitle }, "Clinical Record Summary"),
          React.createElement(Text, { style: styles.summaryText }, summary.summaryText),
          React.createElement(
            Text,
            { style: styles.provenanceBadge },
            `Source: Verified Clinical Intelligence Engine · Generated: ${new Date(summary.generatedAt).toLocaleDateString()}`
          )
        ),

      // Disclaimer
      React.createElement(
        View,
        { style: styles.disclaimer },
        React.createElement(Text, null, DISCLAIMER)
      ),

      // Footer
      React.createElement(
        View,
        { style: styles.footer },
        React.createElement(Text, null, "MedLens Clinical Information System"),
        React.createElement(Text, null, `Exported: ${exportDate}`)
      )
    )
  );
}

interface Params {
  params: { patientId: string };
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

    const pdfDoc = MedLensPDF({ patient });
    const buffer = await renderToBuffer(pdfDoc);

    return new NextResponse(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="medlens-${patient.name.replace(/\s+/g, "-").toLowerCase()}.pdf"`,
        "Content-Length": buffer.length.toString(),
      },
    });
  } catch (e) {
    return serverErr(e);
  }
}
