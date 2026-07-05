import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "@/api/axios";
import { useAuth } from "@/contexts/AuthContext";
import type { Contribution as ContributionType, Team } from "@/types";
import { TypeIcon, StatusBadge } from "@/components/ui/StatusBadge";
import VotePanel from "@/components/ui/VotePanel";
import { ArrowLeft, ThumbsUp, ThumbsDown } from "lucide-react";
import { cn } from "@/lib/utils";
import Skeleton from "@/components/ui/Skeleton";

export default function ContributionDetailPage() {
  const { teamId, contributionId } = useParams<{ teamId: string; contributionId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [contribution, setContribution] = useState<ContributionType | null>(null);
  const [currentMemberId, setCurrentMemberId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(() => {
    if (!teamId || !contributionId) return;
    setLoading(true);

    Promise.all([
      api.get<{ data: ContributionType }>(`/teams/${teamId}/contributions/${contributionId}`),
      api.get<{ data: Team }>(`/teams/${teamId}`),
    ])
      .then(([contribRes, teamRes]) => {
        setContribution(contribRes.data.data);
        const myMember = teamRes.data.data.members.find((m) => m.user.id === user!.id);
        setCurrentMemberId(myMember?.id ?? null);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [teamId, contributionId, user]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-8 space-y-6">
        <Skeleton className="h-8 w-1/4" />
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!contribution) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-8">
        <button onClick={() => navigate(-1)} className="mb-4 flex items-center gap-1 text-sm text-gray-500 hover:text-white">
          <ArrowLeft className="size-4" /> Kembali
        </button>
        <p className="text-red-400">Kontribusi tidak ditemukan.</p>
      </div>
    );
  }

  const approveCount = contribution.approvals.filter((a) => a.vote === "APPROVE").length;
  const rejectCount = contribution.approvals.filter((a) => a.vote === "REJECT").length;

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <button onClick={() => navigate(-1)} className="mb-4 flex items-center gap-1 text-sm text-gray-500 hover:text-white">
        <ArrowLeft className="size-4" /> Kembali
      </button>

      <div className="mb-6 rounded-lg border border-gray-800 bg-gray-900 p-6">
        <div className="mb-4 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <TypeIcon type={contribution.type} className="size-5" />
            <div>
              <h1 className="text-lg font-bold text-white">{contribution.type}</h1>
              <p className="text-xs text-gray-500">
                Oleh {contribution.member.user.name} &middot;{" "}
                {new Date(contribution.contribution_date).toLocaleDateString("id-ID")}
              </p>
            </div>
          </div>
          <StatusBadge status={contribution.status} />
        </div>

        <p className="mb-4 text-sm text-gray-300">{contribution.description}</p>

        <div className="flex gap-6 text-sm">
          <div>
            <p className="text-gray-500">Nilai</p>
            <p className="font-medium text-white">Rp {contribution.value.toLocaleString("id-ID")}</p>
          </div>
          <div>
            <p className="text-gray-500">Multiplier</p>
            <p className="font-medium text-white">&times;{contribution.multiplier}</p>
          </div>
          <div>
            <p className="text-gray-500">Total Slices</p>
            <p className="font-medium text-accent">{contribution.total_slices.toLocaleString("id-ID")}</p>
          </div>
        </div>

        {contribution.invoice_url && (
          <div className="mt-4">
            <a href={contribution.invoice_url} target="_blank" rel="noreferrer" className="text-sm text-accent hover:underline">
              Lihat Invoice
            </a>
          </div>
        )}
      </div>

      <div className="mb-6 rounded-lg border border-gray-800 bg-gray-900 p-5">
        <h3 className="mb-3 text-sm font-semibold text-white">
          Voting ({contribution.approvals_count} suara)
        </h3>
        <div className="mb-3 flex gap-4 text-sm">
          <span className="flex items-center gap-1 text-green-400">
            <ThumbsUp className="size-4" /> {approveCount}
          </span>
          <span className="flex items-center gap-1 text-red-400">
            <ThumbsDown className="size-4" /> {rejectCount}
          </span>
        </div>
        <div className="space-y-2">
          {contribution.approvals.map((a) => (
            <div
              key={a.id}
              className="flex items-center justify-between rounded-lg border border-gray-800 bg-gray-900/50 px-3 py-2"
            >
              <div className="flex items-center gap-2">
                <div className={cn(
                  "flex size-6 items-center justify-center rounded-full",
                  a.vote === "APPROVE" ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
                )}>
                  {a.vote === "APPROVE" ? <ThumbsUp className="size-3" /> : <ThumbsDown className="size-3" />}
                </div>
                <span className="text-sm text-white">{a.member.user.name}</span>
              </div>
              <div className="flex items-center gap-3">
                {a.note && <span className="text-xs text-gray-500">"{a.note}"</span>}
                <span className="text-xs text-gray-500">
                  {new Date(a.voted_at).toLocaleDateString("id-ID")}
                </span>
              </div>
            </div>
          ))}
          {contribution.approvals.length === 0 && (
            <p className="text-xs text-gray-500">Belum ada vote.</p>
          )}
        </div>
      </div>

      {currentMemberId && (
        <VotePanel contribution={contribution} currentMemberId={currentMemberId} onVoted={fetchData} />
      )}
    </div>
  );
}
