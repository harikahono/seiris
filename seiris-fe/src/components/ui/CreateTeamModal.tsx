import { useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import api from "@/api/axios";
import { isAxiosError } from "axios";
import { parseErrors } from "@/lib/parseErrors";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { X, Loader2, LogIn } from "lucide-react";
import type { ApprovalThreshold, CreateTeamPayload } from "@/types";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { useModalAnimation } from "@/hooks/useModalAnimation";

type Tab = "create" | "join";

interface CreateTeamModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (teamId?: string) => void;
  defaultTab?: Tab;
}

interface CreateFieldErrors {
  name?: string;
  description?: string;
  approval_threshold?: string;
  commission_rate?: string;
  fmr?: string;
}

export default function CreateTeamModal({ open, onClose, onCreated, defaultTab = "create" }: CreateTeamModalProps) {
  const [tab, setTab] = useState<Tab>(defaultTab);

  // ── Form: Buat Tim ──
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [approvalThreshold, setApprovalThreshold] = useState<ApprovalThreshold>("50");
  const [fmr, setFmr] = useState("150000");
  const [commissionRate, setCommissionRate] = useState("50");
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [createErrors, setCreateErrors] = useState<CreateFieldErrors>({});

  // ── Form: Gabung Tim ──
  const [inviteCode, setInviteCode] = useState("");
  const [loadingJoin, setLoadingJoin] = useState(false);
  const [joinError, setJoinError] = useState("");

  const { show, animClass, animateClose } = useModalAnimation(open);
  const trapRef = useFocusTrap(show);
  if (!show) return null;

  // ── Create handler ──
  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (loadingCreate) return;
    setCreateErrors({});

    if (!name.trim()) {
      setCreateErrors({ name: "Nama tim harus diisi" });
      return;
    }

    setLoadingCreate(true);
    try {
      const payload: CreateTeamPayload = {
        name: name.trim(),
        description: description.trim() || undefined,
        approval_threshold: approvalThreshold,
        commission_rate: commissionRate ? Number(commissionRate) : undefined,
        fmr: fmr ? Number(fmr) : undefined,
      };
      const { data: res } = await api.post("/teams", payload);
      const teamId: string | undefined = res?.data?.id;
      toast.success("Tim berhasil dibuat");
      onCreated(teamId);
      handleClose();
    } catch (err) {
      const parsed = parseErrors(err);
      if (Object.keys(parsed).length > 0) {
        setCreateErrors(parsed as CreateFieldErrors);
        return;
      }
      toast.error("Gagal membuat tim");
    } finally {
      setLoadingCreate(false);
    }
  };

  // ── Join handler ──
  const handleJoin = async (e: FormEvent) => {
    e.preventDefault();
    setJoinError("");

    const code = inviteCode.trim();
    if (code.length !== 8) {
      setJoinError("Kode undangan harus 8 karakter");
      return;
    }

    setLoadingJoin(true);
    try {
      const { data: res } = await api.post("/teams/join", { invite_code: code.toUpperCase() });
      const teamId: string | undefined = res?.data?.team_id;
      toast.success("Berhasil bergabung ke tim");
      setInviteCode("");
      onCreated(teamId);
      handleClose();
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 422) {
        const data = err.response.data as { errors?: Record<string, string[]> };
        toast.error(data.errors?.invite_code?.[0] ?? "Kode undangan tidak valid");
      } else {
        toast.error("Gagal bergabung. Periksa kode undangan.");
      }
    } finally {
      setLoadingJoin(false);
    }
  };

  const handleClose = () => {
    setTab(defaultTab);
    setName("");
    setDescription("");
    setApprovalThreshold("50");
    setCommissionRate("50");
    setFmr("150000");
    setLoadingCreate(false);
    setCreateErrors({});
    setInviteCode("");
    setLoadingJoin(false);
    setJoinError("");
    animateClose(onClose);
  };

  const createInputClass = (field: keyof CreateFieldErrors) =>
    cn(
      "w-full rounded-lg border bg-card px-3 py-2 text-sm text-white placeholder-gray-500 transition focus:outline-none focus:ring-1",
      createErrors[field]
        ? "border-red-500 focus:border-red-500 focus:ring-red-500"
        : "border-gray-700 focus:border-accent focus:ring-accent"
    );

  const thresholds: { value: ApprovalThreshold; label: string }[] = [
    { value: "50", label: "50+1 (Mayoritas)" },
    { value: "100", label: "100% (Sepakat Bulat)" },
  ];

  const tabClass = (t: Tab) =>
    cn(
      "flex-1 rounded-lg py-2 text-sm font-medium transition-colors",
      tab === t
        ? "bg-accent text-black"
        : "text-gray-400 hover:text-white"
    );

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => animateClose(onClose)}>
      <div ref={trapRef} className={`${animClass} w-full max-w-md rounded-xl border border-gray-700 bg-card p-6 shadow-2xl`} onClick={(e) => e.stopPropagation()}>
        {/* ── Header + Tabs ── */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex flex-1 gap-2">
            <button type="button" onClick={() => setTab("create")} className={tabClass("create")}>
              Buat Tim
            </button>
            <button type="button" onClick={() => setTab("join")} className={tabClass("join")}>
              Gabung Tim
            </button>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="ml-2 rounded-md p-1 text-gray-500 hover:bg-gray-800 hover:text-white transition-colors active:scale-[0.97]"
            aria-label="Tutup" title="Tutup"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* ── Tab: Buat Tim ── */}
        {tab === "create" && (
          <form onSubmit={handleCreate} noValidate className="space-y-4">
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
                className={createInputClass("name")}
              />
              {createErrors.name && <p className="mt-1 text-xs text-red-500">{createErrors.name}</p>}
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
                className={createInputClass("description")}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-300">Threshold Persetujuan</label>
              <div className="space-y-2">
                {thresholds.map((t) => (
                  <label
                    key={t.value}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 transition-colors",
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
              <label htmlFor="team-commission" className="mb-1.5 block text-sm font-medium text-gray-300" title="Persentase komisi untuk kontribusi sales — ditetapkan owner">
                Komisi Sales (%) <span className="text-gray-500">(opsional)</span>
              </label>
              <input
                id="team-commission"
                type="number"
                min="0"
                max="100"
                placeholder="50"
                value={commissionRate}
                onChange={(e) => setCommissionRate(e.target.value)}
                className={createInputClass("commission_rate")}
              />
              {createErrors.commission_rate && <p className="mt-1 text-xs text-red-500">{createErrors.commission_rate}</p>}
            </div>

            <div>
              <label htmlFor="team-fmr" className="mb-1.5 block text-sm font-medium text-gray-300" title="Fair Market Rate — nilai pasar wajar per jam">
                FMR (Rp/jam) <span className="text-gray-500">(opsional)</span>
              </label>
              <input
                id="team-fmr"
                type="number"
                placeholder="150000"
                value={fmr}
                onChange={(e) => setFmr(e.target.value)}
                className={createInputClass("fmr")}
              />
              {createErrors.fmr && <p className="mt-1 text-xs text-red-500">{createErrors.fmr}</p>}
            </div>

            <button
              type="submit"
              disabled={loadingCreate}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.97]"
            >
              {loadingCreate && <Loader2 className="size-4 animate-spin" />}
              {loadingCreate ? "Menyimpan..." : "Buat Tim"}
            </button>
          </form>
        )}

        {/* ── Tab: Gabung Tim ── */}
        {tab === "join" && (
          <form onSubmit={handleJoin} noValidate className="space-y-4">
            <div className="flex items-center gap-2 rounded-lg border border-gray-800 bg-card p-4">
              <LogIn className="size-5 text-accent shrink-0" />
              <p className="text-sm text-gray-300">
                Masukkan kode undangan 8 karakter dari owner tim.
              </p>
            </div>

            <div>
              <label htmlFor="invite-code" className="mb-1.5 block text-sm font-medium text-gray-300">
                Kode Undangan
              </label>
              <input
                id="invite-code"
                type="text"
                placeholder="Contoh: ABC123DE"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                maxLength={8}
                required
                className={cn(
                  "w-full rounded-lg border bg-card px-3 py-2 text-sm text-white placeholder-gray-500 transition focus:outline-none focus:ring-1",
                  joinError
                    ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                    : "border-gray-700 focus:border-accent focus:ring-accent"
                )}
              />
              {joinError && <p className="mt-1 text-xs text-red-500">{joinError}</p>}
            </div>

            <button
              type="submit"
              disabled={loadingJoin || inviteCode.trim().length !== 8}
              title={inviteCode.trim().length !== 8 ? "Kode undangan harus 8 karakter" : undefined}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.97]"
            >
              {loadingJoin ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <LogIn className="size-4" />
              )}
              {loadingJoin ? "Memproses..." : "Gabung Tim"}
            </button>
          </form>
        )}
      </div>
    </div>
  , document.body);
}
