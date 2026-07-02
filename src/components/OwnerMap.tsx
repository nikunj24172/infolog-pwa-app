"use client";

/**
 * Map for a record's address, matching the InfoLog report layout.
 * Uses Google's keyless embed (no API key needed); Directions / View open the
 * full Google Maps app.
 */
export default function OwnerMap({ address, label }: { address: string; label?: string }) {
  const q = encodeURIComponent(address);
  const embed = `https://maps.google.com/maps?q=${q}&z=15&output=embed`;
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${q}`;
  const view = `https://www.google.com/maps/search/?api=1&query=${q}`;

  return (
    <div>
      <div className="relative overflow-hidden rounded-xl border border-border">
        {label && (
          <span className="absolute left-2 top-2 z-10 rounded-lg bg-background/90 px-2 py-1 text-xs font-medium shadow">
            📍 {label}
          </span>
        )}
        <iframe
          title={`Map of ${address}`}
          src={embed}
          className="h-44 w-full"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <a
          href={directions}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent-strong px-4 py-3 text-sm font-semibold text-slate-950 active:scale-[0.98]"
        >
          🧭 Directions
        </a>
        <a
          href={view}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm font-semibold active:scale-[0.98]"
        >
          🗺 View
        </a>
      </div>
    </div>
  );
}
