import { useState, type FormEvent } from "react";
import { isAxiosError } from "axios";
import api from "@/api/axios";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { X, Loader2 } from "lucide-react";
import type { ApprovalThreshold, CreateTeamPayload } from "@/types";

interface CreateTeamModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

interface FieldErrors {
  name?: string;
  description?: string;
  approval_threshold?: string;
  fmr?: string;
}

export default function CreateTeamModal({ open, onClose, onCreated }: CreateTeamModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [approvalThreshold, setApprovalThreshold] = useState<ApprovalThreshold>("50");
  const [fmr, setFmr] = useState("150000");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  if (!open) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!name.trim()) {
      setErrors({ name: "Nama tim harus diisi" });
      return;
    }

    setLoading(true);
    try {
      const payload: CreateTeamPayload = {
        name: name.trim(),
        description: description.trim() || undefined,
        approval_threshold: approvalThreshold,
        fmr: fmr ? Number(fmr) : undefined,
      };
      await api.post("/teams", payload);
      toast.success("Tim berhasil dibuat");
      onCreated();
      onClose();
      setName("");
      setDescription("");
      setApprovalThreshold("50");
      setFmr("150000");
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 422) {
        const data = err.response.data as { errors?: Record<string, string[]> };
        if (data.errors) {
          const errs: FieldErrors = {};
          for (const [field, messages] of Object.entries(data.errors)) {
            (errs as Record<string, string>)[field] = messages[0];
          }
          setErrors(errs);
          return;
        }
      }
      toast.error("Gagal membuat tim");
    } finally {
      setLoading(false);
    }
  };

  const inputClass = (field: keyof FieldErrors) =>
    cn(
      "w-full rounded-lg border bg-gray-900 px-3 py-2 text-sm text-white placeholder-gray-500 transition focus:outline-none focus:ring-1",
      errors[field]
        ? "border-red-500 focus:border-red-500 focus:ring-red-500"
        : "border-gray-700 focus:border-accent focus:ring-accent"
    );

  const thresholds: { value: ApprovalThreshold; label: string }[] = [
    { value: "50", label: "50% (Mayoritas Sederhana)" },
    { value: "75", label: "75% (Mayoritas Super)" },
    { value: "100", label: "100% (Sepakat Bulat)" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-gray-800 bg-[#0d0d0d] p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Buat Tim Baru</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-gray-500 hover:bg-gray-800 hover:text-white"
          >
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div>
            <label htmlFor="team-name" className="mb-1.5 block text-sm font-medium text-gray-300">
              Nama Tim
            </label>
            <input
              id="team-name"
              type="text"
              placeholder="Nama tim kamu"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className={inputClass("name")}
            />
            {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
          </div>

          <div>
            <label htmlFor="team-desc" className="mb-1.5 block text-sm font-medium text-gray-300">
              Deskripsi <span className="text-gray-500">(opsional)</span>
            </label>
            <textarea
              id="team-desc"
              rows={2}
              placeholder="Deskripsi singkat tentang tim"
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
                    name="threshold"
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
            <label htmlFor="team-fmr" className="mb-1.5 block text-sm font-medium text-gray-300">
              FMR (Rp/jam) <span className="text-gray-500">(opsional)</span>
            </label>
            <input
              id="team-fmr"
              type="number"
              placeholder="150000"
              value={fmr}
              onChange={(e) => setFmr(e.target.value)}
              className={inputClass("fmr")}
            />
            {errors.fmr && <p className="mt-1 text-xs text-red-500">{errors.fmr}</p>}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading && <Loader2 className="size-4 animate-spin" />}
            {loading ? "Menyimpan..." : "Buat Tim"}
          </button>
        </form>
      </div>
    </div>
  );
}
