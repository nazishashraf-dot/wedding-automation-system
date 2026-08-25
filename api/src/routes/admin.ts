import { Router } from "express";
import { asyncHandler } from "../errors";
import { runEmailJob } from "../emailJob";

const router = Router();

router.post(
  "/run-email-job",
  asyncHandler(async (_req, res) => {
    const result = await runEmailJob();
    res.json(result);
  })
);

export default router;
