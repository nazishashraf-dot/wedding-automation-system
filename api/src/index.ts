import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import clientsRouter from "./routes/clients";
import weddingsRouter from "./routes/weddings";
import vendorsRouter from "./routes/vendors";
import { errorHandler } from "./errors";

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

app.use((_req, res) => {
  res.status(404).json({ error: { message: "Not found" } });
});

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});
