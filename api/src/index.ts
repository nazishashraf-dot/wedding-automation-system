import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import cron from "node-cron";
import clientsRouter from "./routes/clients";
import weddingsRouter from "./routes/weddings";
import vendorsRouter from "./routes/vendors";
import tasksRouter from "./routes/tasks";
import authRouter from "./routes/auth";
import meetingsRouter from "./routes/meetings";
import documentsRouter from "./routes/documents";
import paymentsRouter from "./routes/payments";
import guestsRouter from "./routes/guests";
import importRouter from "./routes/import";
import formsRouter from "./routes/forms";
import dashboardRouter from "./routes/dashboard";
import adminRouter from "./routes/admin";
import { errorHandler } from "./errors";
import { requireAuth } from "./middleware/auth";
import { runEmailJob } from "./emailJob";
import { getFrontendUrl } from "./utils";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
const FRONTEND_URL = getFrontendUrl();

app.use(cors({ origin: FRONTEND_URL, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// /auth carries both public routes (login/logout) and protected ones
// (register, me, google/*) — each route inside auth.ts guards itself.
app.use("/auth", authRouter);
// /forms/intake/:weddingId is the public client-facing intake form — stays open.
app.use("/forms", formsRouter);

app.use("/clients", requireAuth, clientsRouter);
app.use("/weddings", requireAuth, weddingsRouter);
app.use("/vendors", requireAuth, vendorsRouter);
app.use("/tasks", requireAuth, tasksRouter);
app.use("/meetings", requireAuth, meetingsRouter);
app.use("/documents", requireAuth, documentsRouter);
app.use("/payments", requireAuth, paymentsRouter);
app.use("/guests", requireAuth, guestsRouter);
app.use("/import", requireAuth, importRouter);
app.use("/dashboard", requireAuth, dashboardRouter);
app.use("/admin", requireAuth, adminRouter);

app.use((_req, res) => {
  res.status(404).json({ error: { message: "Not found" } });
});

app.use(errorHandler);

// Daily at 8am server time: send due-soon reminders and overdue nudges.
// Also triggerable on demand via POST /admin/run-email-job.
cron.schedule("0 8 * * *", () => {
  runEmailJob()
    .then((result) => console.log("Scheduled email job finished:", result))
    .catch((err) => console.error("Scheduled email job failed:", err));
});

app.listen(PORT, () => {
  console.log(`API server running on port ${PORT} (CORS origin: ${FRONTEND_URL})`);
});
