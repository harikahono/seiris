import { cn } from "@/lib/utils";

interface PaginationProps {
  current: number;
  last: number;
  onChange: (page: number) => void;
}

/** Show ~5 page numbers around current, ellipsis for gaps. */
export default function Pagination({ current, last, onChange }: PaginationProps) {
  if (last <= 1) return null;

  const pages: (number | "...")[] = [];
  const s = 1; // sibling each side → total ~5 visible

  if (last <= 5) {
    // show all
    for (let i = 1; i <= last; i++) pages.push(i);
  } else {
    pages.push(1);
    if (current - s > 2) pages.push("...");

    const start = Math.max(2, current - s);
    const end = Math.min(last - 1, current + s);
    for (let i = start; i <= end; i++) pages.push(i);

    if (current + s < last - 1) pages.push("...");
    pages.push(last);
  }

  return (
    <div className="flex items-center gap-1">
      {/* Prev */}
      <button
        type="button"
        disabled={current <= 1}
        onClick={() => onChange(current - 1)}
        className="rounded-md px-2 py-1 text-sm text-gray-400 hover:bg-gray-800 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
      >
        ‹
      </button>

      {pages.map((p, i) =>
        p === "..." ? (
          <span key={`ellipsis-${i}`} className="px-1 text-xs text-gray-600">
            ⋯
          </span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            className={cn(
              "min-w-[32px] rounded-md px-2 py-1 text-sm transition",
              p === current
                ? "bg-accent text-black font-semibold"
                : "text-gray-400 hover:bg-gray-800 hover:text-white"
            )}
          >
            {p}
          </button>
        )
      )}

      {/* Next */}
      <button
        type="button"
        disabled={current >= last}
        onClick={() => onChange(current + 1)}
        className="rounded-md px-2 py-1 text-sm text-gray-400 hover:bg-gray-800 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
      >
        ›
      </button>
    </div>
  );
}
