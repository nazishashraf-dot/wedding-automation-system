import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cron from "node-cron";
import clientsRouter from "./routes/clients";
import weddingsRouter from "./routes/weddings";
import vendorsRouter from "./routes/vendors";
import tasksRouter from "./routes/tasks";
import authRouter from "./routes/auth";
import meetingsRouter from "./routes/meetings";
import formsRouter from "./routes/forms";
import dashboardRouter from "./routes/dashboard";
import adminRouter from "./routes/admin";
import { errorHandler } from "./errors";
import { runEmailJob } from "./emailJob";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/clients", clientsRouter);
app.use("/weddings", weddingsRouter);
app.use("/vendors", vendorsRouter);
app.use("/tasks", tasksRouter);
app.use("/auth", authRouter);
app.use("/meetings", meetingsRouter);
app.use("/forms", formsRouter);
app.use("/dashboard", dashboardRouter);
app.use("/admin", adminRouter);

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
  console.log(`API server running on http://localhost:${PORT}`);
});
