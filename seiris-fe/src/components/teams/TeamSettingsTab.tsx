import { useEffect, useRef, useState, type FormEvent } from "react";
import { useOutletContext } from "react-router-dom";
import { isAxiosError } from "axios";
import api from "@/api/axios";
import { parseErrors } from "@/lib/parseErrors";
import { useProjectContext } from "@/contexts/ProjectContext";
import { useRealtime } from "@/contexts/RealtimeContext";
import type { ApprovalThreshold } from "@/types";
import type { TeamContext } from "@/pages/teams/TeamDetailPage";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Loader2, Snowflake, FolderKanban, AlertTriangle } from "lucide-react";
import ConfirmModal from "@/components/ui/ConfirmModal";

interface FieldErrors {
  name?: string;
  description?: string;
  approval_threshold?: string;
}

export default function TeamSettingsTab() {
  const { team, isOwner, fetchTeam } = useOutletContext<TeamContext>();
  const [name, setName] = useState(team.name);
  const [description, setDescription] = useState(team.description ?? "");
  const [approvalThreshold, setApprovalThreshold] = useState<ApprovalThreshold>(team.approval_threshold);
  const [saving, setSaving] = useState(false);
  const [freezing, setFreezing] = useState(false);
  const [freezeConfirmOpen, setFreezeConfirmOpen] = useState(false);
  const [projectFreezing, setProjectFreezing] = useState<string | null>(null); // project id being frozen
  const { projects, refreshProjects } = useProjectContext();
  const activeProjectsCount = projects.filter((p) => !p.is_frozen).length;
  const [errors, setErrors] = useState<FieldErrors>({});

  // ── Realtime: refresh team data on Pusher event ──
  const { refreshVersion } = useRealtime();
  const prevRefresh = useRef(0);
  useEffect(() => {
    if (prevRefresh.current === 0) { prevRefresh.current = refreshVersion; return; }
    prevRefresh.current = refreshVersion;
    fetchTeam();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshVersion]);

  if (!isOwner) {
    return (
      <div className="rounded-lg border border-gray-800 bg-card p-8 text-center">
        <p className="text-sm text-gray-500">Hanya owner yang bisa mengakses pengaturan tim.</p>
      </div>
    );
  }

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!name.trim()) {
      setErrors({ name: "Nama tim harus diisi" });
      return;
    }

    setSaving(true);
    try {
      await api.put(`/teams/${team.id}`, {
        name: name.trim(),
        description: description.trim() || null,
        approval_threshold: approvalThreshold,
      });
      toast.success("Tim berhasil diperbarui");
      fetchTeam();
    } catch (err) {
      const parsed = parseErrors(err);
      if (Object.keys(parsed).length > 0) {
        setErrors(parsed as FieldErrors);
        return;
      }
      toast.error("Gagal memperbarui tim");
    } finally {
      setSaving(false);
    }
  };

  const handleFreeze = async () => {
    setFreezing(true);
    try {
      await api.post(`/teams/${team.id}/freeze`);
      toast.success("Equity tim berhasil di-freeze");
      fetchTeam();
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 409) {
        toast.error(err.response.data?.message ?? "Tim sudah di-freeze sebelumnya");
      } else {
        toast.error("Gagal freeze equity");
      }
    } finally {
      setFreezing(false);
    }
  };

  const inputClass = (field: keyof FieldErrors) =>
    cn(
      "w-full rounded-lg border bg-card px-3 py-2 text-sm text-white placeholder-gray-500 transition focus:outline-none focus:ring-1",
      errors[field]
        ? "border-red-500 focus:border-red-500 focus:ring-red-500"
        : "border-gray-700 focus:border-accent focus:ring-accent"
    );

  const thresholds: { value: ApprovalThreshold; label: string }[] = [
    { value: "50", label: "50+1 — Mayoritas" },
    { value: "100", label: "100% — Sepakat Bulat" },
  ];

  return (
    <div className="space-y-6">
      <form onSubmit={handleSave} className="space-y-4 rounded-lg border border-gray-800 bg-card p-5">
        <h2 className="text-lg font-semibold text-white">Informasi Tim</h2>

        <div>
          <label htmlFor="settings-name" className="mb-1.5 block text-sm font-medium text-gray-300">
            Nama Tim
          </label>
          <input
            id="settings-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className={inputClass("name")}
          />
          {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
        </div>

        <div>
          <label htmlFor="settings-desc" className="mb-1.5 block text-sm font-medium text-gray-300">
            Deskripsi
          </label>
          <textarea
            id="settings-desc"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={inputClass("description")}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-300">
            Threshold Persetujuan
          </label>
          <div className="space-y-2">
            {thresholds.map((t) => (
              <label
                key={t.value}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 transition",
                  approvalThreshold === t.value
                    ? "border-accent bg-accent/5"
                    : "border-gray-700 hover:border-gray-600"
                )}
              >
                <input
                  type="radio"
                  name="settings-threshold"
                  value={t.value}
                  checked={approvalThreshold === t.value}
                  onChange={() => setApprovalThreshold(t.value)}
                  className="accent-accent"
                />
                <span className="text-sm text-gray-300">{t.label}</span>
              </label>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-black transition-colors active:scale-[0.97] hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving && <Loader2 className="size-4 animate-spin" />}
          {saving ? "Menyimpan..." : "Simpan Perubahan"}
        </button>
      </form>

      <div className="space-y-4 rounded-lg border border-red-500/20 bg-red-500/5 p-5">
        <div className="flex items-center gap-2">
          <Snowflake className="size-4 text-red-400" />
          <h2 className="text-lg font-semibold text-white">Freeze Equity</h2>
        </div>
        <p className="text-xs text-gray-500">
          Ketika tim di-freeze, semua perubahan equity akan dihentikan. Aksi ini tidak bisa dibatalkan.
        </p>

        {activeProjectsCount > 0 && (
          <div className="flex items-start gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-300">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
            <span>
              Masih ada {activeProjectsCount} project yang belum di-freeze. Freeze semua project dulu
              sebelum freeze tim (supaya cap table tidak kehilangan slices project aktif).
            </span>
          </div>
        )}

        <button
          type="button"
          onClick={() => setFreezeConfirmOpen(true)}
          disabled={freezing || team.is_frozen || activeProjectsCount > 0}
          className="flex items-center gap-2 rounded-lg border border-red-500/30 px-4 py-2 text-sm text-red-400 transition-colors active:scale-[0.97] hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {freezing ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Snowflake className="size-4" />
          )}
          {team.is_frozen ? "Sudah di-freeze" : "Freeze Equity"}
        </button>
      </div>

      <ConfirmModal
        open={freezeConfirmOpen}
        onClose={() => setFreezeConfirmOpen(false)}
        onConfirm={handleFreeze}
        title="Freeze Equity Tim"
        description="Yakin ingin freeze equity tim? Aksi ini tidak bisa dibatalkan."
        confirmText="Freeze"
        variant="danger"
        loading={freezing}
      />

      {/* ── Freeze Project ── */}
      {projects.length > 0 && (
        <div className="space-y-4 rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-5">
          <div className="flex items-center gap-2">
            <FolderKanban className="size-4 text-yellow-400" />
            <h2 className="text-lg font-semibold text-white">Freeze Project</h2>
          </div>
          <p className="text-xs text-gray-500">
            Ketika project selesai, freeze Pie-nya. Equity project akan disimpan dan diagregasi ke tim induk.
          </p>
          <div className="space-y-2">
            {projects.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-lg border border-gray-700 bg-gray-900/50 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white">{p.name}</p>
                  {p.description && <p className="text-xs text-gray-500 truncate">{p.description}</p>}
                </div>
                <button
                  type="button"
                  disabled={p.is_frozen || projectFreezing === p.id}
                  onClick={async () => {
                    setProjectFreezing(p.id);
                    try {
                      await api.post(`/teams/${team.id}/projects/${p.id}/freeze`);
                      toast.success(`Project "${p.name}" berhasil di-freeze`);
                      refreshProjects();
                    } catch (err) {
                      if (isAxiosError(err) && err.response?.status === 409) {
                        toast.error(`Project "${p.name}" sudah di-freeze`);
                      } else if (isAxiosError(err) && err.response?.status === 422) {
                        toast.error(err.response.data?.message || "Gagal freeze project");
                      } else {
                        toast.error("Gagal freeze project");
                      }
                    } finally {
                      setProjectFreezing(null);
                    }
                  }}
                  className="flex shrink-0 items-center gap-1.5 rounded-lg border border-yellow-500/30 px-3 py-1.5 text-xs text-yellow-400 transition-colors active:scale-[0.97] hover:bg-yellow-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {projectFreezing === p.id ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Snowflake className="size-3.5" />
                  )}
                  {p.is_frozen ? "Sudah di-freeze" : "Freeze"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
