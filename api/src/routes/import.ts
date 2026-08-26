import { Router } from "express";
import multer from "multer";
import { AppError, asyncHandler } from "../errors";
import { confirmClientsImport, previewClientsCsv } from "../import/clients";
import { confirmVendorsImport, previewVendorsCsv } from "../import/vendors";

const router = Router();

const MAX_CSV_SIZE_BYTES = 5 * 1024 * 1024; // 5MB — plenty for a spreadsheet export

// CSV mimetype reporting is notoriously inconsistent across browsers/OSes
// (text/csv, application/vnd.ms-excel, or nothing at all), so the file
// extension is trusted as a fallback rather than rejecting valid uploads.
const csvUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_CSV_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    const isCsv =
      file.mimetype === "text/csv" ||
      file.mimetype === "application/vnd.ms-excel" ||
      file.originalname.toLowerCase().endsWith(".csv");
    if (!isCsv) {
      cb(new AppError(400, "Only .csv files are supported"));
      return;
    }
    cb(null, true);
  },
});

function parseIncludeRows(raw: unknown): number[] {
  if (typeof raw !== "string") return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((n): n is number => typeof n === "number");
  } catch {
    return [];
  }
}

router.post(
  "/clients/preview",
  csvUpload.single("file"),
  asyncHandler(async (req, res) => {
    if (!req.file) throw new AppError(400, "No file provided");
    const preview = await previewClientsCsv(req.file.buffer);
    res.json(preview);
  })
);

router.post(
  "/clients/confirm",
  csvUpload.single("file"),
  asyncHandler(async (req, res) => {
    if (!req.file) throw new AppError(400, "No file provided");
    const includeRows = parseIncludeRows(req.body.includeRows);
    const result = await confirmClientsImport(req.file.buffer, includeRows);
    res.json(result);
  })
);

router.post(
  "/vendors/preview",
  csvUpload.single("file"),
  asyncHandler(async (req, res) => {
    if (!req.file) throw new AppError(400, "No file provided");
    const preview = await previewVendorsCsv(req.file.buffer);
    res.json(preview);
  })
);

router.post(
  "/vendors/confirm",
  csvUpload.single("file"),
  asyncHandler(async (req, res) => {
    if (!req.file) throw new AppError(400, "No file provided");
    const includeRows = parseIncludeRows(req.body.includeRows);
    const result = await confirmVendorsImport(req.file.buffer, includeRows);
    res.json(result);
  })
);

export default router;
