interface CompatibleBadgeProps {
  className?: string;
}

export default function CompatibleBadge({ className = '' }: CompatibleBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-green-600 text-white text-[11px] font-semibold px-2.5 py-1 shadow-md ${className}`}
    >
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
      </svg>
      Compatible
    </span>
  );
}
