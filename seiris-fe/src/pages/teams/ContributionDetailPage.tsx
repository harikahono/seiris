import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "@/api/axios";
import { useAuth } from "@/contexts/AuthContext";
import { useRealtime } from "@/contexts/RealtimeContext";
import { useProjectContext } from "@/contexts/ProjectContext";
import type { Contribution as ContributionType, Team } from "@/types";
import { TypeIcon, StatusBadge } from "@/components/ui/StatusBadge";
import VotePanel from "@/components/ui/VotePanel";
import ProofPreviewModal from "@/components/ui/ProofPreviewModal";
import { ArrowLeft, ThumbsUp, ThumbsDown, X, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import Skeleton from "@/components/ui/Skeleton";
import { toast } from "sonner";

export default function ContributionDetailPage() {
  const { teamId, contributionId } = useParams<{ teamId: string; contributionId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [contribution, setContribution] = useState<ContributionType | null>(null);
  const [showDiff, setShowDiff] = useState(false);
  const [showProof, setShowProof] = useState(false);
  const [diffFiles, setDiffFiles] = useState<any[]>([]);
  const [currentMemberId, setCurrentMemberId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isProjectMember, setIsProjectMember] = useState(true);
  const [featureEnabled, setFeatureEnabled] = useState(true);

  const fetchData = useCallback(async () => {
    if (!teamId || !contributionId) return;
    setLoading(true);

    try {
      const contribRes = await api.get<{ data: ContributionType }>(`/teams/${teamId}/contributions/${contributionId}`);
      const c = contribRes.data.data;
      setContribution(c);

      // C3: fetch team DENGAN project_id biar project_fmr ke-populate
      // (wajib buat project-scoped voting — tanpa ini VotePanel ke-lock)
      const teamRes = await api.get<{ data: Team }>(`/teams/${teamId}`, {
        params: c.project_id ? { project_id: c.project_id } : {},
      });
      const myMember = teamRes.data.data.members.find((m) => m.user.id === user!.id);
      setCurrentMemberId(myMember?.id ?? null);
      // H2: project-scoped → cek roster via project_fmr existence (not null/undefined)
      // Jika project_fmr ada (undefined/null/0/apa pun) artinya member ada di roster
      setIsProjectMember(!c.project_id || myMember?.project_fmr !== null);
    } catch {
      toast.error("Gagal memuat detail kontribusi");
    } finally {
      setLoading(false);
    }
  }, [teamId, contributionId, user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Check feature flag
  useEffect(() => {
    api.get("/config")
      .then((res) => setFeatureEnabled(!!res.data.features?.contribution_proof))
      .catch(() => setFeatureEnabled(true));
  }, []);

  // Load GitHub diff for this contribution
  const loadDiff = async () => {
    if (!teamId || !contributionId) return;
    try {
      const res = await api.get<{ files: any[] }>(`/teams/${teamId}/contributions/${contributionId}/github-diff`);
      setDiffFiles(res.data.files ?? []);
      setShowDiff(true);
    } catch (e) {
      toast.error('Gagal mengambil diff dari GitHub');
    }
  };


  // ── Realtime: refresh on Pusher event ──
  const { refreshVersion } = useRealtime();
  const { projects } = useProjectContext();
  const prevRefresh = useRef(0);
  useEffect(() => {
    if (prevRefresh.current === 0) { prevRefresh.current = refreshVersion; return; }
    prevRefresh.current = refreshVersion;
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshVersion]);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl space-y-5 px-6 pt-10 pb-8">
        {/* Back button */}
        <Skeleton className="h-4 w-16" />
        {/* Detail card */}
        <div className="rounded-xl border border-gray-800/50 bg-card p-6 space-y-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="size-10 rounded-full" />
              <div className="space-y-1.5">
                <Skeleton className="h-5 w-28" />
                <Skeleton className="h-3 w-36" />
              </div>
            </div>
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <div className="flex gap-4">
            <Skeleton className="h-16 w-28 rounded-lg" />
            <Skeleton className="h-16 w-24 rounded-lg" />
            <Skeleton className="h-16 w-28 rounded-lg" />
          </div>
        </div>
        {/* Voting card */}
        <div className="rounded-xl border border-gray-800/50 bg-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-32" />
            <div className="flex gap-3">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-12" />
            </div>
          </div>
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center justify-between rounded-lg border border-gray-800/50 px-3 py-2.5">
              <div className="flex items-center gap-2.5">
                <Skeleton className="size-7 rounded-full" />
                <Skeleton className="h-4 w-24" />
              </div>
              <Skeleton className="h-3 w-20" />
            </div>
          ))}
        </div>
        {/* Vote panel */}
        <Skeleton className="h-24 w-full rounded-xl" />
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

        {featureEnabled && (
          <>
            {/* Proof link — pakai modal seperti revenue */}
            {contribution.proof_url && (
              <button onClick={() => setShowProof(true)} className="mb-3 flex items-center gap-1.5 rounded-lg border border-gray-700 px-4 py-2 text-xs font-medium text-accent transition hover:bg-accent/10 hover:border-accent">
                <ExternalLink className="size-4" />
                Lihat Bukti
              </button>
            )}
            {/* GitHub diff button */}
            {contribution.source_url && (
              <button onClick={loadDiff} className="mb-3 ml-4 rounded bg-accent px-3 py-1 text-sm font-medium text-black hover:bg-accent-hover">Lihat Perubahan Kode</button>
            )}
            {/* Diff modal */}
            {showDiff && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
                <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-gray-700 bg-card shadow-2xl">
                  <div className="flex items-center justify-between border-b border-gray-800 px-4 py-3">
                    <span className="text-sm font-medium text-gray-300">Diff GitHub</span>
                    <div className="flex items-center gap-3">
                      <a
                        href={contribution.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-accent hover:underline"
                      >
                        <ExternalLink className="size-3.5" />
                        Lihat di GitHub
                      </a>
                      <button
                        type="button"
                        onClick={() => setShowDiff(false)}
                        className="rounded-md p-1 text-gray-500 hover:bg-gray-800 hover:text-white"
                        aria-label="Tutup"
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 overflow-auto p-4">
                    <div className="space-y-4">
                      {diffFiles.length === 0 ? (
                        <p className="text-gray-400">Tidak ada perubahan.</p>
                      ) : (
                        diffFiles.map((f, i) => (
                          <div key={i} className="rounded border border-gray-700 bg-gray-950 p-2">
                            <p className="mb-1 text-xs font-medium text-accent">{f.filename}</p>
                            <pre className="whitespace-pre-wrap text-xs leading-5">
                            {f.patch.split('\n').map((line: string, li: number) => {
                              let cls = "text-gray-300";
                              if (line.startsWith('+')) cls = "text-green-400";
                              else if (line.startsWith('-')) cls = "text-red-400";
                              else if (line.startsWith('@@')) cls = "text-cyan-400";
                              return <div key={li} className={cls}>{line}</div>;
                            })}
                          </pre>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}


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
          {(contribution.type === "TIME" || contribution.type === "IDEA" || contribution.type === "NETWORK") && contribution.hours != null && (
            <div className="min-w-[100px] rounded-lg border border-gray-800 bg-gray-950/50 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-500">Jam</p>
              <p className="mt-1 font-mono text-sm font-medium text-white">
                {Number(contribution.hours)} jam
              </p>
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
          <VotePanel
            contribution={contribution}
            currentMemberId={currentMemberId}
            onVoted={() => navigate(`/teams/${teamId}/contributions`)}
            isProjectMember={isProjectMember}
            frozen={contribution.project_id ? (projects.find((p) => p.id === contribution.project_id)?.is_frozen ?? false) : false}
          />
        </div>
      )}

      {contribution.proof_url && (
        <ProofPreviewModal open={showProof} onClose={() => setShowProof(false)} url={contribution.proof_url} />
      )}
    </div>
  );
}
