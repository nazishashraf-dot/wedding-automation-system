// Full-bleed photo layer for hero/header bands. Uses a plain CSS
// background-image (not next/image) so a failed load quietly falls back to
// the solid color underneath instead of a broken-image icon, and layers a
// wine-tinted scrim on top so overlaid text stays readable.
export default function PhotoBackdrop({
  src,
  blurred = false,
  scrimClassName = "bg-photo-scrim",
}: {
  src: string;
  blurred?: boolean;
  scrimClassName?: string;
}) {
  return (
    <div className="absolute inset-0 overflow-hidden bg-wine-700" aria-hidden>
      <div
        className={`absolute inset-0 bg-cover bg-center ${blurred ? "scale-110 blur-sm" : ""}`}
        style={{ backgroundImage: `url(${src})` }}
      />
      <div className={`absolute inset-0 ${scrimClassName}`} />
    </div>
  );
}
