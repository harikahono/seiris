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
import { Camera, Loader2, Snowflake, FolderKanban, AlertTriangle, Info, CheckCircle } from "lucide-react";
import ConfirmModal from "@/components/ui/ConfirmModal";

interface FieldErrors {
  name?: string;
  description?: string;
  approval_threshold?: string;
  commission_rate?: string;
}

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="h-4 w-0.5 rounded-full bg-accent/50" />
      <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500">{label}</h2>
    </div>
  );
}

const inputBase =
  "w-full border-0 border-b border-white/10 bg-transparent px-0 py-2.5 text-sm text-white placeholder-gray-500 transition-colors focus:border-accent focus:outline-none focus:ring-0";

export default function TeamSettingsTab() {
  const { team, isOwner, fetchTeam } = useOutletContext<TeamContext>();
  const [name, setName] = useState(team.name);
  const [description, setDescription] = useState(team.description ?? "");
  const [approvalThreshold, setApprovalThreshold] = useState<ApprovalThreshold>(team.approval_threshold);
  const [commissionRate, setCommissionRate] = useState(String(team.commission_rate ?? 50));
  const [saving, setSaving] = useState(false);
  // C5: state logo
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoLoading, setLogoLoading] = useState(false);
  const [logoDeleting, setLogoDeleting] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [freezing, setFreezing] = useState(false);
  const [freezeConfirmOpen, setFreezeConfirmOpen] = useState(false);
  const [projectFreezing, setProjectFreezing] = useState<string | null>(null);
  const [projectFreezeTargetId, setProjectFreezeTargetId] = useState<string | null>(null);
  const { projects, refreshProjects } = useProjectContext();
  const activeProjectsCount = projects.filter((p) => !p.is_frozen).length;
  const [errors, setErrors] = useState<FieldErrors>({});

  const { refreshVersion } = useRealtime();
  const prevRefresh = useRef(0);
  useEffect(() => {
    if (prevRefresh.current === 0) { prevRefresh.current = refreshVersion; return; }
    prevRefresh.current = refreshVersion;
    fetchTeam();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshVersion]);

  // C5: logo upload handler
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // ponytail: revoke previous preview sebelum bikin baru
      if (logoPreview) URL.revokeObjectURL(logoPreview);
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleLogoUpload = async () => {
    if (!logoFile) return;
    setLogoLoading(true);
    try {
      const formData = new FormData();
      formData.append("logo", logoFile);
      await api.post(`/teams/${team.id}/logo`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("Logo tim berhasil diperbarui.");
      setLogoFile(null);
      setLogoPreview(null);
      fetchTeam();
    } catch (err) {
      const msg = isAxiosError(err) ? err.response?.data?.message : null;
      toast.error(msg ?? "Gagal mengunggah logo.");
    } finally {
      setLogoLoading(false);
    }
  };

  const handleDeleteLogo = async () => {
    setLogoDeleting(true);
    try {
      await api.delete(`/teams/${team.id}/logo`);
      setLogoPreview(null);
      setLogoFile(null);
      fetchTeam();
      toast.success("Logo tim berhasil dihapus.");
    } catch {
      toast.error("Gagal menghapus logo.");
    } finally {
      setLogoDeleting(false);
    }
  };

  if (!isOwner) {
    return (
      <div className="rounded-lg border border-gray-800 bg-card p-8 text-center">
        <p className="text-sm text-gray-500">Hanya owner yang bisa mengakses pengaturan tim.</p>
      </div>
    );
  }

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (saving) return;
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
        commission_rate: Number(commissionRate),
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
      setFreezeConfirmOpen(false);
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

  const handleProjectFreeze = async () => {
    if (!projectFreezeTargetId) return;
    setProjectFreezing(projectFreezeTargetId);
    try {
      await api.post(`/teams/${team.id}/projects/${projectFreezeTargetId}/freeze`);
      setProjectFreezeTargetId(null);
      toast.success("Project berhasil di-freeze");
      refreshProjects();
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 409) {
        toast.error("Project sudah di-freeze sebelumnya");
      } else if (isAxiosError(err) && err.response?.status === 422) {
        toast.error(err.response.data?.message || "Gagal freeze project");
      } else {
        toast.error("Gagal freeze project");
      }
    } finally {
      setProjectFreezing(null);
    }
  };

  const errClass = (field: keyof FieldErrors) =>
    errors[field] ? "border-red-500" : "border-white/10";

  const thresholds: { value: ApprovalThreshold; label: string }[] = [
    { value: "50", label: "50+1 — Mayoritas" },
    { value: "100", label: "100% — Sepakat Bulat" },
  ];

  return (
    <div className="space-y-8">
      {/* ── Header ── */}
      <div className="animate-fade-in-up mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-white">Pengaturan Tim</h1>
        <p className="mt-1 text-sm text-gray-500">Atur project, periode, dan pengaturan tim</p>
        <div className="mt-4 h-px bg-gradient-to-r from-gray-800 to-transparent" />
      </div>

      {/* ── Informasi Tim ── */}
      <section className="animate-fade-in-up">
        <SectionHeader label="Informasi Tim" />
        <form onSubmit={handleSave} className="space-y-5">
          {/* C5: Logo Tim */}
          <div className="flex items-center gap-4 pb-4 border-b border-white/5">
            <div className="relative">
              <div className="size-16 overflow-hidden rounded-full border border-gray-700 bg-gray-800">
                {logoPreview ? (
                  <img src={logoPreview} alt="Preview logo" className="size-full object-cover" />
                ) : team.logo_url ? (
                  <img src={team.logo_url} alt={team.name} className="size-full object-cover" />
                ) : (
                  <div className="flex size-full items-center justify-center text-gray-500">
                    <Camera className="size-6" />
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                disabled={logoLoading}
                className="absolute -bottom-1 -right-1 flex size-6 items-center justify-center rounded-full border border-gray-700 bg-gray-800 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
                aria-label="Ubah logo tim" title="Ubah logo tim"
              >
                <Camera className="size-3" />
              </button>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleLogoChange}
                className="hidden"
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white">Logo Tim</p>
              <p className="text-xs text-gray-500">JPG, PNG atau WebP. Maks 5 MB.</p>
              {logoFile && (
                <div className="mt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleLogoUpload}
                    disabled={logoLoading}
                    className="flex items-center gap-1 rounded bg-accent px-3 py-1 text-xs font-medium text-black transition-colors hover:bg-accent-hover disabled:opacity-50"
                  >
                    {logoLoading && <Loader2 className="size-3 animate-spin" />}
                    {logoLoading ? "Mengunggah..." : "Simpan Logo"}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setLogoFile(null); setLogoPreview(null); }}
                    className="text-xs text-gray-500 hover:text-white transition-colors"
                  >
                    Batal
                  </button>
                </div>
              )}
              {!logoFile && team.logo_url && (
                <button
                  type="button"
                  onClick={handleDeleteLogo}
                  disabled={logoDeleting}
                  className="mt-2 text-xs text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
                >
                  {logoDeleting ? "Menghapus..." : "Hapus logo"}
                </button>
              )}
            </div>
          </div>

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
              className={cn(inputBase, errClass("name"))}
            />
            {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
          </div>

          <div>
            <label htmlFor="settings-desc" className="mb-1.5 block text-sm font-medium text-gray-300">
              Deskripsi <span className="text-gray-500">(opsional)</span>
            </label>
            <textarea
              id="settings-desc"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={cn(inputBase, "resize-none", errClass("description"))}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-300">
              Threshold Persetujuan
            </label>
            <p className="mb-3 text-xs text-gray-500">
              Berapa banyak suara setuju yang dibutuhkan untuk menyetujui kontribusi.
            </p>
            <div className="space-y-2">
              {thresholds.map((t) => (
                <label
                  key={t.value}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 transition",
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

          <div>
            <label htmlFor="settings-commission" className="mb-1.5 block text-sm font-medium text-gray-300" title="Persentase markup yang menjadi komisi sales">
              Komisi Sales (%)
            </label>
            <input
              id="settings-commission"
              type="number"
              min="0"
              max="100"
              placeholder="50"
              value={commissionRate}
              onChange={(e) => setCommissionRate(e.target.value)}
              disabled={team.is_frozen}
              className={cn(inputBase, errClass("commission_rate"))}
            />
            {errors.commission_rate && <p className="mt-1 text-xs text-red-500">{errors.commission_rate}</p>}
          </div>

          <div className="!mt-6 flex items-center justify-end gap-3 border-t border-white/5 pt-5">
            {team.is_frozen && (
              <span className="flex items-center gap-1.5 text-xs text-gray-500">
                <Info className="size-3.5" />
                Tim sedang freeze — hanya nama &amp; deskripsi yang bisa diubah
              </span>
            )}
            <button
              type="submit"
              disabled={saving || team.is_frozen}
              title={team.is_frozen ? "Tim sedang freeze — tidak bisa menyimpan perubahan threshold" : undefined}
              className="flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-black transition-colors active:scale-[0.97] hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving && <Loader2 className="size-4 animate-spin" />}
              {saving ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
          </div>
        </form>
      </section>

      {/* ── Freeze Equity ── */}
      <section className="animate-fade-in-up" style={{ animationDelay: "80ms" }}>
        <SectionHeader label="Freeze Equity" />

        <div className="rounded-lg border border-red-500/20 bg-red-500/[0.03] p-5">
          <div className="flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-red-500/10">
              <Snowflake className="size-4 text-red-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-white">Freeze Seluruh Tim</h3>
              <p className="mt-1 text-xs text-gray-500 leading-relaxed">
                Ketika tim di-freeze, semua perubahan equity akan dihentikan. Aksi ini tidak bisa dibatalkan.
                Freeze masing-masing project dulu sebelum freeze tim.
              </p>

              {activeProjectsCount > 0 && (
                <div className="mt-3 flex items-start gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-300">
                  <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                  <span>
                    Masih ada <strong>{activeProjectsCount}</strong> project aktif. Freeze semua project
                    dulu supaya cap table tidak kehilangan slices project tersebut.
                  </span>
                </div>
              )}

              <div className="mt-4 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setFreezeConfirmOpen(true)}
                  disabled={freezing || team.is_frozen || activeProjectsCount > 0}
                  title={activeProjectsCount > 0 ? "Freeze semua project dulu sebelum freeze tim" : team.is_frozen ? "Tim sudah di-freeze" : undefined}
                  className="flex items-center gap-2 rounded-lg border border-red-500/30 px-4 py-2 text-sm text-red-400 transition-colors active:scale-[0.97] hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {freezing ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Snowflake className="size-4" />
                  )}
                  {team.is_frozen ? "Sudah di-Freeze" : "Freeze Equity"}
                </button>
                {team.is_frozen && (
                  <span className="flex items-center gap-1.5 text-xs text-green-400">
                    <CheckCircle className="size-3.5" />
                    Equity sudah di-freeze
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

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

      <ConfirmModal
        open={projectFreezeTargetId !== null}
        onClose={() => setProjectFreezeTargetId(null)}
        onConfirm={handleProjectFreeze}
        title="Freeze Project"
        description="Yakin ingin freeze project ini? Aksi ini tidak bisa dibatalkan."
        confirmText="Freeze"
        variant="danger"
        loading={projectFreezing !== null}
      />

      {/* ── Freeze Project ── */}
      {projects.length > 0 && (
        <section className="animate-fade-in-up" style={{ animationDelay: "160ms" }}>
          <SectionHeader label="Freeze Project" />
          <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/[0.03] p-5">
            <div className="flex items-start gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-yellow-500/10">
                <FolderKanban className="size-4 text-yellow-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-white">Project Aktif</h3>
                <p className="mt-1 text-xs text-gray-500 leading-relaxed">
                  Ketika project selesai, freeze Pie-nya. Equity project akan disimpan dan diagregasi ke tim induk.
                </p>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              {projects.map((p) => (
                <div
                  key={p.id}
                  className={cn(
                    "flex items-center justify-between rounded-lg border px-4 py-3 transition-colors",
                    p.is_frozen
                      ? "border-gray-700/50 bg-gray-900/30 opacity-60"
                      : "border-gray-700 bg-gray-900/50 hover:border-gray-600"
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white">{p.name}</p>
                    {p.description && <p className="text-xs text-gray-500 truncate">{p.description}</p>}
                    {p.is_frozen && (
                      <span className="mt-1 inline-flex items-center gap-1 text-xs text-green-400/70">
                        <CheckCircle className="size-3" />
                        Sudah di-freeze
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    disabled={p.is_frozen || projectFreezing !== null}
                    title={p.is_frozen ? "Project sudah di-freeze" : undefined}
                    onClick={() => setProjectFreezeTargetId(p.id)}
                    className="flex shrink-0 items-center gap-1.5 rounded-lg border border-yellow-500/30 px-3 py-1.5 text-xs text-yellow-400 transition-colors active:scale-[0.97] hover:bg-yellow-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {projectFreezing === p.id ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Snowflake className="size-3.5" />
                    )}
                    {p.is_frozen ? "Done" : "Freeze"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
