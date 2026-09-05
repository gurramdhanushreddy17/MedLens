import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/tiff",
  "image/bmp",
  "image/webp",
];

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export interface SavedFile {
  filePath: string;
  fileType: string;
  originalFilename: string;
  sizeBytes: number;
}

/**
 * Ensure the uploads directory exists.
 */
export async function ensureUploadDir(): Promise<void> {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
}

/**
 * Validate a file's mime type and size before saving.
 * Throws a descriptive error on validation failure.
 */
export function validateFile(
  filename: string,
  mimeType: string,
  sizeBytes: number
): void {
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    throw new Error(
      `This file type (${mimeType || "unknown"}) is not supported. Please upload a PDF or image file (JPEG, PNG, TIFF, BMP, WebP).`
    );
  }

  if (sizeBytes > MAX_FILE_SIZE_BYTES) {
    const sizeMB = (sizeBytes / (1024 * 1024)).toFixed(1);
    throw new Error(
      `This file (${sizeMB} MB) exceeds the 10 MB limit. Please compress the file or split it into smaller parts.`
    );
  }

  const ext = path.extname(filename).toLowerCase();
  const validExts = [".pdf", ".jpg", ".jpeg", ".png", ".tiff", ".tif", ".bmp", ".webp"];
  if (!validExts.includes(ext)) {
    throw new Error(
      `Unexpected file extension "${ext}". Expected: ${validExts.join(", ")}.`
    );
  }
}

/**
 * Save a file buffer to disk with a unique name.
 * Returns metadata for storing in the database.
 */
export async function saveFile(
  buffer: Buffer,
  originalFilename: string,
  mimeType: string
): Promise<SavedFile> {
  await ensureUploadDir();

  const ext = path.extname(originalFilename);
  const uniqueName = `${crypto.randomUUID()}${ext}`;
  const filePath = path.join(UPLOAD_DIR, uniqueName);

  await fs.writeFile(filePath, buffer);

  return {
    filePath,
    fileType: mimeType,
    originalFilename,
    sizeBytes: buffer.length,
  };
}

/**
 * Read a saved file's buffer from disk.
 */
export async function readFile(filePath: string): Promise<Buffer> {
  return fs.readFile(filePath);
}

/**
 * Delete a file from disk.
 */
export async function deleteFile(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath);
  } catch {
    // Ignore — file may already be gone
  }
}
