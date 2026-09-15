export default function HeartIcon({
  filled,
  size = 20,
  className = "",
}: {
  filled: boolean;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? "#dc2626" : "none"}
      stroke={filled ? "#dc2626" : "currentColor"}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 20.5s-7.2-4.5-10-9.1C.4 8.2 1.5 4.4 5.1 3.3c2.5-.8 5 .2 6.9 2.7 1.9-2.5 4.4-3.5 6.9-2.7 3.6 1.1 4.7 4.9 3.1 8.1-2.8 4.6-10 9.1-10 9.1z" />
    </svg>
  );
}
