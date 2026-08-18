import Link from "next/link";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-sm",
        className,
      )}
      aria-hidden
    >
      <svg viewBox="0 0 24 24" className="size-5" fill="none">
        <path
          d="M7 4.5 17 4.5 17 6.8 12 6.8 12 19.5 9.5 19.5 9.5 6.8 7 6.8Z"
          fill="currentColor"
        />
        <circle cx="17.4" cy="17.6" r="2.3" fill="#fbbf24" />
      </svg>
    </span>
  );
}

export function Logo({
  className,
  light = false,
}: {
  className?: string;
  light?: boolean;
}) {
  return (
    <Link href="/" className={cn("flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className="leading-none">
        <span
          className={cn(
            "block text-[15px] font-bold tracking-tight",
            light ? "text-white" : "text-ink-900",
          )}
        >
          Lynne Enterprise
        </span>
        <span
          className={cn(
            "mt-1 block text-[11px] font-medium uppercase tracking-[0.18em]",
            light ? "text-brand-200" : "text-brand-600",
          )}
        >
          Lipa Polepole
        </span>
      </span>
    </Link>
  );
}
