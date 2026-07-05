import { useState, useEffect, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import { isAxiosError } from "axios";
import api from "@/api/axios";
import { useRealtime } from "@/contexts/RealtimeContext";
import type { TeamMember, FmrProposal } from "@/types";
import type { TeamContext } from "@/pages/teams/TeamDetailPage";
import { toast } from "sonner";
import { Check, X, Pencil, Loader2, Send, ChevronDown, ChevronUp } from "lucide-react";

export default function TeamMembersTab() {
  const { team, currentUserId, fetchTeam } = useOutletContext<TeamContext>();
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

  const { refreshVersion } = useRealtime();
  const isOwner = team.owner.id === currentUserId;
  const activeMembers = team.members.filter((m) => m.status === "active");
  const currentMember = activeMembers.find((m) => m.user.id === currentUserId);

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
    if (refreshVersion > 0) fetchTeam();
  }, [refreshVersion, fetchTeam]);

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
    }
  };

  const handleReject = async (proposal: FmrProposal) => {
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
    }
  };

  // ── Existing FMR direct edit (owner only) ──
  const startEditFmr = (member: TeamMember) => {
    setEditingFmr(member.id);
    setFmrValue(String(member.fmr));
  };

  const saveFmr = async (member: TeamMember) => {
    setSavingFmr(true);
    try {
      await api.put(`/teams/${team.id}/members/${member.id}/fmr`, {
        fmr: Number(fmrValue),
      });
      toast.success("FMR berhasil diperbarui");
      setEditingFmr(null);
      fetchTeam();
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

  const handleExit = async (member: TeamMember) => {
    if (!confirm(`Yakin ingin mengeluarkan ${member.user.name} dari tim?`)) return;
    try {
      await api.post(`/teams/${team.id}/members/${member.id}/exit`);
      toast.success(`${member.user.name} berhasil dikeluarkan`);
      fetchTeam();
    } catch {
      toast.error("Gagal mengeluarkan anggota");
    }
  };

  return (
    <div className="space-y-4">
      {/* ── Ajukan FMR (hanya untuk non-owner) ── */}
      {!isOwner && currentMember && (
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm text-white">
                FMR Kamu:{" "}
                <span className="font-semibold text-accent">
                  Rp {currentMember.fmr.toLocaleString("id-ID")}
                </span>
                {currentMember.fmr === 0 && (
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
                  className="rounded p-1.5 text-green-400 hover:bg-gray-800 transition disabled:opacity-50"
                  title="Kirim proposal"
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
                  className="rounded p-1.5 text-gray-500 hover:bg-gray-800 transition"
                >
                  <X className="size-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setProposingFmr(true)}
                className="flex shrink-0 items-center gap-1.5 rounded-lg bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent transition hover:bg-accent/20"
              >
                <Send className="size-3.5" />
                Ajukan FMR
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Daftar Anggota ── */}
      <div className="space-y-3">
        {activeMembers.map((member) => (
          <div
            key={member.id}
            className="flex items-center justify-between rounded-lg border border-gray-800 bg-gray-900 p-4"
          >
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-full bg-accent/20 text-sm font-bold text-accent">
                {member.user.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-white">{member.user.name}</p>
                  {member.role === "owner" && (
                    <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-medium text-accent">
                      Owner
                    </span>
                  )}
                  {member.role === "member" && (
                    <span className="rounded-full bg-gray-800 px-2 py-0.5 text-[10px] text-gray-400">
                      Member
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500">{member.user.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Owner: can edit FMR directly */}
              {isOwner && member.role !== "owner" ? (
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
                        className="rounded p-1 text-green-400 hover:bg-gray-800"
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
                        className="rounded p-1 text-gray-500 hover:bg-gray-800"
                      >
                        <X className="size-3.5" />
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="text-xs text-gray-500">
                        FMR:{" "}
                        <span className="text-gray-300">
                          {member.fmr.toLocaleString("id-ID")}
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() => startEditFmr(member)}
                        className="rounded p-1 text-gray-500 hover:text-accent"
                      >
                        <Pencil className="size-3.5" />
                      </button>
                    </>
                  )}
                </div>
              ) : (
                <span className="text-xs text-gray-500">
                  FMR:{" "}
                  <span className="text-gray-300">
                    {member.fmr.toLocaleString("id-ID")}
                  </span>
                </span>
              )}

              {isOwner && member.role !== "owner" && editingFmr !== member.id && (
                <button
                  type="button"
                  onClick={() => handleExit(member)}
                  className="rounded px-2 py-1 text-xs text-red-400 transition hover:bg-red-500/10"
                >
                  Keluarkan
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ── Proposal FMR Tertunda ── */}
      {proposals.length > 0 && (
        <div className="rounded-lg border border-gray-800 bg-gray-900">
          <button
            type="button"
            onClick={() => setProposalsOpen(!proposalsOpen)}
            className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-gray-300 transition hover:text-white"
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
                    className="flex items-center justify-between gap-3 rounded-lg border border-gray-800 bg-gray-900/50 p-3"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gray-800 text-xs font-bold text-gray-400">
                        {proposal.member.user.name.charAt(0).toUpperCase()}
                      </div>
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
                            className="rounded p-1.5 text-green-400 transition hover:bg-gray-800"
                            title="Setujui"
                          >
                            <Check className="size-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleReject(proposal)}
                            className="rounded p-1.5 text-red-400 transition hover:bg-gray-800"
                            title="Tolak"
                          >
                            <X className="size-4" />
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
    </div>
  );
}
