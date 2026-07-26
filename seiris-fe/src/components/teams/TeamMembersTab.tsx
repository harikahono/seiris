import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useOutletContext, useNavigate } from "react-router-dom";
import { isAxiosError } from "axios";
import api from "@/api/axios";
import { useRealtime } from "@/contexts/RealtimeContext";
import { useProjectContext } from "@/contexts/ProjectContext";
import type { TeamMember, FmrProposal } from "@/types";
import type { TeamContext } from "@/pages/teams/TeamDetailPage";
import { toast } from "sonner";
import UserAvatar from "@/components/ui/UserAvatar";
import { Check, X, Pencil, Loader2, Send, ChevronDown, ChevronUp, LogOut, Info, Lock, ShieldAlert } from "lucide-react";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { useModalAnimation } from "@/hooks/useModalAnimation";

export default function TeamMembersTab() {
  const { team, currentUserId, fetchTeam } = useOutletContext<TeamContext>();
  const navigate = useNavigate();
  const [editingFmr, setEditingFmr] = useState<string | null>(null);
  const [fmrValue, setFmrValue] = useState("");
  const [savingFmr, setSavingFmr] = useState(false);

  // ── FMR Proposal State ──
  const [proposingFmr, setProposingFmr] = useState(false);
  const [proposedFmrValue, setProposedFmrValue] = useState("");
  const [submittingProposal, setSubmittingProposal] = useState(false);
  const [proposals, setProposals] = useState<FmrProposal[]>([]);
  const [loadingProposals, setLoadingProposals] = useState(false);
  const [proposalsOpen, setProposalsOpen] = useState(true);
  // F-2: loading state per-proposal buat approve/reject — cegah double click
  const [actioningProposal, setActioningProposal] = useState<string | null>(null);

  const { refreshVersion } = useRealtime();
  const { currentProjectId, projects } = useProjectContext();
  const isProjectFrozen = !!currentProjectId && (projects.find((p) => p.id === currentProjectId)?.is_frozen ?? false);
  const isOwner = team.owner.id === currentUserId;
  const activeMembers = team.members.filter((m) => m.status === "active");
  const currentMember = activeMembers.find((m) => m.user.id === currentUserId);
  const hasProjectScope = !!currentProjectId;

  // Re-fetch team dengan project scope saat project berubah
  useEffect(() => {
    fetchTeam(currentProjectId ?? undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentProjectId]);

  // ── Fetch Pending Proposals ──
  const fetchProposals = useCallback(async () => {
    try {
      const { data } = await api.get<{ data: FmrProposal[] }>(
        `/teams/${team.id}/fmr-proposals`,
        { params: { filter: "PENDING", per_page: 50 } }
      );
      setProposals(data.data ?? []);
    } catch {
      if (import.meta.env.DEV) console.warn("[TeamMembersTab] Failed to fetch proposals");
    } finally {
      setLoadingProposals(false);
    }
  }, [team.id]);

  // Initial load → loading=true dari initial state
  useEffect(() => { fetchProposals(); }, [fetchProposals]);

  // Background refresh dari Pusher → silent
  useEffect(() => {
    if (refreshVersion > 0) fetchProposals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshVersion]);

  // Re-fetch team data when realtime event arrives
  useEffect(() => {
    if (refreshVersion > 0) fetchTeam(currentProjectId ?? undefined);
  }, [refreshVersion, fetchTeam, currentProjectId]);

  // ── Submit FMR Proposal (non-owner) ──
  const handleProposeFmr = async () => {
    const val = Number(proposedFmrValue);
    if (!proposedFmrValue || isNaN(val) || val < 0) {
      toast.error("Masukkan FMR yang valid");
      return;
    }

    setSubmittingProposal(true);
    try {
      await api.post(`/teams/${team.id}/fmr-proposals`, { proposed_fmr: val });
      toast.success("Proposal FMR diajukan — menunggu persetujuan owner");
      setProposingFmr(false);
      setProposedFmrValue("");
      fetchProposals();
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 409) {
        toast.error("Kamu masih punya proposal yang menunggu");
      } else if (isAxiosError(err) && err.response?.status === 422) {
        const data = err.response.data as { errors?: Record<string, string[]> };
        toast.error(data.errors?.proposed_fmr?.[0] ?? "FMR tidak valid");
      } else {
        toast.error("Gagal mengajukan FMR");
      }
    } finally {
      setSubmittingProposal(false);
    }
  };

  // ── Approve / Reject (owner only) ──
  const handleApprove = async (proposal: FmrProposal) => {
    setActioningProposal(proposal.id);
    try {
      await api.post(`/fmr-proposals/${proposal.id}/approve`);
      toast.success(`FMR ${proposal.member.user.name} disetujui`);
      await fetchProposals();
      await fetchTeam();
    } catch (err) {
      if (isAxiosError(err) && err.response?.data?.message) {
        toast.error(err.response.data.message);
      } else {
        toast.error("Gagal menyetujui proposal");
      }
    } finally {
      setActioningProposal(null);
    }
  };

  const handleReject = async (proposal: FmrProposal) => {
    setActioningProposal(proposal.id);
    try {
      await api.post(`/fmr-proposals/${proposal.id}/reject`);
      toast.success(`Proposal FMR ${proposal.member.user.name} ditolak`);
      await fetchProposals();
    } catch (err) {
      if (isAxiosError(err) && err.response?.data?.message) {
        toast.error(err.response.data.message);
      } else {
        toast.error("Gagal menolak proposal");
      }
    } finally {
      setActioningProposal(null);
    }
  };

  // ── Existing FMR direct edit (owner only) ──
  const startEditFmr = (member: TeamMember) => {
    setEditingFmr(member.id);
    const currentFmr = hasProjectScope && member.project_fmr != null ? member.project_fmr : member.fmr;
    setFmrValue(String(currentFmr));
  };

  const displayFmr = (member: TeamMember) => {
    return hasProjectScope && member.project_fmr != null ? member.project_fmr : member.fmr;
  };

  const saveFmr = async (member: TeamMember) => {
    setSavingFmr(true);
    try {
      const payload: Record<string, number | string> = { fmr: Number(fmrValue) };
      if (currentProjectId) payload.project_id = currentProjectId;
      await api.put(`/teams/${team.id}/members/${member.id}/fmr`, payload);
      toast.success(`FMR ${currentProjectId ? 'project' : ''} berhasil diperbarui`);
      setEditingFmr(null);
      fetchTeam(currentProjectId ?? undefined);
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 422) {
        const data = err.response.data as { errors?: Record<string, string[]> };
        toast.error(data.errors?.fmr?.[0] ?? "FMR tidak valid");
      } else {
        toast.error("Gagal memperbarui FMR");
      }
    } finally {
      setSavingFmr(false);
    }
  };

  const cancelEditFmr = () => {
    setEditingFmr(null);
    setFmrValue("");
  };

  // ── Project Roster Management ──
  const [managingProject, setManagingProject] = useState<string | null>(null);

  const handleAddToProject = async (member: TeamMember) => {
    if (!currentProjectId) return;
    setManagingProject(member.id);
    try {
      await api.post(`/teams/${team.id}/projects/${currentProjectId}/members`, {
        member_id: member.id,
      });
      toast.success(`${member.user.name} ditambahkan ke project`);
      fetchTeam(currentProjectId ?? undefined);
    } catch {
      toast.error(isProjectFrozen ? "Project ini sudah dikunci, anggota tidak bisa ditambah lagi." : "Gagal menambahkan anggota ke project");
    } finally {
      setManagingProject(null);
    }
  };

  const handleRemoveFromProject = async (member: TeamMember) => {
    if (!currentProjectId) return;
    setManagingProject(member.id);
    try {
      await api.delete(`/teams/${team.id}/projects/${currentProjectId}/members/${member.id}`);
      toast.success(`${member.user.name} dikeluarkan dari project`);
      fetchTeam(currentProjectId ?? undefined);
    } catch {
      toast.error(isProjectFrozen ? "Project ini sudah dikunci, anggota tidak bisa dikeluarkan lagi." : "Gagal mengeluarkan anggota dari project");
    } finally {
      setManagingProject(null);
    }
  };

  // ── Exit Member with Leaver Type ──
  const [exitingMember, setExitingMember] = useState<TeamMember | null>(null);
  const [leaverType, setLeaverType] = useState<"good" | "bad">("bad");
  const [exitReason, setExitReason] = useState("");
  const [exitingLoading, setExitingLoading] = useState(false);
  const { show: showExit, animClass: exitAnim, animateClose: exitClose } = useModalAnimation(!!exitingMember);
  const exitTrapRef = useFocusTrap(showExit);

  const exitCancel = () => exitClose(() => { setExitingMember(null); setExitReason(""); });

  const handleExit = async () => {
    if (!exitingMember) return;
    setExitingLoading(true);
    try {
      await api.post(`/teams/${team.id}/members/${exitingMember.id}/exit`, {
        leaver_type: leaverType,
        exit_reason: exitReason.trim() || null,
      });
      toast.success(`${exitingMember.user.name} berhasil dikeluarkan`);
      setExitingMember(null);
      setExitReason("");
      fetchTeam();
    } catch {
      toast.error("Gagal mengeluarkan anggota");
    } finally {
      setExitingLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* ── Ajukan FMR (hanya untuk non-owner) ── */}
      {!isOwner && currentMember && (
        <div className="rounded-lg border border-gray-800 bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm text-white">
                <span title="Fair Market Rate — nilai pasar wajar per jam">{hasProjectScope ? "FMR Project Kamu" : "FMR Kamu"}</span>:{" "}
                <span className="font-semibold text-accent">
                  Rp {displayFmr(currentMember).toLocaleString("id-ID")}
                </span>
                {hasProjectScope && currentMember.project_fmr == null && (
                  <span className="ml-1 text-[10px] text-gray-500">(global)</span>
                )}
                {displayFmr(currentMember) === 0 && (
                  <span className="ml-2 text-[10px] text-yellow-500">
                    (Belum diset — tidak bisa log TIME / IDEA / NETWORK)
                  </span>
                )}
              </p>
              {!proposingFmr && (
                <p className="mt-0.5 text-xs text-gray-500">
                  Ajukan perubahan FMR ke owner
                </p>
              )}
            </div>

            {proposingFmr ? (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={proposedFmrValue}
                  onChange={(e) => setProposedFmrValue(e.target.value)}
                  className="w-28 rounded border border-accent bg-gray-800 px-2.5 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none"
                  placeholder={String(currentMember.fmr || "50000")}
                  autoFocus
                />
                  <button
                    type="button"
                    onClick={handleProposeFmr}
                    disabled={submittingProposal}
                    className="rounded p-1.5 text-green-400 hover:bg-gray-800 transition-colors active:scale-[0.97] disabled:opacity-50"
                    aria-label="Kirim proposal FMR" title="Kirim proposal FMR"
                  >
                  {submittingProposal ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Send className="size-4" />
                  )}
                </button>
                  <button
                    type="button"
                    onClick={() => {
                      setProposingFmr(false);
                      setProposedFmrValue("");
                    }}
                    className="rounded p-1.5 text-gray-500 hover:bg-gray-800 transition-colors active:scale-[0.97]"
                    aria-label="Batal ajukan proposal" title="Batal ajukan proposal"
                  >
                  <X className="size-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setProposingFmr(true)}
                className="flex shrink-0 items-center gap-1.5 rounded-lg border border-accent/30 bg-accent/5 px-3 py-1.5 text-xs font-medium text-accent transition-colors active:scale-[0.97] hover:bg-accent/15"
              >
                <Send className="size-3.5" />
                Ajukan FMR
              </button>
            )}
          </div>
        </div>
      )}

      <div>
        {activeMembers.map((member, i) => (
            <div key={member.id}>
            <div className="flex items-center justify-between px-0 py-4">
              <div className="flex items-center gap-3 cursor-pointer transition-colors rounded-lg -ml-1 px-1 py-0.5 hover:bg-gray-900/50" onClick={() => navigate(`/teams/${team.id}/members/${member.id}`)}>
                <UserAvatar user={member.user} size="lg" />
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-white">{member.user.name}</p>
                    {member.role === "owner" && (
                      <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-medium text-accent">
                        Owner
                      </span>
                    )}
                    {member.role === "member" && (
                      <span className="rounded-full bg-gray-800 px-2 py-0.5 text-[10px] text-gray-500">
                        Member
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-600">{member.user.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Owner: can edit FMR directly (including own FMR) */}
                {isOwner ? (
                  <div className="flex items-center gap-1">
                    {editingFmr === member.id ? (
                      <>
                        <input
                          type="number"
                          value={fmrValue}
                          onChange={(e) => setFmrValue(e.target.value)}
                          className="w-24 rounded border border-accent bg-gray-800 px-2 py-1 text-xs text-white"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => saveFmr(member)}
                          disabled={savingFmr}
                          className="flex items-center justify-center rounded p-1 text-green-400 hover:bg-gray-800 min-w-[44px] min-h-[44px]"
                          aria-label={`Simpan FMR ${member.user.name}`} title={`Simpan FMR ${member.user.name}`}
                        >
                          {savingFmr ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <Check className="size-3.5" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={cancelEditFmr}
                          className="flex items-center justify-center rounded p-1 text-gray-500 hover:bg-gray-800 min-w-[44px] min-h-[44px]"
                          aria-label={`Batal edit FMR ${member.user.name}`} title={`Batal edit FMR ${member.user.name}`}
                        >
                          <X className="size-3.5" />
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="text-right">
<p className="text-[11px] text-gray-600" title="Fair Market Rate — nilai pasar wajar per jam">{hasProjectScope ? "FMR Project" : "FMR"}</p>
                          <p className="text-sm font-semibold tabular-nums text-white">
                            Rp {displayFmr(member).toLocaleString("id-ID")}
                          </p>
                          {hasProjectScope && member.project_fmr == null && (
                            <p className="text-[10px] text-gray-600">(global)</p>
                          )}
                        </div>
                        {isProjectFrozen ? (
                            <span title="Project sudah dikunci, FMR tidak bisa diubah">
                              <Lock
                                className="size-3.5 text-gray-600"
                                aria-label="Project sudah dikunci, FMR tidak bisa diubah"
                              />
                            </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => startEditFmr(member)}
                            className="rounded p-1.5 text-gray-500 hover:text-accent transition-colors active:scale-[0.97]"
                            aria-label={`Edit FMR ${member.user.name}`} title={`Edit FMR ${member.user.name}`}
                          >
                            <Pencil className="size-3.5" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                ) : (
                  <div className="text-right">
                    <p className="text-[11px] text-gray-600" title="Fair Market Rate — nilai pasar wajar per jam">{hasProjectScope ? "FMR Project" : "FMR"}</p>
                    <p className="text-sm font-semibold tabular-nums text-white">
                      Rp {displayFmr(member).toLocaleString("id-ID")}
                    </p>
                    {hasProjectScope && member.project_fmr == null && (
                      <p className="text-[10px] text-gray-600">(global)</p>
                    )}
                  </div>
                )}

                {isOwner && member.role !== "owner" && editingFmr !== member.id && (
                  <button
                    type="button"
                    onClick={() => setExitingMember(member)}
                    className="rounded px-2 py-1 text-xs text-red-400 transition-colors active:scale-[0.97] hover:bg-red-500/10"
                  >
                    Keluarkan
                  </button>
                )}

                {hasProjectScope && isOwner && member.role !== "owner" && editingFmr !== member.id && (
                  isProjectFrozen ? (
                          <span
                            className="flex items-center gap-1 rounded px-2 py-1 text-xs text-gray-600"
                            title="Project sudah dikunci, anggota tidak bisa ditambah atau dikeluarkan"
                          >
                            <Lock className="size-3.5" /> Dikunci
                          </span>
                  ) : (
                    member.project_fmr != null ? (
                      <button
                        type="button"
                        onClick={() => handleRemoveFromProject(member)}
                        disabled={managingProject === member.id}
                        className="rounded px-2 py-1 text-xs text-yellow-400 transition-colors active:scale-[0.97] hover:bg-yellow-500/10 disabled:opacity-50"
                      >
                        {managingProject === member.id ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : 'Keluar'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleAddToProject(member)}
                        disabled={managingProject === member.id}
                        className="rounded px-2 py-1 text-xs text-green-400 transition-colors active:scale-[0.97] hover:bg-green-500/10 disabled:opacity-50"
                      >
                        {managingProject === member.id ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : 'Masuk'}
                      </button>
                    )
                  )
                )}
              </div>
            </div>
            {i < activeMembers.length - 1 && <div className="border-t border-subtle" />}
          </div>
        ))}
      </div>

      {/* ── Proposal FMR Tertunda ── */}
      {proposals.length > 0 && (
        <div className="rounded-lg border border-gray-800 bg-card">
          <button
            type="button"
            onClick={() => setProposalsOpen(!proposalsOpen)}
            className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-gray-300 transition-colors hover:text-white"
          >
            <span>
              Proposal FMR{" "}
              <span className="ml-1 text-xs text-gray-500">({proposals.length})</span>
            </span>
            {proposalsOpen ? (
              <ChevronUp className="size-4" />
            ) : (
              <ChevronDown className="size-4" />
            )}
          </button>

          {proposalsOpen && (
            <div className="space-y-2 px-4 pb-4">
              {proposals.map((proposal) => {
                const isMyProposal = proposal.member.user.id === currentUserId;
                return (
                  <div
                    key={proposal.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-gray-800 bg-card/50 p-3"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <UserAvatar user={proposal.member.user} size="md" />
                      <div className="min-w-0">
                        <p className="truncate text-sm text-gray-300">
                          {proposal.member.user.name}
                          {isMyProposal && (
                            <span className="text-gray-500"> (Kamu)</span>
                          )}
                        </p>
                        <p className="text-xs text-gray-500">
                          Mengajukan FMR:{" "}
                          <span className="text-accent">
                            Rp {proposal.proposed_fmr.toLocaleString("id-ID")}
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      {isMyProposal ? (
                        <span className="whitespace-nowrap text-[11px] text-yellow-400">
                          Menunggu persetujuan...
                        </span>
                      ) : isOwner ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleApprove(proposal)}
                            disabled={actioningProposal === proposal.id}
                            className="flex items-center gap-1 rounded px-2.5 py-1.5 text-xs font-medium text-green-400 transition-colors active:scale-[0.97] hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                            aria-label={`Setujui proposal ${proposal.member.user.name}`} title={`Setujui proposal ${proposal.member.user.name}`}
                          >
                            {actioningProposal === proposal.id ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                            {actioningProposal === proposal.id ? "Menyetujui..." : "Setujui"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleReject(proposal)}
                            disabled={actioningProposal === proposal.id}
                            className="flex items-center gap-1 rounded px-2.5 py-1.5 text-xs font-medium text-red-400 transition-colors active:scale-[0.97] hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                            aria-label={`Tolak proposal ${proposal.member.user.name}`} title={`Tolak proposal ${proposal.member.user.name}`}
                          >
                            {actioningProposal === proposal.id ? <Loader2 className="size-3.5 animate-spin" /> : <X className="size-3.5" />}
                            {actioningProposal === proposal.id ? "Menolak..." : "Tolak"}
                          </button>
                        </>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Loading state for proposals ── */}
      {loadingProposals && proposals.length === 0 && (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="size-5 animate-spin text-gray-500" />
        </div>
      )}

      {/* ── Exit Member Modal with Leaver Type ── */}
      {showExit && exitingMember && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="fixed inset-0" onClick={exitCancel} />
          <div ref={exitTrapRef} className={`${exitAnim} relative w-full max-w-md rounded-xl border border-gray-700 bg-card p-6 shadow-2xl`} onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col items-center text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-red-500/10">
                <LogOut className="size-6 text-red-400" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-white">Keluarkan Anggota</h3>
              <p className="mt-1 text-sm text-gray-500">
                Yakin ingin mengeluarkan <strong className="text-gray-300">{exitingMember.user.name}</strong>?
              </p>
            </div>

            {/* ── Leaver Type ── */}
            <div className="mt-5 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">Tipe Keluar</p>
              <label className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition ${leaverType === "bad" ? "border-red-500/40 bg-red-500/5" : "border-gray-700 hover:border-gray-600"}`}>
                <input type="radio" name="leaver_type" value="bad" checked={leaverType === "bad"} onChange={() => setLeaverType("bad")} className="mt-0.5 accent-red-500" />
                <div>
                  <div className="flex items-center gap-1.5">
                    <ShieldAlert className="size-3.5 text-red-400" />
                    <p className="text-sm font-medium text-red-300">Bad Leaver</p>
                  </div>
                  <p className="mt-0.5 text-xs text-gray-500">Anggota melanggar/mengundurkan diri — slices non-cash hangus. Equity project & tim dihitung ulang.</p>
                </div>
              </label>
              <label className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition ${leaverType === "good" ? "border-green-500/40 bg-green-500/5" : "border-gray-700 hover:border-gray-600"}`}>
                <input type="radio" name="leaver_type" value="good" checked={leaverType === "good"} onChange={() => setLeaverType("good")} className="mt-0.5 accent-green-500" />
                <div>
                  <div className="flex items-center gap-1.5">
                    <Info className="size-3.5 text-green-400" />
                    <p className="text-sm font-medium text-green-300">Good Leaver</p>
                  </div>
                  <p className="mt-0.5 text-xs text-gray-500">Tim yg salah/force majeure — semua slices tetap. Equity tetap utuh.</p>
                </div>
              </label>
            </div>

            {/* ── Exit Reason (opsional) ── */}
            <div className="mt-4">
              <label className="mb-1 block text-xs text-gray-500">Alasan keluar (opsional)</label>
              <textarea
                rows={2}
                value={exitReason}
                onChange={(e) => setExitReason(e.target.value)}
                placeholder="Contoh: Pindah project lain, tidak aktif 30 hari..."
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={exitCancel}
                disabled={exitingLoading}
                className="flex-1 rounded-lg border border-gray-700 px-4 py-2 text-sm font-medium text-gray-400 transition-colors hover:bg-gray-800 hover:text-white disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExit}
                disabled={exitingLoading}
                className="flex-1 rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white transition-colors active:scale-[0.97] hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {exitingLoading ? <Loader2 className="mx-auto size-4 animate-spin" /> : "Keluarkan"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
