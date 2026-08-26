export function formatDateForEmail(date: Date): string {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function formatMoneyForEmail(amount: unknown): string {
  const num = typeof amount === "number" ? amount : Number(amount);
  if (Number.isNaN(num)) return String(amount);
  return num.toLocaleString("en-US", { style: "currency", currency: "USD" });
}
