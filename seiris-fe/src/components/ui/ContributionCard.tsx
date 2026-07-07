import { Link } from "react-router-dom";
import type { Contribution } from "@/types";
import { StatusBadge, TypeIcon } from "@/components/ui/StatusBadge";

export default function ContributionCard({
  contribution,
  teamId,
}: {
  contribution: Contribution;
  teamId: string;
}) {
  return (
    <Link
      to={`/teams/${teamId}/contributions/${contribution.id}`}
      className="group block rounded-xl border border-gray-800 bg-card p-4 transition-all duration-200 hover:border-gray-700 hover:-translate-y-0.5"
    >
      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-full bg-accent/10">
            <TypeIcon type={contribution.type} className="size-4 text-accent" />
          </div>
          <span className="text-sm font-medium text-white">{contribution.type}</span>
          <StatusBadge status={contribution.status} />
        </div>
        <span className="text-xs text-gray-500">
          {new Date(contribution.contribution_date).toLocaleDateString("id-ID")}
        </span>
      </div>

      <p className="mb-3 line-clamp-2 text-sm text-gray-300 leading-relaxed">{contribution.description}</p>

      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="flex size-5 items-center justify-center rounded-full bg-gray-800 text-[8px] font-bold text-gray-500">
              {contribution.member.user.name.charAt(0).toUpperCase()}
            </span>
            {contribution.member.user.name}
          </span>
          <span className="font-mono text-gray-500">
            Rp {contribution.value.toLocaleString("id-ID")}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-accent">{contribution.total_slices.toLocaleString("id-ID")} slices</span>
          {contribution.approvals_count > 0 && (
            <span className="text-gray-500">{contribution.approvals_count} vote</span>
          )}
        </div>
      </div>
    </Link>
  );
}
