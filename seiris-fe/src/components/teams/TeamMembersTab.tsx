import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { isAxiosError } from "axios";
import api from "@/api/axios";
import type { TeamMember } from "@/types";
import type { TeamContext } from "@/pages/teams/TeamDetailPage";
import { toast } from "sonner";
import { Check, X, Pencil, Loader2 } from "lucide-react";

export default function TeamMembersTab() {
  const { team, currentUserId, fetchTeam } = useOutletContext<TeamContext>();
  const [editingFmr, setEditingFmr] = useState<string | null>(null);
  const [fmrValue, setFmrValue] = useState("");
  const [savingFmr, setSavingFmr] = useState(false);

  const isOwner = team.owner.id === currentUserId;
  const activeMembers = team.members.filter((m) => m.status === "active");

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
                      FMR: <span className="text-gray-300">{member.fmr.toLocaleString("id-ID")}</span>
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
                FMR: <span className="text-gray-300">{member.fmr.toLocaleString("id-ID")}</span>
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
  );
}
