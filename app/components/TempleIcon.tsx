// Front view of Herod's Temple: square Ulam facade with its great open doorway,
// the cornice topped by the "kalah oreb" spikes, and the steps leading up to it.
export default function TempleIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={`inline-block w-[1em] h-[1em] align-[-0.125em] ${className}`}
    >
      <path
        fillRule="evenodd"
        d="M5.5 7.6h13v11.6h-13z M10.4 10.6h3.2v8.6h-3.2z M7 9.4h.7v8.6H7z M16.3 9.4h.7v8.6h-.7z"
      />
      <path d="M9.9 9.6h4.2v.6H9.9z" />
      <rect x="4.6" y="6.3" width="14.8" height="1" rx="0.2" />
      <path
        d="M5.4 6.3V5M7.6 6.3V5M9.8 6.3V5M12 6.3V4.6M14.2 6.3V5M16.4 6.3V5M18.6 6.3V5"
        stroke="currentColor"
        strokeWidth="0.6"
        strokeLinecap="round"
      />
      <rect x="4.5" y="19.6" width="15" height="1" />
      <rect x="3.2" y="20.9" width="17.6" height="1" />
      <rect x="1.9" y="22.2" width="20.2" height="1" />
    </svg>
  );
}
