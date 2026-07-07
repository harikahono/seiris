import { useState, type FormEvent } from "react";
import { useOutletContext } from "react-router-dom";
import { isAxiosError } from "axios";
import api from "@/api/axios";
import { parseErrors } from "@/lib/parseErrors";
import type { ApprovalThreshold } from "@/types";
import type { TeamContext } from "@/pages/teams/TeamDetailPage";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Loader2, Snowflake } from "lucide-react";

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
  const [errors, setErrors] = useState<FieldErrors>({});

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
    if (!confirm("Yakin ingin freeze equity tim? Aksi ini tidak bisa dibatalkan.")) return;
    setFreezing(true);
    try {
      await api.post(`/teams/${team.id}/freeze`);
      toast.success("Equity tim berhasil di-freeze");
      fetchTeam();
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 409) {
        toast.error("Tim sudah di-freeze sebelumnya");
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
    { value: "50", label: "50% — Mayoritas Sederhana" },
    { value: "75", label: "75% — Mayoritas Super" },
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
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
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
        <button
          type="button"
          onClick={handleFreeze}
          disabled={freezing || team.is_frozen}
          className="flex items-center gap-2 rounded-lg border border-red-500/30 px-4 py-2 text-sm text-red-400 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {freezing ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Snowflake className="size-4" />
          )}
          {team.is_frozen ? "Sudah di-freeze" : "Freeze Equity"}
        </button>
      </div>
    </div>
  );
}
