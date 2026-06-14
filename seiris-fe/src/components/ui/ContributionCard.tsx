import { Link } from "react-router-dom";
import type { Contribution, ContributionType } from "@/types";
import { StatusBadge, TypeIcon } from "@/components/ui/StatusBadge";

function formatValue(value: number, _type: ContributionType) {
  return `Rp ${value.toLocaleString("id-ID")}`;
}

function formatSlices(slices: number) {
  return slices.toLocaleString("id-ID");
}

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
      className="block rounded-lg border border-gray-800 bg-gray-900 p-4 transition hover:border-accent"
    >
      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-center gap-2">
          <TypeIcon type={contribution.type} />
          <span className="text-sm font-medium text-white">{contribution.type}</span>
          <StatusBadge status={contribution.status} />
        </div>
        <span className="text-xs text-gray-500">
          {new Date(contribution.contribution_date).toLocaleDateString("id-ID")}
        </span>
      </div>

      <p className="mb-2 line-clamp-2 text-sm text-gray-300">{contribution.description}</p>

      <div className="flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center gap-3">
          <span>{contribution.member.user.name}</span>
          <span>{formatValue(contribution.value, contribution.type)}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-accent">{formatSlices(contribution.total_slices)} slices</span>
          {contribution.approvals_count > 0 && (
            <span className="text-gray-500">{contribution.approvals_count} vote</span>
          )}
        </div>
      </div>
    </Link>
  );
}
