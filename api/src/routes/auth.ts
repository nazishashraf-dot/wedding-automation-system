import { Router } from "express";
import { AppError, asyncHandler } from "../errors";
import {
  getAuthUrl,
  getConnectionStatus,
  handleOAuthCallback,
  isGoogleConfigured,
} from "../googleCalendar";
import { getFrontendUrl } from "../utils";

const router = Router();

router.get(
  "/google",
  asyncHandler(async (_req, res) => {
    if (!isGoogleConfigured()) {
      throw new AppError(
        500,
        "Google OAuth is not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI in api/.env."
      );
    }
    res.redirect(getAuthUrl());
  })
);

router.get(
  "/google/callback",
  asyncHandler(async (req, res) => {
    const code = req.query.code;
    if (typeof code !== "string") {
      throw new AppError(400, "Missing authorization code");
    }

    const frontendUrl = getFrontendUrl();

    try {
      await handleOAuthCallback(code);
      res.redirect(`${frontendUrl}/settings?connected=1`);
    } catch (err) {
      console.error("Google OAuth callback failed:", err);
      res.redirect(`${frontendUrl}/settings?connected=0`);
    }
  })
);

router.get(
  "/google/status",
  asyncHandler(async (_req, res) => {
    const status = await getConnectionStatus();
    res.json(status);
  })
);

export default router;
