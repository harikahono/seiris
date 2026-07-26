import { useEffect, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useParams, useNavigate } from "react-router-dom";
import api from "@/api/axios";
import { useAuth } from "@/contexts/AuthContext";
import { useRealtime } from "@/contexts/RealtimeContext";
import { useProjectContext } from "@/contexts/ProjectContext";
import type { Contribution as ContributionType, Team } from "@/types";
import { TypeIcon, StatusBadge } from "@/components/ui/StatusBadge";
import VotePanel from "@/components/ui/VotePanel";
import ProofPreviewModal from "@/components/ui/ProofPreviewModal";
import { ArrowLeft, ThumbsUp, ThumbsDown, X, ExternalLink, ChevronDown, Loader2, RefreshCw } from "lucide-react";
import { useModalAnimation } from "@/hooks/useModalAnimation";
import { html } from "diff2html";
import "diff2html/bundles/css/diff2html.min.css";
import { cn } from "@/lib/utils";
import Skeleton from "@/components/ui/Skeleton";
import UserAvatar from "@/components/ui/UserAvatar";
import { toast } from "sonner";

export default function ContributionDetailPage() {
  const { teamId, contributionId } = useParams<{ teamId: string; contributionId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [contribution, setContribution] = useState<ContributionType | null>(null);
  const [showDiff, setShowDiff] = useState(false);
  const [diffLoading, setDiffLoading] = useState(false);
  const [showProof, setShowProof] = useState(false);
  const [diffFiles, setDiffFiles] = useState<any[]>([]);
  const [expandedFiles, setExpandedFiles] = useState<Set<number>>(new Set([0]));
  const [currentMemberId, setCurrentMemberId] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isProjectMember, setIsProjectMember] = useState(true);
  const [featureEnabled, setFeatureEnabled] = useState(true);
  const { show: showDiffModal, animClass: diffAnim, animateClose: diffClose } = useModalAnimation(showDiff);

  const fetchData = useCallback(async (isBackground = false) => {
    if (!teamId || !contributionId) return;
    if (isBackground) setRefreshing(true);

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
      setInitialLoading(false);
      setRefreshing(false);
    }
  }, [teamId, contributionId, user]);

  useEffect(() => { fetchData(); }, [fetchData]); // initial mount

  // Check feature flag
  useEffect(() => {
    api.get("/config")
      .then((res) => setFeatureEnabled(!!res.data.features?.contribution_proof))
      .catch(() => setFeatureEnabled(true));
  }, []);

  // Load GitHub diff for this contribution
  const loadDiff = async () => {
    if (!teamId || !contributionId) return;
    setDiffLoading(true);
    try {
      const res = await api.get<{ files: any[] }>(`/teams/${teamId}/contributions/${contributionId}/github-diff`);
      setDiffFiles(res.data.files ?? []);
      setExpandedFiles(new Set([0]));
      setShowDiff(true);
    } catch (e) {
      toast.error('Gagal mengambil diff dari GitHub');
    } finally {
      setDiffLoading(false);
    }
  };

  const toggleFile = (i: number) => {
    setExpandedFiles(prev => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  };

  // ── Realtime: refresh on Pusher event ──
  const { refreshVersion } = useRealtime();
  const { projects } = useProjectContext();
  const prevRefresh = useRef(0);
  useEffect(() => {
    if (prevRefresh.current === 0) { prevRefresh.current = refreshVersion; return; }
    prevRefresh.current = refreshVersion;
    fetchData(true); // true = background, jangan unmount skeleton
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshVersion]);

  if (initialLoading) {
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
          className="mb-4 flex items-center gap-1 text-sm text-gray-500 hover:text-white transition-colors"
          aria-label="Kembali"
        >
          <ArrowLeft className="size-4" /> <span className="hidden sm:inline">Kembali</span>
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
      <div className="animate-fade-in-up flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-white transition-colors"
          aria-label="Kembali"
        >
          <ArrowLeft className="size-4" /> <span className="hidden sm:inline">Kembali</span>
        </button>
        {refreshing && (
          <span className="flex items-center gap-1.5 text-xs text-gray-500">
            <RefreshCw className="size-3 animate-spin" />
            Memperbarui...
          </span>
        )}
      </div>

      {/* ── Contribution Detail ── */}
      <div className="animate-fade-in-up rounded-xl border border-gray-800 bg-card p-6 transition-colors duration-200 hover:border-gray-700">
        <div className="mb-5 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-accent/10">
              <TypeIcon type={contribution.type} className="size-5 text-accent" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">{contribution.type}</h1>
              <p className="flex items-center gap-1.5 text-xs text-gray-500">
                <UserAvatar user={contribution.member.user} size="xs" />
                {contribution.member.user.name} &middot;{" "}
                {new Date(contribution.contribution_date).toLocaleDateString("id-ID")}
              </p>
            </div>
          </div>
          <StatusBadge status={contribution.status} />
        </div>

        <p className="mb-5 text-sm text-gray-300 leading-relaxed">{contribution.description}</p>

        {featureEnabled && (
          <>
            {/* Button row: proof + diff */}
            {(contribution.proof_url || contribution.source_url) && (
              <div className="mb-5 flex flex-wrap gap-2">
                {contribution.proof_url && (
                  <button onClick={() => setShowProof(true)} className="flex items-center gap-1.5 rounded-lg border border-gray-700 px-4 py-2 text-xs font-medium text-accent transition-colors hover:bg-accent/10 hover:border-accent">
                    <ExternalLink className="size-4" />
                    Lihat Bukti
                  </button>
                )}
                {contribution.source_url && (
                  <button onClick={loadDiff} disabled={diffLoading} className="flex items-center gap-1.5 rounded-lg border border-gray-700 px-4 py-2 text-xs font-medium text-accent transition-colors hover:bg-accent/10 hover:border-accent disabled:cursor-not-allowed disabled:opacity-50">
                    {diffLoading ? <Loader2 className="size-4 animate-spin" /> : <ChevronDown className="size-4" />}
                    {diffLoading ? "Memuat..." : "Lihat Perubahan Kode"}
                  </button>
                )}
              </div>
            )}
            {/* Diff modal */}
            {showDiffModal && createPortal(
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                <div className={`${diffAnim} relative flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-gray-700 bg-card shadow-2xl`}>
                  <div className="flex items-center justify-between border-b border-gray-800 px-4 py-3">
                    <span className="text-sm font-medium text-gray-300">Diff GitHub</span>
                    <div className="flex items-center gap-3">
                      <a
                        href={contribution.source_url ?? ''}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-accent hover:underline"
                      >
                        <ExternalLink className="size-3.5" />
                        Lihat di GitHub
                      </a>
                      <button
                        type="button"
                        onClick={() => diffClose(() => setShowDiff(false))}
                        className="rounded-md p-1 text-gray-500 hover:bg-gray-800 hover:text-white transition-colors active:scale-[0.97]"
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
                          <div key={i} className="rounded border border-gray-700 overflow-hidden">
                            <button
                              onClick={() => toggleFile(i)}
                              className="flex w-full items-center justify-between gap-2 px-4 py-2 text-xs font-medium text-accent hover:bg-white/5 transition-colors border-b border-gray-700 bg-gray-900/50"
                            >
                              <span className="truncate">{f.filename}</span>
                              <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${expandedFiles.has(i) ? 'rotate-180' : ''}`} />
                            </button>
                            {expandedFiles.has(i) && (
                              <div
                                className="d2h-wrapper d2h-dark-color-scheme max-w-full overflow-x-auto"
                                dangerouslySetInnerHTML={{
                                  __html: html(f.patch ?? '', {
                                    outputFormat: 'side-by-side',
                                    drawFileList: false,
                                    matching: 'lines',
                                  })
                                }}
                              />
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>,
              document.body
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
              className="flex items-center justify-between rounded-lg border border-gray-800 bg-gray-950/50 px-3 py-2.5 transition-colors hover:border-gray-700"
            >
              <div className="flex items-center gap-2.5">
                <div className={cn(
                  "flex size-7 items-center justify-center rounded-full",
                  a.vote === "APPROVE" ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
                )}>
                  {a.vote === "APPROVE" ? <ThumbsUp className="size-3.5" /> : <ThumbsDown className="size-3.5" />}
                </div>
                <UserAvatar user={a.member.user} size="sm" />
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
