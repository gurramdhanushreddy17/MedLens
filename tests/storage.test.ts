import { describe, it, expect } from "vitest";
import { validateFile } from "../lib/storage";

describe("validateFile", () => {
  it("passes for valid PDF within size limit", () => {
    expect(() => {
      validateFile("blood_panel.pdf", "application/pdf", 1024 * 1024);
    }).not.toThrow();
  });

  it("passes for valid image files (PNG, JPEG, WebP)", () => {
    expect(() => {
      validateFile("scan.png", "image/png", 500 * 1024);
    }).not.toThrow();
    expect(() => {
      validateFile("lab_report.jpg", "image/jpeg", 2 * 1024 * 1024);
    }).not.toThrow();
    expect(() => {
      validateFile("doc.webp", "image/webp", 300 * 1024);
    }).not.toThrow();
  });

  it("throws error for unsupported mime type", () => {
    expect(() => {
      validateFile("malicious.exe", "application/x-msdownload", 1024);
    }).toThrow("is not supported");

    expect(() => {
      validateFile("notes.txt", "text/plain", 1024);
    }).toThrow("is not supported");
  });

  it("throws error when file exceeds 10 MB limit", () => {
    const elevenMB = 11 * 1024 * 1024;
    expect(() => {
      validateFile("giant_scan.pdf", "application/pdf", elevenMB);
    }).toThrow("exceeds the 10 MB limit");
  });

  it("throws error when extension does not match permitted clinical extensions", () => {
    expect(() => {
      validateFile("report.sh", "application/pdf", 1024);
    }).toThrow("Unexpected file extension");
  });
});
