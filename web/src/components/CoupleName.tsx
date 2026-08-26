// Renders a couple's names with the script accent font used ONLY for the
// ampersand between them — a tiny decorative flourish, never body text.
export default function CoupleName({
  fullName,
  partnerName,
  className = "",
  ampersandClassName = "text-gold-700",
}: {
  fullName: string;
  partnerName?: string | null;
  className?: string;
  ampersandClassName?: string;
}) {
  if (!partnerName) return <span className={className}>{fullName}</span>;

  return (
    <span className={className}>
      {fullName}
      <span
        className={`font-script ml-[0.3em] mr-[0.45em] text-[1.3em] font-normal not-italic align-middle ${ampersandClassName}`}
      >
        &amp;
      </span>
      {partnerName}
    </span>
  );
}
