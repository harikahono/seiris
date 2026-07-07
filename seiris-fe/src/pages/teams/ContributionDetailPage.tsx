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

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl space-y-5 px-6 pt-10 pb-8">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!contribution) {
    return (
      <div className="mx-auto max-w-7xl px-6 pt-10 pb-8">
        <button
          onClick={() => navigate(-1)}
          className="mb-4 flex items-center gap-1 text-sm text-gray-500 hover:text-white transition"
        >
          <ArrowLeft className="size-4" /> Kembali
        </button>
        <p className="text-red-400">Kontribusi tidak ditemukan.</p>
      </div>
    );
  }

  const approveCount = contribution.approvals.filter((a) => a.vote === "APPROVE").length;
  const rejectCount = contribution.approvals.filter((a) => a.vote === "REJECT").length;

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-6 pt-10 pb-8">
      {/* ── Back ── */}
      <button
        onClick={() => navigate(-1)}
        className="animate-fade-in-up flex items-center gap-1 text-sm text-gray-500 hover:text-white transition"
      >
        <ArrowLeft className="size-4" /> Kembali
      </button>

      {/* ── Contribution Detail ── */}
      <div className="animate-fade-in-up rounded-xl border border-gray-800 bg-card p-6 transition-all duration-200 hover:border-gray-700">
        <div className="mb-5 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-accent/10">
              <TypeIcon type={contribution.type} className="size-5 text-accent" />
            </div>
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

        <p className="mb-5 text-sm text-gray-300 leading-relaxed">{contribution.description}</p>

        <div className="flex flex-wrap gap-6">
          <div className="min-w-[120px] rounded-lg border border-gray-800 bg-gray-950/50 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-500">Nilai</p>
            <p className="mt-1 font-mono text-sm font-medium text-white">
              Rp {contribution.value.toLocaleString("id-ID")}
            </p>
          </div>
          <div className="min-w-[100px] rounded-lg border border-gray-800 bg-gray-950/50 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-500">Multiplier</p>
            <p className="mt-1 font-mono text-sm font-medium text-white">
              &times;{contribution.multiplier}
            </p>
          </div>
          <div className="min-w-[120px] rounded-lg border border-gray-800 bg-gray-950/50 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-500">Total Slices</p>
            <p className="mt-1 font-mono text-sm font-medium text-accent">
              {contribution.total_slices.toLocaleString("id-ID")}
            </p>
          </div>
          {contribution.invoice_url && (
            <div className="flex items-end">
              <a
                href={contribution.invoice_url}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg border border-gray-700 px-4 py-2 text-xs font-medium text-accent transition hover:bg-accent/10 hover:border-accent"
              >
                Lihat Invoice
              </a>
            </div>
          )}
        </div>

        {contribution.type === "SALES" && (
          <div className="mt-5 rounded-xl border border-gray-700/50 bg-gray-900/50 p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-gray-500">Rincian Sales</p>
            <div className="space-y-1.5 text-sm">
              {(() => {
                const dl = contribution.deal_value ?? 0;
                const es = contribution.estimated_value ?? 0;
                const markup = Math.max(0, dl - es);
                const markupPct = es > 0 ? ((markup / es) * 100).toFixed(1) : "0.0";
                const rate = contribution.commission_rate ?? 0;
                const komisi = Math.round(markup * rate / 100);
                return (
                  <>
                    <div className="flex justify-between"><span className="text-gray-500">Deal Client</span><span className="font-mono text-white">Rp {dl.toLocaleString("id-ID")}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Estimasi Tim</span><span className="font-mono text-white">Rp {es.toLocaleString("id-ID")}</span></div>
                    <div className="flex justify-between border-b border-gray-800 pb-1.5"><span className="text-gray-500">Markup</span><span className="font-mono text-green-400">Rp {markup.toLocaleString("id-ID")} ({markupPct}%)</span></div>
                    <div className="flex justify-between pt-0.5"><span className="text-gray-500">Rate Komisi</span><span className="font-mono text-white">{rate}%</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Komisi</span><span className="font-mono text-amber-400">Rp {komisi.toLocaleString("id-ID")}</span></div>
                    <div className="flex justify-between border-t border-gray-700 pt-1.5"><span className="text-gray-300 font-medium">Slices (komisi ×{contribution.multiplier})</span><span className="font-mono text-accent font-bold">{(komisi * Number(contribution.multiplier)).toLocaleString("id-ID")}</span></div>
                  </>
                );
              })()}
            </div>
          </div>
        )}
      </div>

      {/* ── Voting Section ── */}
      <div className="animate-fade-in-up rounded-xl border border-gray-800 bg-card p-5" style={{ animationDelay: "80ms" }}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">
            Voting ({contribution.approvals_count} suara)
          </h3>
          <div className="flex items-center gap-3 text-sm">
            <span className="flex items-center gap-1 text-green-400">
              <ThumbsUp className="size-3.5" /> {approveCount}
            </span>
            <span className="flex items-center gap-1 text-red-400">
              <ThumbsDown className="size-3.5" /> {rejectCount}
            </span>
          </div>
        </div>

        <div className="space-y-2">
          {contribution.approvals.map((a) => (
            <div
              key={a.id}
              className="flex items-center justify-between rounded-lg border border-gray-800 bg-gray-950/50 px-3 py-2.5 transition hover:border-gray-700"
            >
              <div className="flex items-center gap-2.5">
                <div className={cn(
                  "flex size-7 items-center justify-center rounded-full",
                  a.vote === "APPROVE" ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
                )}>
                  {a.vote === "APPROVE" ? <ThumbsUp className="size-3.5" /> : <ThumbsDown className="size-3.5" />}
                </div>
                <span className="text-sm text-white">{a.member.user.name}</span>
                {a.note && (
                  <span className="hidden text-xs text-gray-500 sm:inline">&ldquo;{a.note}&rdquo;</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {a.note && (
                  <span className="text-xs text-gray-500 sm:hidden">&ldquo;{a.note}&rdquo;</span>
                )}
                <span className="text-xs text-gray-500">
                  {new Date(a.voted_at).toLocaleDateString("id-ID")}
                </span>
              </div>
            </div>
          ))}
          {contribution.approvals.length === 0 && (
            <p className="text-xs text-gray-500 py-1">Belum ada vote.</p>
          )}
        </div>
      </div>

      {/* ── Vote Panel ── */}
      {currentMemberId && (
        <div className="animate-fade-in-up" style={{ animationDelay: "160ms" }}>
          <VotePanel contribution={contribution} currentMemberId={currentMemberId} onVoted={fetchData} />
        </div>
      )}
    </div>
  );
}
