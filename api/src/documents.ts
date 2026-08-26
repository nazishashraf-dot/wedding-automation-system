import multer from "multer";
import { put, del } from "@vercel/blob";
import { AppError } from "./errors";

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

// PDFs, common images, and common office document formats. Anything else
// is rejected with a clear error rather than silently accepted.
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "text/csv",
]);

export const documentUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(new AppError(400, `Unsupported file type: ${file.mimetype || "unknown"}`));
      return;
    }
    cb(null, true);
  },
});

function getBlobToken(): string {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    throw new AppError(500, "File storage is not configured (BLOB_READ_WRITE_TOKEN missing).");
  }
  return token;
}

// Namespaced by wedding + a timestamp so re-uploading a same-named file
// never collides with (or silently overwrites) an earlier one.
export async function uploadDocumentToBlob(
  weddingId: string,
  originalName: string,
  buffer: Buffer,
  contentType: string
): Promise<{ url: string }> {
  const safeName = originalName.replace(/[\\/]/g, "_");
  const pathname = `weddings/${weddingId}/${Date.now()}-${safeName}`;
  const blob = await put(pathname, buffer, {
    access: "public",
    contentType,
    token: getBlobToken(),
  });
  return { url: blob.url };
}

export async function deleteDocumentBlobs(urls: string[]): Promise<void> {
  if (urls.length === 0) return;
  await del(urls, { token: getBlobToken() });
}
