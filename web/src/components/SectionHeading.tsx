export default function SectionHeading({
  children,
  action,
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="section-heading">
      <h2 className="section-heading__title text-lg">{children}</h2>
      {action && <div className="flex items-center gap-3">{action}</div>}
    </div>
  );
}
