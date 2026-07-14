import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "@/api/axios";
import { useProjectContext } from "@/contexts/ProjectContext";
import { useRealtime } from "@/contexts/RealtimeContext";
import type { Revenue } from "@/types";
import ProofPreviewModal from "@/components/ui/ProofPreviewModal";
import { ArrowLeft, FileText } from "lucide-react";

const STATUS_META: Record<Revenue["status"], { label: string; cls: string }> = {
  pending: { label: "Pending", cls: "bg-zinc-700 text-zinc-200" },
  distribute_requested: { label: "Menunggu Persetujuan", cls: "bg-amber-500/20 text-amber-300" },
  distributed: { label: "Distribusi", cls: "bg-emerald-500/20 text-emerald-300" },
};

export default function RevenueDetailPage() {
  const { teamId = "", revenueId = "" } = useParams<{ teamId: string; revenueId: string }>();
  const navigate = useNavigate();
  const { projects } = useProjectContext();
  const { refreshVersion } = useRealtime();

  const [revenue, setRevenue] = useState<Revenue | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [showProof, setShowProof] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setNotFound(false);
    api
      .get<{ data: Revenue }>(`/teams/${teamId}/revenues/${revenueId}`)
      .then((res) => {
        if (active) setRevenue(res.data.data);
      })
      .catch(() => {
        if (active) setNotFound(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [teamId, revenueId, refreshVersion]);

  const projectName = revenue?.project_id
    ? projects.find((p) => p.id === revenue.project_id)?.name ?? null
    : null;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1 rounded-md bg-zinc-800 px-2.5 py-1.5 text-sm text-zinc-200 hover:bg-zinc-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali
          </button>
          <h1 className="text-lg font-semibold">
            {loading ? "Memuat revenue…" : notFound ? "Revenue tidak ditemukan" : revenue?.description || "Detail Revenue"}
          </h1>
        </div>
        {revenue && (
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_META[revenue.status].cls}`}>
            {STATUS_META[revenue.status].label}
          </span>
        )}
      </header>

      <main className="mx-auto max-w-2xl px-6 py-6">
        {loading && <Skeleton />}

        {!loading && notFound && (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-8 text-center text-zinc-400">
            <p>Revenue ini tidak ditemukan atau bukan milik tim ini.</p>
            <Link to={`/teams/${teamId}/revenue`} className="mt-3 inline-block text-indigo-400 hover:underline">
              Lihat semua revenue
            </Link>
          </div>
        )}

        {!loading && revenue && (
          <div className="space-y-6">
            <section className="grid grid-cols-2 gap-3">
              <Stat label="Pendapatan" value={fmtMoney(revenue.amount)} />
              <Stat label="Distribusi" value={fmtMoney(revenue.distributable_amount)} />
              <Stat label="Scope" value={projectName ?? "Tim (Induk)"} />
              <Stat label="Tanggal" value={revenue.revenue_date} />
              <Stat label="Pencatat" value={revenue.recorded_by?.user?.name ?? "-"} />
              <Stat
                label="Distribusikan ke"
                value={revenue.distributions.length ? `${revenue.distributions.length} anggota` : "Belum ada"}
              />
            </section>

            {revenue.deductions.length > 0 && (
              <section className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
                <h3 className="mb-2 text-sm font-medium text-zinc-400">Potongan</h3>
                <ul className="space-y-1 text-sm">
                  {revenue.deductions.map((d, i) => (
                    <li key={i} className="flex justify-between">
                      <span className="text-zinc-300">{d.for}</span>
                      <span className="text-zinc-100">{fmtMoney(d.amount)}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900 p-4">
              <div>
                <h3 className="text-sm font-medium text-zinc-200">Bukti Transaksi</h3>
                <p className="text-xs text-zinc-500">{revenue.proof_url ? "Lampiran tersedia" : "Tidak ada bukti"}</p>
              </div>
              {revenue.proof_url && (
                <button
                  onClick={() => setShowProof(true)}
                  className="inline-flex items-center gap-1.5 rounded-md bg-zinc-800 px-3 py-1.5 text-sm text-zinc-200 hover:bg-zinc-700"
                >
                  <FileText className="h-4 w-4" />
                  Lihat Bukti
                </button>
              )}
            </section>

            {revenue.distributions.length > 0 && (
              <section className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
                <h3 className="mb-2 text-sm font-medium text-zinc-400">Daftar Distribusi</h3>
                <ul className="divide-y divide-zinc-800">
                  {revenue.distributions.map((d) => (
                    <li key={d.member.id} className="flex items-center justify-between py-2 text-sm">
                      <span className="text-zinc-200">{d.member.user?.name ?? "Anggota"}</span>
                      <span className="text-zinc-400">{d.equity_pct}%</span>
                      <span className="font-medium text-zinc-100">{fmtMoney(d.amount)}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </main>

      {revenue?.proof_url && (
        <ProofPreviewModal
          open={showProof}
          onClose={() => setShowProof(false)}
          url={revenue.proof_url}
        />
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="mt-1 truncate text-sm font-medium text-zinc-100" title={value}>
        {value}
      </p>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="h-16 rounded-lg bg-zinc-900" />
      <div className="h-24 rounded-lg bg-zinc-900" />
      <div className="h-24 rounded-lg bg-zinc-900" />
    </div>
  );
}

function fmtMoney(amount: string | number): string {
  const n = typeof amount === "string" ? Number(amount) : amount;
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(n) ? n : 0);
}
