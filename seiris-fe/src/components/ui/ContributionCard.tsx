import { Link } from "react-router-dom";
import type { Contribution } from "@/types";
import { StatusBadge, TypeIcon } from "@/components/ui/StatusBadge";

const STATUS_DOT: Record<string, string> = {
  APPROVED: "bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.4)]",
  REJECTED: "bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.4)]",
  PENDING: "bg-yellow-500 shadow-[0_0_6px_rgba(234,179,8,0.3)]",
};

export default function ContributionCard({
  contribution,
  teamId,
  isLast = false,
}: {
  contribution: Contribution;
  teamId: string;
  isLast?: boolean;
}) {
  const dotColor = STATUS_DOT[contribution.status] ?? "bg-gray-500";

  return (
    <Link
      to={`/teams/${teamId}/contributions/${contribution.id}`}
      className="group relative block pl-7 transition hover:bg-gray-800/20 rounded-lg py-2 -mx-2 px-2"
    >
      {/* Vertical timeline connector — hidden on last item */}
      {!isLast && <div className="absolute left-[11px] top-0 bottom-0 w-px bg-gray-800/60" />}

      {/* Status dot */}
      <div className={`absolute left-2 top-[14px] size-[10px] rounded-full ring-2 ring-surface ${dotColor}`} />

      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent/10">
            <TypeIcon type={contribution.type} className="size-3.5 text-accent" />
          </div>
          <span className="text-sm font-medium text-white">{contribution.type}</span>
          <StatusBadge status={contribution.status} />
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-sm font-semibold tabular-nums text-accent">
            {contribution.total_slices.toLocaleString("id-ID")} slices
          </span>
        </div>
      </div>

      <p className="mt-1 text-sm text-gray-400 leading-relaxed line-clamp-2">{contribution.description}</p>

      <div className="mt-1.5 flex items-center gap-3 text-xs text-gray-600">
        <span className="flex items-center gap-1">
          <span className="flex size-4 items-center justify-center rounded-full bg-gray-800 text-[6px] font-bold text-gray-500">
            {contribution.member.user.name.charAt(0).toUpperCase()}
          </span>
          {contribution.member.user.name}
        </span>
        <span>·</span>
        <span className="tabular-nums">Rp {contribution.value.toLocaleString("id-ID")}</span>
        {contribution.approvals_count > 0 && (
          <>
            <span>·</span>
            <span>{contribution.approvals_count} vote</span>
          </>
        )}
        <span className="ml-auto text-[11px] text-gray-600">
          {new Date(contribution.contribution_date).toLocaleDateString("id-ID")}
        </span>
      </div>
    </Link>
  );
}
