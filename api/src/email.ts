import { Resend } from "resend";
import { prisma } from "./db";

export function isResendConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.FROM_EMAIL);
}

function renderTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => vars[key] ?? "");
}

interface SendTemplatedEmailInput {
  weddingId: string;
  templateKey: string;
  recipientEmail: string;
  vars: Record<string, string>;
  relatedTaskId?: string;
}

export class TemplateNotFoundError extends Error {
  constructor(key: string) {
    super(`No active email template with key "${key}"`);
  }
}

/**
 * Renders the named template, sends it via Resend, and always writes an
 * EmailLog row (status "sent" or "failed") — a missing/misconfigured Resend
 * API key or a send failure never throws past this function, so callers
 * (the cron job in particular) can keep processing the rest of the batch.
 */
export async function sendTemplatedEmail(input: SendTemplatedEmailInput) {
  const template = await prisma.emailTemplate.findUnique({
    where: { key: input.templateKey },
  });
  if (!template || !template.isActive) {
    throw new TemplateNotFoundError(input.templateKey);
  }

  const subject = renderTemplate(template.subject, input.vars);
  const body = renderTemplate(template.bodyTemplate, input.vars);

  let status: "sent" | "failed" = "sent";

  if (!isResendConfigured()) {
    status = "failed";
    console.error(
      `Cannot send email (template "${input.templateKey}" to ${input.recipientEmail}): ` +
        "RESEND_API_KEY / FROM_EMAIL not configured."
    );
  } else {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const result = await resend.emails.send({
        from: process.env.FROM_EMAIL!,
        to: input.recipientEmail,
        subject,
        text: body,
      });
      if (result.error) {
        status = "failed";
        console.error("Resend returned an error:", result.error);
      }
    } catch (err) {
      status = "failed";
      console.error("Failed to send email via Resend:", err);
    }
  }

  return prisma.emailLog.create({
    data: {
      weddingId: input.weddingId,
      templateKey: input.templateKey,
      recipientEmail: input.recipientEmail,
      subject,
      status,
      relatedTaskId: input.relatedTaskId,
    },
  });
}
