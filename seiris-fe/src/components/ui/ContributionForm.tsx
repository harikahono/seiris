import { useState, type FormEvent } from "react";
import api from "@/api/axios";
import { parseErrors } from "@/lib/parseErrors";
import { cn } from "@/lib/utils";
import { CONTRIBUTION_TYPES } from "@/lib/contribution";
import { formatRp } from "@/lib/constants";
import { toast } from "sonner";
import { X, Loader2, ArrowLeft, Upload } from "lucide-react";
import type { ContributionType } from "@/types";

interface ContributionFormProps {
  teamId: string;
  fmr: number;
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

interface FieldErrors {
  type?: string;
  description?: string;
  contribution_date?: string;
  hours?: string;
  amount?: string;
  invoice_amount?: string;
  actual_amount?: string;
  invoice?: string;
}

export default function ContributionForm({ teamId, fmr, open, onClose, onCreated }: ContributionFormProps) {
  const [step, setStep] = useState<"select" | "form">("select");
  const [type, setType] = useState<ContributionType | null>(null);
  const [description, setDescription] = useState("");
  const [contributionDate, setContributionDate] = useState(new Date().toISOString().split("T")[0]);
  const [hours, setHours] = useState("");
  const [amount, setAmount] = useState("");
  const [invoiceAmount, setInvoiceAmount] = useState("");
  const [actualAmount, setActualAmount] = useState("");
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  if (!open) return null;

  const requiresHours = type && ["TIME", "IDEA", "NETWORK"].includes(type);
  const requiresAmount = type && ["CASH", "FACILITY"].includes(type);
  const isRevenue = type === "REVENUE";

  const canSubmitForm = type && description.trim().length >= 5 && contributionDate;

  const selectType = (t: ContributionType) => {
    if (t === "TIME" || t === "IDEA" || t === "NETWORK") {
      if (fmr === 0) {
        toast.error("FMR kamu belum diset. Minta owner untuk set FMR terlebih dahulu.");
        return;
      }
    }
    setType(t);
    setStep("form");
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!type) return;

    setLoading(true);
    try {
      if (isRevenue) {
        const formData = new FormData();
        formData.append("type", type);
        formData.append("description", description.trim());
        formData.append("contribution_date", contributionDate);
        formData.append("invoice_amount", String(Number(invoiceAmount)));
        formData.append("actual_amount", String(Number(actualAmount)));
        if (invoiceFile) formData.append("invoice", invoiceFile);
        await api.post(`/teams/${teamId}/contributions`, formData);
      } else {
        const payload: Record<string, unknown> = {
          type,
          description: description.trim(),
          contribution_date: contributionDate,
        };
        if (requiresHours) payload.hours = Number(hours);
        if (requiresAmount) payload.amount = Number(amount);
        await api.post(`/teams/${teamId}/contributions`, payload);
      }
      toast.success("Kontribusi berhasil dicatat");
      onCreated();
      handleClose();
    } catch (err) {
      const parsed = parseErrors(err);
      if (Object.keys(parsed).length > 0) {
        setErrors(parsed as FieldErrors);
        return;
      }
      toast.error("Gagal mencatat kontribusi");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep("select");
    setType(null);
    setDescription("");
    setContributionDate(new Date().toISOString().split("T")[0]);
    setHours("");
    setAmount("");
    setInvoiceAmount("");
    setActualAmount("");
    setInvoiceFile(null);
    setErrors({});
    onClose();
  };

  const inputClass = (field: keyof FieldErrors) =>
    cn(
      "w-full rounded-lg border bg-card px-3 py-2 text-sm text-white placeholder-gray-500 transition focus:outline-none focus:ring-1",
      errors[field]
        ? "border-red-500 focus:border-red-500 focus:ring-red-500"
        : "border-gray-700 focus:border-accent focus:ring-accent"
    );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-xl border border-gray-800 bg-[#0d0d0d] p-6 shadow-2xl">
        {step === "select" && (
          <>
            {fmr === 0 && (
              <div className="mb-4 rounded-lg border border-yellow-700 bg-yellow-900/20 p-3 text-sm text-yellow-300">
                <p className="font-medium">⚠️ FMR belum diset</p>
                <p className="mt-1 text-yellow-400/80">
                  Owner belum mengatur FMR kamu. Kamu hanya bisa membuat kontribusi{" "}
                  <strong>Cash, Facility, atau Revenue</strong> sampai FMR diatur.
                  Minta owner untuk set FMR di halaman <strong>Anggota</strong>.
                </p>
              </div>
            )}
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Pilih Jenis Kontribusi</h2>
              <button type="button" onClick={handleClose} className="rounded-md p-1 text-gray-500 hover:bg-gray-800 hover:text-white">
                <X className="size-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {CONTRIBUTION_TYPES.map((ct) => {
                const Icon = ct.icon;
                const disabled = (ct.value === "TIME" || ct.value === "IDEA" || ct.value === "NETWORK") && fmr === 0;
                return (
                  <button
                    key={ct.value}
                    type="button"
                    disabled={disabled}
                    onClick={() => selectType(ct.value)}
                    className={cn(
                      "flex flex-col items-center gap-2 rounded-lg border p-4 text-center transition",
                      disabled
                        ? "cursor-not-allowed border-gray-800 opacity-40"
                        : "border-gray-700 hover:border-accent hover:bg-accent/5"
                    )}
                  >
                    <Icon className="size-6" style={{ color: ct.color }} />
                    <span className="text-sm font-medium text-white">{ct.label}</span>
                    <span className="text-[10px] text-gray-500">{ct.desc}</span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {step === "form" && type && (
          <>
            <div className="mb-4 flex items-center gap-2">
              <button type="button" onClick={() => setStep("select")} className="rounded-md p-1 text-gray-500 hover:bg-gray-800 hover:text-white">
                <ArrowLeft className="size-4" />
              </button>
              <h2 className="text-lg font-semibold text-white">Buat Kontribusi {type}</h2>
              <button type="button" onClick={handleClose} className="ml-auto rounded-md p-1 text-gray-500 hover:bg-gray-800 hover:text-white">
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-300">Deskripsi</label>
                <textarea
                  rows={2}
                  placeholder="Deskripsi kontribusi (min 5 karakter)"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  className={inputClass("description")}
                />
                {errors.description && <p className="mt-1 text-xs text-red-500">{errors.description}</p>}
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-300">Tanggal Kontribusi</label>
                <input
                  type="date"
                  value={contributionDate}
                  onChange={(e) => setContributionDate(e.target.value)}
                  max={new Date().toISOString().split("T")[0]}
                  required
                  className={inputClass("contribution_date")}
                />
                {errors.contribution_date && <p className="mt-1 text-xs text-red-500">{errors.contribution_date}</p>}
              </div>

              {requiresHours && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-300">
                    Jumlah Jam <span className="text-gray-500">(min 0.5, maks 744)</span>
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    max="744"
                    placeholder="Contoh: 8"
                    value={hours}
                    onChange={(e) => setHours(e.target.value)}
                    required
                    className={inputClass("hours")}
                  />
                  {errors.hours && <p className="mt-1 text-xs text-red-500">{errors.hours}</p>}
                  {hours && !errors.hours && (
                    <p className="mt-1 text-xs text-gray-500">
                      ≈ {(Number(hours) * fmr).toLocaleString("id-ID")} value →{" "}
                      <span className="text-accent">{(Number(hours) * fmr * 2).toLocaleString("id-ID")} slices</span>
                    </p>
                  )}
                </div>
              )}

              {requiresAmount && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-300">
                    Nominal <span className="text-gray-500">(min Rp 1.000)</span>
                  </label>
                  <input
                    type="number"
                    min="1000"
                    placeholder="Contoh: 500000"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                    className={inputClass("amount")}
                  />
                  {errors.amount && <p className="mt-1 text-xs text-red-500">{errors.amount}</p>}
                  {amount && !errors.amount && (
                    <p className="mt-1 text-xs text-gray-500">
                      Nilai: Rp {Number(amount).toLocaleString("id-ID")} →{" "}
                      <span className="text-accent">
                        Rp {(Number(amount) * (type === "CASH" ? 4 : 2)).toLocaleString("id-ID")} slices
                      </span>
                    </p>
                  )}
                </div>
              )}

              {isRevenue && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="rev-invoice" className="mb-1 block text-sm font-medium text-gray-300">Biaya / Modal (Rp)</label>
                      <input
                        id="rev-invoice"
                        type="number"
                        min="0"
                        placeholder="Invoice amount"
                        value={invoiceAmount}
                        onChange={(e) => setInvoiceAmount(e.target.value)}
                        required
                        className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                      />
                      {errors.invoice_amount && <p className="mt-1 text-xs text-red-500">{errors.invoice_amount}</p>}
                    </div>
                    <div>
                      <label htmlFor="rev-actual" className="mb-1 block text-sm font-medium text-gray-300">Pendapatan (Rp)</label>
                      <input
                        id="rev-actual"
                        type="number"
                        min="0"
                        placeholder="Actual amount"
                        value={actualAmount}
                        onChange={(e) => setActualAmount(e.target.value)}
                        required
                        className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                      />
                      {errors.actual_amount && <p className="mt-1 text-xs text-red-500">{errors.actual_amount}</p>}
                    </div>
                  </div>
                  {invoiceAmount && actualAmount && (
                    <p className="-mt-2 text-xs text-gray-500">
                      Revenue bersih: <span className="text-white font-medium">{formatRp(Number(actualAmount) - Number(invoiceAmount))}</span>
                      {" · "}Slices: <span className="text-accent font-medium">Rp {((Number(actualAmount) - Number(invoiceAmount)) * 2).toLocaleString("id-ID")}</span>
                      {" (×2)"}
                    </p>
                  )}
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-300">Upload Invoice <span className="text-gray-500">(opsional)</span></label>
                    <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-gray-700 px-3 py-3 text-sm text-gray-500 transition hover:border-accent hover:text-accent">
                      <Upload className="size-4" />
                      {invoiceFile ? invoiceFile.name : "Upload file PDF / JPG / PNG"}
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => setInvoiceFile(e.target.files?.[0] ?? null)}
                        className="hidden"
                      />
                    </label>
                    {errors.invoice && <p className="mt-1 text-xs text-red-500">{errors.invoice}</p>}
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={loading || !canSubmitForm}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading && <Loader2 className="size-4 animate-spin" />}
                {loading ? "Menyimpan..." : "Buat Kontribusi"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
