import { useState, type FormEvent, useEffect } from "react";
import { createPortal } from "react-dom";
import api from "@/api/axios";
import { parseErrors } from "@/lib/parseErrors";
import { cn } from "@/lib/utils";
import { CONTRIBUTION_TYPES } from "@/lib/contribution";
import { formatRp } from "@/lib/constants";
import { toast } from "sonner";
import { X, Loader2, ArrowLeft, AlertTriangle, Upload } from "lucide-react";
import type { ContributionType } from "@/types";
import { useFocusTrap } from "@/hooks/useFocusTrap";

interface ContributionFormProps {
  teamId: string;
  projectId?: string | null;
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
  deal_value?: string;
  estimated_value?: string;
  commission_rate?: string;
  proof?: string;
  source_url?: string;
}

export default function ContributionForm({ teamId, projectId, fmr, open, onClose, onCreated }: ContributionFormProps) {
  const trapRef = useFocusTrap(open);
  const basePath = projectId
    ? `/teams/${teamId}/projects/${projectId}`
    : `/teams/${teamId}`;
  const [step, setStep] = useState<"select" | "form">("select");
  const [type, setType] = useState<ContributionType | null>(null);
  const [description, setDescription] = useState("");
  const [contributionDate, setContributionDate] = useState(new Date().toISOString().split("T")[0]);
  const [hours, setHours] = useState("");
  const [amount, setAmount] = useState("");
  const [dealValue, setDealValue] = useState("");
  const [estimatedValue, setEstimatedValue] = useState("");
  const [commissionRate, setCommissionRate] = useState("50");
  const [loading, setLoading] = useState(false);
  // optional proof & source URL
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [sourceUrl, setSourceUrl] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [featureEnabled, setFeatureEnabled] = useState(true);

  // Check feature flag
  useEffect(() => {
    api.get("/config")
      .then((res) => {
        setFeatureEnabled(!!res.data.features?.contribution_proof);
      })
      .catch(() => setFeatureEnabled(true));
  }, []);

  if (!open) return null;

  const requiresHours = type && ["TIME", "IDEA", "NETWORK"].includes(type);
  const requiresAmount = type && ["CASH", "FACILITY"].includes(type);
  const isSales = type === "SALES";

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

    // Client-side validation: GitHub link format
    if (sourceUrl.trim() && !/^https:\/\/github\.com\/.+\/.+\/(pull\/\d+|commit\/[a-f0-9]{40})$/i.test(sourceUrl.trim())) {
      setErrors({ source_url: "Link harus berupa PR GitHub (github.com/.../pull/123) atau commit (github.com/.../commit/abc123)" });
      toast.error("Link GitHub tidak valid");
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // always use FormData to support file upload & source_url
      const formData = new FormData();
      formData.append('type', type);
      formData.append('description', description.trim());
      formData.append('contribution_date', contributionDate);
      if (isSales) {
        formData.append('deal_value', String(Number(dealValue)));
        formData.append('estimated_value', String(Number(estimatedValue)));
        formData.append('commission_rate', String(Number(commissionRate)));
      } else {
        if (requiresHours) formData.append('hours', String(Number(hours)));
        if (requiresAmount) formData.append('amount', String(Number(amount)));
      }
      if (projectId) formData.append('project_id', projectId);
      if (featureEnabled) {
        if (proofFile) formData.append('proof', proofFile);
        if (sourceUrl) formData.append('source_url', sourceUrl.trim());
      }

      await api.post(`${basePath}/contributions`, formData);

      toast.success(`Kontribusi "${description.trim()}" (${type}) berhasil dicatat, menunggu vote`);
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
    setDealValue("");
    setEstimatedValue("");
    setCommissionRate("50");
    setProofFile(null);
    setSourceUrl("");
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

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={handleClose}>
      <div ref={trapRef} className="w-full max-w-lg rounded-xl border border-gray-800 bg-[#0d0d0d] p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {step === "select" && (
          <>
            {fmr === 0 && (
              <div className="mb-4 rounded-lg border border-yellow-700 bg-yellow-900/20 p-3 text-sm text-yellow-300">
                <p className="flex items-center gap-1 font-medium"><AlertTriangle className="size-3.5 text-yellow-500" /> FMR belum diset</p>
                <p className="mt-1 text-yellow-400/80">
                  Owner belum mengatur FMR kamu. Kamu hanya bisa membuat kontribusi{" "}
                   <strong>Cash, Facility, atau Sales</strong> sampai FMR diatur.
                  Minta owner untuk set FMR di halaman <strong>Anggota</strong>.
                </p>
              </div>
            )}
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Pilih Jenis Kontribusi</h2>
              <button type="button" onClick={handleClose} className="rounded-md p-1 text-gray-500 hover:bg-gray-800 hover:text-white" aria-label="Tutup">
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
              <button type="button" onClick={() => setStep("select")} className="rounded-md p-1 text-gray-500 hover:bg-gray-800 hover:text-white" aria-label="Kembali ke pilih jenis">
                <ArrowLeft className="size-4" />
              </button>
              <h2 className="text-lg font-semibold text-white">Buat Kontribusi {type}</h2>
              <button type="button" onClick={handleClose} className="ml-auto rounded-md p-1 text-gray-500 hover:bg-gray-800 hover:text-white" aria-label="Tutup">
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

              {featureEnabled && (<>
                {/* Proof file — style sinkron dengan CreateRevenueForm */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-300">Bukti (opsional)</label>
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-gray-700 px-3 py-3 text-sm text-gray-500 transition hover:border-accent hover:text-accent">
                    <Upload className="size-4" />
                    {proofFile ? `${proofFile.name} (${(proofFile.size / 1024 / 1024).toFixed(1)} MB)` : "Upload file PDF / JPG / PNG (max 5MB)"}
                    <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => { const f = e.target.files?.[0] ?? null; setProofFile(f); if (f && f.size > 5 * 1024 * 1024) toast.error("Ukuran file maksimal 5MB."); }} className="hidden" />
                  </label>
                  {errors.proof && <p className="mt-1 text-xs text-red-500">{errors.proof}</p>}
                </div>
                {/* Source URL */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-300">Link GitHub PR/Commit</label>
                  <input type="url" placeholder="https://github.com/.../pull/123" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} className={`w-full rounded-lg border bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 ${errors.source_url ? 'border-red-500' : 'border-gray-700 focus:border-accent'}`} />
                  {errors.source_url && <p className="mt-1 text-xs text-red-500">{errors.source_url}</p>}
                </div>
              </>)}

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

              {isSales && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-300">Estimasi Tim (Rp)</label>
                      <input
                        type="number"
                        min="0"
                        placeholder="Estimasi awal"
                        value={estimatedValue}
                        onChange={(e) => setEstimatedValue(e.target.value)}
                        required
                        className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                      />
                      {errors.estimated_value && <p className="mt-1 text-xs text-red-500">{errors.estimated_value}</p>}
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-300">Deal Client (Rp)</label>
                      <input
                        type="number"
                        min="0"
                        placeholder="Nilai deal"
                        value={dealValue}
                        onChange={(e) => setDealValue(e.target.value)}
                        required
                        className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                      />
                      {errors.deal_value && <p className="mt-1 text-xs text-red-500">{errors.deal_value}</p>}
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-300">
                      Komisi Rate: <span className="text-accent font-bold">{commissionRate}%</span>
                    </label>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-500 w-6 text-right">0%</span>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={commissionRate}
                        onChange={(e) => setCommissionRate(e.target.value)}
                        className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer
                          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#e07820] [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:cursor-pointer
                          [&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[#e07820] [&::-moz-range-thumb]:border-none [&::-moz-range-thumb]:cursor-pointer"
                        style={{
                          background: `linear-gradient(to right, #e07820 ${commissionRate}%, #374151 ${commissionRate}%)`,
                        }}
                        required
                      />
                      <span className="text-xs text-gray-500 w-6">100%</span>
                    </div>
                    {errors.commission_rate && <p className="mt-1 text-xs text-red-500">{errors.commission_rate}</p>}
                  </div>
                  {dealValue && estimatedValue && commissionRate && (
                    (() => {
                      const markup = Math.max(0, Number(dealValue) - Number(estimatedValue));
                      const commission = Math.round(markup * Number(commissionRate) / 100);
                      return (
                        <p className="-mt-2 text-xs text-gray-500">
                          Markup: <span className="text-white font-medium">{formatRp(markup)}</span>
                          {" · "}Komisi: <span className="text-white font-medium">{formatRp(commission)}</span>
                          {" → "}<span className="text-accent font-medium">{(commission * 2).toLocaleString("id-ID")} slices</span>
                          {" (×2)"}
                        </p>
                      );
                    })()
                  )}
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
  , document.body);
}
