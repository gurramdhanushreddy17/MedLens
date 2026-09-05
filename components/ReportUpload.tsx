"use client";

import { useState, useRef } from "react";
import { UploadCloud, FileText, X, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProcessingPipeline } from "./ProcessingPipeline";
import type { PipelineStep } from "./ProcessingPipeline";

interface ReportUploadProps {
  patientId: string;
  onSuccess?: (data: {
    report: { id: string; originalFilename: string };
    clarificationQuestions?: string[];
    resultCount?: number;
  }) => void;
}

export function ReportUpload({ patientId, onSuccess }: ReportUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [reportDate, setReportDate] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pipelineStep, setPipelineStep] = useState<PipelineStep | null>(null);
  const [pipelineError, setPipelineError] = useState<string | undefined>();
  const [resultCount, setResultCount] = useState<number | undefined>();
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ACCEPTED_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/tiff", "image/bmp", "image/webp"];
  const MAX_SIZE_MB = 10;

  const handleFileSelect = (selected: File) => {
    setError(null);
    if (!ACCEPTED_TYPES.includes(selected.type)) {
      setError(
        `This file type is not supported. Please upload a PDF or image file (JPEG, PNG, TIFF, WebP).`
      );
      return;
    }
    if (selected.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(
        `This file (${(selected.size / (1024 * 1024)).toFixed(1)} MB) is too large. Maximum size is ${MAX_SIZE_MB} MB.`
      );
      return;
    }
    setFile(selected);
    setPipelineStep(null);
    setPipelineError(undefined);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) handleFileSelect(dropped);
  };

  const handleUploadAndProcess = async () => {
    if (!file || uploading) return;
    setUploading(true);
    setError(null);
    setPipelineError(undefined);

    try {
      // Step 1: Upload
      setPipelineStep("upload");
      const formData = new FormData();
      formData.append("file", file);
      formData.append("patientId", patientId);
      if (reportDate) formData.append("reportDate", new Date(reportDate).toISOString());

      const uploadRes = await fetch("/api/reports", {
        method: "POST",
        body: formData,
      });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok || !uploadData.success) {
        throw new Error(uploadData.error ?? "Upload failed");
      }
      const reportId: string = uploadData.data.id;

      // Step 2: OCR
      setPipelineStep("ocr");
      await new Promise((r) => setTimeout(r, 300)); // Brief UI pause for UX clarity

      // Step 3: Extract
      setPipelineStep("extract");
      const processRes = await fetch(`/api/reports/${reportId}/process`, {
        method: "POST",
      });
      const processData = await processRes.json();

      if (!processRes.ok || !processData.success) {
        setPipelineStep("failed");
        setPipelineError(processData.error ?? "Processing failed. Try re-uploading.");
        return;
      }

      // Step 4: Flag
      setPipelineStep("flag");
      await new Promise((r) => setTimeout(r, 200));

      // Step 5: Ready
      const count = processData.data.labResults?.length ?? 0;
      setResultCount(count);
      setPipelineStep("ready");

      onSuccess?.({
        report: { id: reportId, originalFilename: file.name },
        clarificationQuestions: processData.data.clarificationQuestions ?? [],
        resultCount: count,
      });

      // Reset form after success
      setTimeout(() => {
        setFile(null);
        setReportDate("");
        setPipelineStep(null);
        setResultCount(undefined);
      }, 3000);
    } catch (e) {
      setPipelineStep("failed");
      const msg = e instanceof Error ? e.message : "Upload failed. Please try again.";
      setPipelineError(msg);
      setError(msg);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer",
          dragOver
            ? "border-accent bg-accent/5"
            : file
            ? "border-flag-normal/50 bg-flag-normal/5"
            : "border-line hover:border-accent/50 hover:bg-ink/2"
        )}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        aria-label="Click or drag to upload a medical report"
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click(); }}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="sr-only"
          accept=".pdf,.jpg,.jpeg,.png,.tiff,.tif,.bmp,.webp"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFileSelect(f);
            e.target.value = "";
          }}
          aria-label="File input for medical report"
        />

        {file ? (
          <div className="flex items-center justify-center gap-3">
            <FileText className="h-8 w-8 text-flag-normal" aria-hidden="true" />
            <div className="text-left">
              <div className="text-sm font-medium text-ink">{file.name}</div>
              <div className="text-xs text-ink/50">
                {(file.size / 1024).toFixed(0)} KB · {file.type}
              </div>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); setFile(null); setError(null); setPipelineStep(null); }}
              className="ml-2 text-ink/40 hover:text-flag-high transition-colors"
              aria-label="Remove selected file"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div>
            <UploadCloud className="h-10 w-10 text-ink/20 mx-auto mb-2" aria-hidden="true" />
            <p className="text-sm font-medium text-ink">
              Drop a PDF or image here, or click to browse
            </p>
            <p className="text-xs text-ink/50 mt-1">
              PDF, JPEG, PNG, TIFF, WebP · Max {MAX_SIZE_MB} MB
            </p>
          </div>
        )}
      </div>

      {/* Report date */}
      <div>
        <label htmlFor="report-date" className="text-xs font-medium text-ink/70 block mb-1">
          Report date (optional)
        </label>
        <input
          id="report-date"
          type="date"
          value={reportDate}
          onChange={(e) => setReportDate(e.target.value)}
          className="w-full text-sm border border-line rounded px-3 py-1.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent font-mono"
        />
      </div>

      {/* Error */}
      {error && !pipelineStep && (
        <div className="flex items-start gap-2 p-3 bg-flag-high/10 border border-flag-high/30 rounded text-sm text-flag-high" role="alert">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
          {error}
        </div>
      )}

      {/* Pipeline animation */}
      {pipelineStep && (
        <ProcessingPipeline
          state={{
            currentStep: pipelineStep,
            error: pipelineError,
            resultCount,
          }}
        />
      )}

      {/* Upload button */}
      {!pipelineStep && (
        <button
          onClick={handleUploadAndProcess}
          disabled={!file || uploading}
          className={cn(
            "w-full py-2 px-4 rounded text-sm font-medium transition-colors",
            file && !uploading
              ? "bg-accent text-white hover:bg-accent/90"
              : "bg-ink/10 text-ink/40 cursor-not-allowed"
          )}
          aria-label="Upload and process report"
        >
          {uploading ? "Processing…" : "Upload & Process Report"}
        </button>
      )}
    </div>
  );
}
