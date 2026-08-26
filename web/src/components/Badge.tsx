import { Tone, badgeToneClasses } from "@/lib/ui";

export default function Badge({
  tone,
  children,
}: {
  tone: Tone;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${badgeToneClasses[tone]}`}
    >
      {children}
    </span>
  );
}
