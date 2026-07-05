import { useState, type FormEvent } from "react";
import api from "@/api/axios";
import { parseErrors } from "@/lib/parseErrors";
import { toast } from "sonner";
import { Loader2, X, Upload } from "lucide-react";

interface CreateRevenueFormProps {
  teamId: string;
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

interface FieldErrors {
  description?: string;
  amount?: string;
  distributable_amount?: string;
  revenue_date?: string;
  proof?: string;
}

export default function CreateRevenueForm({ teamId, open, onClose, onCreated }: CreateRevenueFormProps) {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [distributableAmount, setDistributableAmount] = useState("");
  const [revenueDate, setRevenueDate] = useState(new Date().toISOString().split("T")[0]);
  const [proof, setProof] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  if (!open) return null;

  const resetForm = () => {
    setDescription("");
    setAmount("");
    setDistributableAmount("");
    setRevenueDate(new Date().toISOString().split("T")[0]);
    setProof(null);
    setErrors({});
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!description.trim() || description.trim().length < 5) {
      setErrors({ description: "Deskripsi minimal 5 karakter" });
      return;
    }
    const amountNum = Number(amount);
    if (!amount || amountNum < 1000) {
      setErrors({ amount: "Nominal minimal Rp 1.000" });
      return;
    }
    const distNum = Number(distributableAmount);
    if (isNaN(distNum) || distNum < 0) {
      setErrors({ distributable_amount: "Nominal distribusi tidak valid" });
      return;
    }
    if (distNum > amountNum) {
      setErrors({ distributable_amount: "Tidak boleh melebihi total revenue" });
      return;
    }
    if (!revenueDate) {
      setErrors({ revenue_date: "Tanggal wajib diisi" });
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("description", description.trim());
      formData.append("amount", String(amountNum));
      formData.append("distributable_amount", String(distNum));
      formData.append("revenue_date", revenueDate);
      if (proof) formData.append("proof", proof);

      await api.post(`/teams/${teamId}/revenues`, formData);
      toast.success("Revenue berhasil dicatat");
      resetForm();
      onCreated();
      onClose();
    } catch (err) {
      const parsed = parseErrors(err);
      if (Object.keys(parsed).length > 0) {
        setErrors(parsed as FieldErrors);
        return;
      }
      toast.error("Gagal mencatat revenue");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/60" onClick={handleClose} />
      <div className="relative w-full max-w-lg rounded-xl border border-gray-700 bg-gray-900 p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Catat Revenue Baru</h2>
          <button type="button" onClick={handleClose} className="rounded p-1 text-gray-500 hover:bg-gray-800 hover:text-white">
            <X className="size-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="rev-desc" className="mb-1 block text-sm font-medium text-gray-300">Deskripsi</label>
            <input
              id="rev-desc"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              placeholder="Misal: Penjualan produk A"
            />
            {errors.description && <p className="mt-1 text-xs text-red-500">{errors.description}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="rev-amount" className="mb-1 block text-sm font-medium text-gray-300">Total Revenue (Rp)</label>
              <input
                id="rev-amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                placeholder="1000000"
              />
              {errors.amount && <p className="mt-1 text-xs text-red-500">{errors.amount}</p>}
            </div>
            <div>
              <label htmlFor="rev-dist" className="mb-1 block text-sm font-medium text-gray-300">Distribusi (Rp)</label>
              <input
                id="rev-dist"
                type="number"
                value={distributableAmount}
                onChange={(e) => setDistributableAmount(e.target.value)}
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                placeholder="800000"
              />
              {errors.distributable_amount && <p className="mt-1 text-xs text-red-500">{errors.distributable_amount}</p>}
            </div>
          </div>

          <div>
            <label htmlFor="rev-date" className="mb-1 block text-sm font-medium text-gray-300">Tanggal Revenue</label>
            <input
              id="rev-date"
              type="date"
              value={revenueDate}
              onChange={(e) => setRevenueDate(e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
            {errors.revenue_date && <p className="mt-1 text-xs text-red-500">{errors.revenue_date}</p>}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-300">Bukti (opsional)</label>
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-gray-700 px-3 py-3 text-sm text-gray-500 transition hover:border-accent hover:text-accent">
              <Upload className="size-4" />
              {proof ? proof.name : "Upload file PDF / JPG / PNG (max 5MB)"}
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => setProof(e.target.files?.[0] ?? null)}
                className="hidden"
              />
            </label>
            {errors.proof && <p className="mt-1 text-xs text-red-500">{errors.proof}</p>}
          </div>

          <button
            type="submit"
            disabled={saving}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving && <Loader2 className="size-4 animate-spin" />}
            {saving ? "Menyimpan..." : "Catat Revenue"}
          </button>
        </form>
      </div>
    </div>
  );
}
