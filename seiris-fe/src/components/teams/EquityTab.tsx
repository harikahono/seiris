import { useState, useEffect, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import api from "@/api/axios";
import type { EquityData, Contribution } from "@/types";
import type { TeamContext } from "@/pages/teams/TeamDetailPage";
import { Loader2 } from "lucide-react";
import EquityPieCard from "@/components/ui/EquityPieCard";
import ContributionTypeBar from "@/components/ui/ContributionTypeBar";
import MemberEquityTable from "@/components/ui/MemberEquityTable";
import ExportPdfButton from "@/components/ui/ExportPdfButton";

export default function EquityTab() {
  const { team } = useOutletContext<TeamContext>();
  const teamId = team.id;
  const [equity, setEquity] = useState<EquityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [contributions, setContributions] = useState<Contribution[]>([]);

  const fetchEquity = useCallback(() => {
    setLoading(true);
    api
      .get<{ data: EquityData }>(`/teams/${teamId}/equity`)
      .then((res) => setEquity(res.data.data))
      .catch(() => setEquity(null))
      .finally(() => setLoading(false));
  }, [teamId]);

  const fetchContributions = useCallback(() => {
    api
      .get<{ data: Contribution[] }>(`/teams/${teamId}/contributions`, {
        params: { per_page: 100 },
      })
      .then((res) => setContributions(res.data.data))
      .catch(() => {});
  }, [teamId]);

  useEffect(() => {
    fetchEquity();
    fetchContributions();
  }, [fetchEquity, fetchContributions]);

  const members = equity?.equity_map ?? [];
  const totalSlices = equity?.total_slices ?? 0;
  const isFrozen = equity?.is_frozen ?? false;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-5 animate-spin text-gray-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Equity Dashboard</h2>
          <p className="text-xs text-gray-500">
            Total Slices: {totalSlices.toLocaleString("id-ID")}
            {isFrozen && <span className="ml-2 text-red-400">Frozen</span>}
            {equity?.calculated_at && (
              <span className="ml-2">
                · Terakhir: {new Date(equity.calculated_at).toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            )}
          </p>
        </div>
        <ExportPdfButton teamId={teamId} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <EquityPieCard members={members} totalSlices={totalSlices} isFrozen={isFrozen} />
        <ContributionTypeBar contributions={contributions} />
      </div>

      <MemberEquityTable members={members} />
    </div>
  );
}
