import type { ContributionType, ContributionStatus } from "@/types";
import { STATUS_STYLES, CONTRIBUTION_TYPES } from "@/lib/contribution";
import { cn } from "@/lib/utils";

export function StatusBadge({ status }: { status: ContributionStatus }) {
  const s = STATUS_STYLES[status];
  return (
    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium uppercase", s.bg, s.text)}>
      {s.label}
    </span>
  );
}

export function TypeIcon({ type, className }: { type: ContributionType; className?: string }) {
  const def = CONTRIBUTION_TYPES.find((t) => t.value === type);
  if (!def) return null;
  const Icon = def.icon;
  return <Icon className={cn("size-4 shrink-0", def.color, className)} />;
}


