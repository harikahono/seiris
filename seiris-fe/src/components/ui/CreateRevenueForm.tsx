import { useState, type FormEvent, useEffect } from "react";
import { createPortal } from "react-dom";
import { isAxiosError } from "axios";
import api from "@/api/axios";
import { parseErrors } from "@/lib/parseErrors";
import { formatRp } from "@/lib/constants";
import { toast } from "sonner";
import { Loader2, X, Upload, Plus, Trash2 } from "lucide-react";
import type { RevenueDeduction } from "@/types";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { useModalAnimation } from "@/hooks/useModalAnimation";

interface CreateRevenueFormProps {
  teamId: string;
  projectId?: string | null;
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

type FieldKey = "description" | "amount" | "distributable_amount" | "revenue_date" | "proof";
interface FieldErrors extends Partial<Record<FieldKey, string>> {
  deductions?: string;
}

export default function CreateRevenueForm({ teamId, projectId, open, onClose, onCreated }: CreateRevenueFormProps) {
  const basePath = projectId
    ? `/teams/${teamId}/projects/${projectId}`
    : `/teams/${teamId}`;

  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [deductions, setDeductions] = useState<RevenueDeduction[]>([]);
  const [revenueDate, setRevenueDate] = useState(new Date().toISOString().split("T")[0]);
  const [proof, setProof] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  const { show, animClass, animateClose } = useModalAnimation(open);
  const trapRef = useFocusTrap(show);

  // Escape nutup form (kecuali saving)
  useEffect(() => {
    if (!show || saving) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [show, saving]);

  if (!show) return null;

  const totalDeductions = deductions.reduce((s, d) => s + (Number(d.amount) || 0), 0);
  const amountNum = Number(amount) || 0;
  const distributable = Math.max(0, amountNum - totalDeductions);

  const addDeduction = () => setDeductions([...deductions, { for: "", amount: 0 }]);

  const removeDeduction = (i: number) => setDeductions(deductions.filter((_, idx) => idx !== i));

  const updateDeduction = (i: number, field: "for" | "amount", value: string) => {
    const next = [...deductions];
    next[i] = { ...next[i], [field]: field === "amount" ? Number(value) || 0 : value };
    setDeductions(next);
  };

  const resetForm = () => {
    setDescription("");
    setAmount("");
    setDeductions([]);
    setRevenueDate(new Date().toISOString().split("T")[0]);
    setProof(null);
    setErrors({});
  };

  const handleClose = (extra?: () => void) => {
    animateClose(() => {
      resetForm();
      extra?.();
      onClose();
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setErrors({});

    if (!description.trim() || description.trim().length < 5)
      return setErrors({ description: "Deskripsi minimal 5 karakter" });
    if (!amount || amountNum < 1000)
      return setErrors({ amount: "Nominal minimal Rp 1.000" });
    for (const [i, d] of deductions.entries()) {
      if (!d.for.trim()) return setErrors({ deductions: `Potongan #${i + 1}: isi keterangan` });
      if (d.amount < 1) return setErrors({ deductions: `Potongan #${i + 1}: nominal minimal Rp 1` });
    }
    if (!revenueDate) return setErrors({ revenue_date: "Tanggal wajib diisi" });

    if (proof && proof.size > 5 * 1024 * 1024) {
      return setErrors({ proof: "Ukuran file maksimal 5MB." });
    }

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("description", description.trim());
      formData.append("amount", String(amountNum));
      formData.append("distributable_amount", String(distributable));
      formData.append("revenue_date", revenueDate);
      // ponytail: kirim nested fields biar Laravel parse jadi array; skip kalau kosong
      // (JSON.stringify → string, gagal validasi 'array' di backend)
      if (deductions.length > 0) {
        deductions.forEach((d, i) => {
          formData.append(`deductions[${i}][for]`, d.for);
          formData.append(`deductions[${i}][amount]`, String(d.amount));
        });
      }
      if (proof) formData.append("proof", proof);

      await api.post(`${basePath}/revenues`, formData);
      toast.success("Revenue berhasil dicatat");
      handleClose(onCreated);
    } catch (err) {
      const parsed = parseErrors(err);
      if (Object.keys(parsed).length > 0) {
        setErrors(parsed as FieldErrors);
        return;
      }
      if (isAxiosError(err) && err.response) {
        const status = err.response.status;
        const serverMsg = err.response.data?.message as string | undefined;
        toast.error(serverMsg ?? (status === 403 ? "Tim/project sudah di-freeze, tidak bisa mencatat revenue" : "Gagal mencatat revenue"));
      } else {
        toast.error("Gagal mencatat revenue — periksa koneksi");
      }
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="fixed inset-0" onClick={() => { if (saving) return; handleClose(); }} />
      <div ref={trapRef} className={`${animClass} relative w-full max-w-lg rounded-xl border border-gray-700 bg-card p-6 shadow-2xl max-h-[90vh] overflow-y-auto`} onClick={(e) => e.stopPropagation()}>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Catat Revenue Baru</h2>
          <button type="button" onClick={() => handleClose()} className="rounded p-1 text-gray-500 hover:bg-gray-800 hover:text-white transition-colors active:scale-[0.97]" aria-label="Tutup" title="Tutup">
            <X className="size-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="rev-desc" className="mb-1 block text-sm font-medium text-gray-300">Deskripsi</label>
            <input id="rev-desc" type="text" value={description} onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              placeholder="Misal: Penjualan produk A" />
            {errors.description && <p className="mt-1 text-xs text-red-500">{errors.description}</p>}
          </div>

          <div>
            <label htmlFor="rev-amount" className="mb-1 block text-sm font-medium text-gray-300">Total Revenue (Rp)</label>
            <input id="rev-amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              placeholder="1000000" />
            {errors.amount && <p className="mt-1 text-xs text-red-500">{errors.amount}</p>}
          </div>

          {/* ── Deductions ── */}
          <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-3">
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-medium text-gray-300">Potongan (opsional)</label>
              <button type="button" onClick={addDeduction}
                className="flex items-center gap-1 text-xs text-accent hover:underline">
                <Plus className="size-3" /> Tambah
              </button>
            </div>
            <div className="space-y-2">
              {deductions.map((d, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input type="text" value={d.for} onChange={(e) => updateDeduction(i, "for", e.target.value)}
                    placeholder="Keperluan"
                    className="flex-1 rounded-lg border border-gray-700 bg-gray-800 px-2.5 py-1.5 text-xs text-white placeholder-gray-500 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent" />
                  <input type="number" value={d.amount ?? ""} onChange={(e) => updateDeduction(i, "amount", e.target.value)}
                    placeholder="0" min="0"
                    className="w-28 rounded-lg border border-gray-700 bg-gray-800 px-2.5 py-1.5 text-xs text-white placeholder-gray-500 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent text-right" />
                  <button type="button" onClick={() => removeDeduction(i)}
                    className="rounded p-1 text-gray-500 hover:text-red-400 hover:bg-red-900/20 transition-colors" aria-label="Hapus potongan" title="Hapus potongan">
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              ))}
              {deductions.length === 0 && (
                <p className="text-xs text-gray-600">Belum ada potongan. Semua revenue akan dibagikan ke anggota.</p>
              )}
            </div>
            {errors.deductions && <p className="mt-1 text-xs text-red-500">{errors.deductions}</p>}
          </div>

          {/* ── Summary ── */}
          {amountNum > 0 && (
            <div className="rounded-lg border border-gray-700 bg-gray-900/70 p-3 text-sm">
              <div className="flex justify-between text-gray-400">
                <span>Total Revenue</span>
                <span className="font-mono text-white">{formatRp(amountNum)}</span>
              </div>
              {totalDeductions > 0 && (
                <div className="flex justify-between text-gray-400 mt-1">
                  <span>Total Potongan</span>
                  <span className="font-mono text-red-400">-{formatRp(totalDeductions)}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-200 mt-1.5 pt-1.5 border-t border-gray-700">
                <span className="font-medium">Siap Dibagi</span>
                <span className="font-mono text-accent font-bold">{formatRp(distributable)}</span>
              </div>
            </div>
          )}

          <div>
            <label htmlFor="rev-date" className="mb-1 block text-sm font-medium text-gray-300">Tanggal Revenue</label>
            <input id="rev-date" type="date" value={revenueDate} onChange={(e) => setRevenueDate(e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent" />
            {errors.revenue_date && <p className="mt-1 text-xs text-red-500">{errors.revenue_date}</p>}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-300">Bukti (opsional)</label>
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-gray-700 px-3 py-3 text-sm text-gray-500 transition-colors hover:border-accent hover:text-accent">
              <Upload className="size-4" />
              {proof ? `${proof.name} (${(proof.size / 1024 / 1024).toFixed(1)} MB)` : "Upload file PDF / JPG / PNG (max 5MB)"}
              <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => { const f = e.target.files?.[0] ?? null; setProof(f); if (f && f.size > 5 * 1024 * 1024) setErrors((p) => ({ ...p, proof: "Ukuran file maksimal 5MB." })); else setErrors((p) => ({ ...p, proof: undefined })); }} className="hidden" />
            </label>
            {errors.proof && <p className="mt-1 text-xs text-red-500">{errors.proof}</p>}
          </div>

          <button type="submit" disabled={saving}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.97]">
            {saving && <Loader2 className="size-4 animate-spin" />}
            {saving ? "Menyimpan..." : "Catat Revenue"}
          </button>
        </form>
      </div>
    </div>,
    document.body
  );
}
