import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Loader2, Printer } from "lucide-react";
import api from "@/api/axios";
import { buildPie, fetchAllPages, PALETTE } from "@/pages/teams/reportUtils";
import type { Contribution, EquityData, Revenue, Team } from "@/types";

/* ── Format helpers ── */
const fmtRp = (n: number) => "Rp " + n.toLocaleString("id-ID");
const fmtNum = (n: number) => n.toLocaleString("id-ID");
const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });

const VALUE_TYPES = ["TIME", "IDEA", "NETWORK"] as const;

function fmtContributionValue(c: Contribution): string {
  if (VALUE_TYPES.includes(c.type as (typeof VALUE_TYPES)[number]) && c.hours != null) {
    return `${Number(c.hours)} jam`;
  }
  return fmtRp(c.value);
}

export default function ReportPage() {
  const { teamId } = useParams<{ teamId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const projectId = searchParams.get("project");
  const autoPrint = searchParams.get("print") === "1";

  const basePath = projectId ? `/teams/${teamId}/projects/${projectId}` : `/teams/${teamId}`;

  const [team, setTeam] = useState<Team | null>(null);
  const [equity, setEquity] = useState<EquityData | null>(null);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [revenues, setRevenues] = useState<Revenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");

    const teamParams = projectId ? { project_id: projectId } : {};
    Promise.all([
      api.get<{ data: Team }>(`/teams/${teamId}`, { params: teamParams }),
      api.get<{ data: EquityData }>(`${basePath}/equity`),
      fetchAllPages<Contribution>(`${basePath}/contributions`, { per_page: 50 }),
      fetchAllPages<Revenue>(`${basePath}/revenues`),
    ])
      .then(([teamRes, equityRes, contribs, revs]) => {
        if (cancelled) return;
        setTeam(teamRes.data.data);
        setEquity(equityRes.data.data);
        setContributions(contribs);
        setRevenues(revs);
      })
      .catch(() => {
        if (!cancelled) setError("Gagal memuat data laporan.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [teamId, basePath, projectId]);

  /* Filename PDF ikut document.title (browser pakai title sebagai nama file) */
  useEffect(() => {
    if (!team) return;
    const prev = document.title;
    document.title = `SEIRIS_${team.name.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`;
    return () => {
      document.title = prev;
    };
  }, [team]);

  /* Auto-print: buka dari tombol Export */
  useEffect(() => {
    if (!autoPrint || loading) return;
    const t = setTimeout(() => window.print(), 300);
    return () => clearTimeout(t);
  }, [autoPrint, loading]);

  useEffect(() => {
    if (!autoPrint) return;
    const back = () => navigate(-1);
    window.addEventListener("afterprint", back);
    return () => window.removeEventListener("afterprint", back);
  }, [autoPrint, navigate]);

  const members = useMemo(
    () => [...(equity?.equity_map ?? [])].sort((a, b) => b.equity_pct - a.equity_pct),
    [equity]
  );
  const approvedContribs = useMemo(
    () =>
      contributions
        .filter((c) => c.status === "APPROVED")
        .sort((a, b) => a.contribution_date.localeCompare(b.contribution_date)),
    [contributions]
  );
  const distributedRevenues = useMemo(
    () => revenues.filter((r) => r.is_distributed),
    [revenues]
  );

  const totalSlices = equity?.total_slices ?? 0;
  const totalRevenueDistributed = distributedRevenues.reduce((s, r) => s + r.amount, 0);
  const maxSlices = members.length ? Math.max(...members.map((m) => m.slices)) : 0;

  const fmrOf = (memberId: string): number | null => {
    const m = team?.members.find((x) => x.id === memberId);
    if (!m) return null;
    const fmr = projectId ? (m.project_fmr ?? m.fmr) : m.fmr;
    return fmr || null; // 0/null = belum diset → tampilkan "—", bukan "Rp 0"
  };
  const fmtFmr = (memberId: string): string => {
    const fmr = fmrOf(memberId);
    return fmr != null ? fmtRp(fmr) : "—";
  };

  const pieSlices = useMemo(
    () => buildPie(members, totalSlices, 100, 100, 92),
    [members, totalSlices]
  );

  const today = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const hasEquity = members.length > 0 && totalSlices > 0;

  return (
    <div className="min-h-screen bg-[#efede7] print:bg-white">
      <style>{`
        @media print {
          @page { size: A4; margin: 12mm 11mm; }
          body { background: #fff !important; }
          .no-print { display: none !important; }
          .report-sheet { box-shadow: none !important; margin: 0 !important; max-width: none !important; border-radius: 0 !important; padding: 0 !important; }
          section.report-block { break-inside: avoid; }
          tr { break-inside: avoid; }
          thead { display: table-header-group; }
        }
        .section-title {
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: #e07820;
          border-bottom: 1px solid #e8e5dd;
          padding-bottom: 5px;
        }
      `}</style>

      {/* ── Toolbar (screen only) ── */}
      <div className="no-print mx-auto flex max-w-[820px] items-center justify-between gap-3 px-4 pt-5 pb-2">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 rounded-lg border border-black/10 bg-white px-3 py-1.5 text-sm text-gray-700 shadow-sm transition hover:bg-gray-50"
        >
          <ArrowLeft className="size-4" />
          Kembali
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="flex items-center gap-1.5 rounded-lg bg-[#e07820] px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#c96a1b]"
        >
          <Printer className="size-4" />
          Simpan sebagai PDF
        </button>
      </div>

      {/* ── Laporan ── */}
      <div className="report-sheet mx-auto my-2 max-w-[820px] bg-white p-10 text-[#1a1916] shadow-xl print:my-0">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-24 text-gray-500">
            <Loader2 className="size-5 animate-spin" />
            Menyusun laporan…
          </div>
        ) : error || !team ? (
          <div className="py-24 text-center">
            <p className="text-lg font-semibold">{error || "Tim tidak ditemukan."}</p>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="no-print mt-4 rounded-lg border border-black/10 px-4 py-2 text-sm hover:bg-gray-50"
            >
              Kembali
            </button>
          </div>
        ) : (
          <>
            {/* ══ HEADER ══ */}
            <header className="flex items-start justify-between gap-6">
              <div>
                <div className="flex items-center gap-2">
                  <span className="flex size-7 items-center justify-center rounded-md bg-[#e07820] text-sm font-black text-white">
                    S
                  </span>
                  <span className="text-sm font-bold tracking-tight">SEIRIS</span>
                </div>
                <h1 className="mt-3 text-2xl font-bold tracking-tight text-[#17150f]">
                  Laporan Equity &amp; Distribusi
                </h1>
                <p className="mt-0.5 text-sm text-[#6f6b61]">{team.name}</p>
              </div>
              <div className="text-right text-xs leading-5 text-[#6f6b61]">
                <p>
                  Status:{" "}
                  <span
                    className={`font-semibold ${
                      equity?.is_frozen ? "text-[#b91c1c]" : "text-[#15803d]"
                    }`}
                  >
                    {equity?.is_frozen ? "FROZEN" : "AKTIF"}
                  </span>
                </p>
                <p>{today}</p>
                <p>
                  Total Slices: <span className="font-semibold text-[#17150f]">{fmtNum(totalSlices)}</span>
                </p>
                {projectId && <p className="font-semibold text-[#e07820]">Scope: Project</p>}
              </div>
            </header>
            <div className="mt-5 h-0.5 w-full rounded-full bg-[#e07820]" />

            {/* ══ STAT RINGKAS ══ */}
            <section className="mt-6 grid grid-cols-4 gap-3">
              {[
                { label: "Anggota", value: String(members.length) },
                { label: "Total Slices", value: fmtNum(totalSlices) },
                { label: "Kontribusi", value: String(approvedContribs.length) },
                { label: "Revenue", value: fmtNum(totalRevenueDistributed) },
              ].map((s) => (
                <div key={s.label} className="rounded-lg border border-[#e8e5dd] bg-[#faf9f6] px-3 py-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#6f6b61]">
                    {s.label}
                  </p>
                  <p className="mt-0.5 text-lg font-bold tabular-nums text-[#17150f]">{s.value}</p>
                </div>
              ))}
            </section>

            {/* ══ BAGIAN 1: CHART ══ */}
            <section className="report-block mt-8">
              <h2 className="section-title">1 · Distribusi Equity</h2>
              {!hasEquity ? (
                <p className="rounded-lg border border-dashed border-[#e8e5dd] p-6 text-center text-sm text-[#6f6b61]">
                  Belum ada data equity untuk diekspor. Catat dan setujui kontribusi terlebih dahulu.
                </p>
              ) : (
                <div className="mt-4 grid grid-cols-[auto_1fr] gap-8">
                  {/* Pie */}
                  <div className="flex flex-col items-center">
                    <svg viewBox="0 0 200 200" width="210" height="210" xmlns="http://www.w3.org/2000/svg">
                      {pieSlices.length === 1 ? (
                        <circle cx="100" cy="100" r="92" fill={pieSlices[0].color} />
                      ) : (
                        pieSlices.map((p, i) => (
                          <path
                            key={i}
                            d={`M 100 100 L ${p.x1.toFixed(2)} ${p.y1.toFixed(2)} A 92 92 0 ${p.largeArc} 1 ${p.x2.toFixed(2)} ${p.y2.toFixed(2)} Z`}
                            fill={p.color}
                            stroke="#fff"
                            strokeWidth="1.5"
                          />
                        ))
                      )}
                      {pieSlices.map((p, i) =>
                        p.label ? (
                          <text
                            key={i}
                            x={p.lx}
                            y={p.ly}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fontSize="10"
                            fontWeight="bold"
                            fill="#fff"
                          >
                            {(p.pct * 100).toFixed(1)}%
                          </text>
                        ) : null
                      )}
                    </svg>
                    {/* Legend */}
                    <div className="mt-2 w-full space-y-1">
                      {members.map((m, i) => (
                        <div key={m.member_id} className="flex items-center gap-2 text-xs">
                          <span
                            className="size-2.5 shrink-0 rounded-sm"
                            style={{ background: PALETTE[i % PALETTE.length] }}
                          />
                          <span className="flex-1 truncate text-[#6f6b61]">{m.name}</span>
                          <span className="font-semibold tabular-nums text-[#17150f]">
                            {m.equity_pct.toFixed(1)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Bar */}
                  <div>
                    <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-[#6f6b61]">
                      Slices per Anggota
                    </p>
                    <div className="space-y-3">
                      {members.map((m) => (
                        <div key={m.member_id} className="flex items-center gap-3">
                          <span className="w-28 truncate text-xs text-[#17150f]">{m.name}</span>
                          <div className="h-3 flex-1 overflow-hidden rounded-full bg-[#eeebe4]">
                            <div
                              className="h-full rounded-full bg-[#e07820]"
                              style={{ width: `${maxSlices > 0 ? (m.slices / maxSlices) * 100 : 0}%` }}
                            />
                          </div>
                          <span className="w-24 text-right text-xs font-semibold tabular-nums text-[#17150f]">
                            {fmtNum(m.slices)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </section>

            {/* ══ BAGIAN 2: RINGKASAN ANGGOTA ══ */}
            <section className="report-block mt-8">
              <h2 className="section-title">2 · Ringkasan Anggota</h2>
              <table className="mt-3 w-full border-collapse text-xs">
                <thead>
                  <tr className="border-b-2 border-[#17150f] text-left text-[10px] uppercase tracking-wider text-[#6f6b61]">
                    <th className="py-1.5 pr-2 font-semibold">Anggota</th>
                    <th className="py-1.5 pr-2 font-semibold">Role</th>
                    <th className="py-1.5 pr-2 text-right font-semibold">FMR</th>
                    <th className="py-1.5 pr-2 text-right font-semibold">Slices</th>
                    <th className="py-1.5 text-right font-semibold">Equity</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((m) => (
                    <tr key={m.member_id} className="border-b border-[#eeebe4]">
                      <td className="py-2 pr-2 font-medium text-[#17150f]">{m.name}</td>
                      <td className="py-2 pr-2 capitalize text-[#6f6b61]">
                        {m.role === "owner" ? "Owner" : "Member"}
                      </td>
                      <td className="py-2 pr-2 text-right tabular-nums text-[#6f6b61]">
                        {fmtFmr(m.member_id)}
                      </td>
                      <td className="py-2 pr-2 text-right font-medium tabular-nums text-[#17150f]">
                        {fmtNum(m.slices)}
                      </td>
                      <td className="py-2 text-right font-semibold tabular-nums text-[#17150f]">
                        {m.equity_pct.toFixed(2)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
                {members.length > 0 && (
                  <tfoot>
                    <tr className="border-t-2 border-[#17150f] font-bold text-[#17150f]">
                      <td colSpan={3} className="py-2 pr-2">
                        Total
                      </td>
                      <td className="py-2 pr-2 text-right tabular-nums">{fmtNum(totalSlices)}</td>
                      <td className="py-2 text-right tabular-nums">100%</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </section>

            {/* ══ BAGIAN 3: KONTRIBUSI ══ */}
            <section className="mt-8">
              <h2 className="section-title">3 · Kontribusi (Disetujui)</h2>
              {approvedContribs.length === 0 ? (
                <p className="mt-3 rounded-lg border border-dashed border-[#e8e5dd] p-5 text-center text-sm text-[#6f6b61]">
                  Belum ada kontribusi disetujui.
                </p>
              ) : (
                <table className="mt-3 w-full border-collapse text-xs">
                  <thead>
                    <tr className="border-b-2 border-[#17150f] text-left text-[10px] uppercase tracking-wider text-[#6f6b61]">
                      <th className="py-1.5 pr-2 font-semibold">Tanggal</th>
                      <th className="py-1.5 pr-2 font-semibold">Anggota</th>
                      <th className="py-1.5 pr-2 font-semibold">Tipe</th>
                      <th className="py-1.5 pr-2 font-semibold">Deskripsi</th>
                      <th className="py-1.5 pr-2 text-right font-semibold">Nilai</th>
                      <th className="py-1.5 pr-2 text-right font-semibold">Pengali</th>
                      <th className="py-1.5 text-right font-semibold">Slices</th>
                    </tr>
                  </thead>
                  <tbody>
                    {approvedContribs.map((c) => (
                      <tr key={c.id} className="border-b border-[#eeebe4] align-top">
                        <td className="py-2 pr-2 whitespace-nowrap tabular-nums text-[#6f6b61]">
                          {fmtDate(c.contribution_date)}
                        </td>
                        <td className="py-2 pr-2 font-medium text-[#17150f]">
                          {c.member.user.name}
                        </td>
                        <td className="py-2 pr-2 font-semibold text-[#e07820]">{c.type}</td>
                        <td className="py-2 pr-2 text-[#6f6b61]">{c.description}</td>
                        <td className="py-2 pr-2 text-right whitespace-nowrap tabular-nums text-[#17150f]">
                          {fmtContributionValue(c)}
                        </td>
                        <td className="py-2 pr-2 text-right tabular-nums text-[#6f6b61]">
                          ×{Number(c.multiplier)}
                        </td>
                        <td className="py-2 text-right font-semibold tabular-nums text-[#17150f]">
                          {fmtNum(c.total_slices)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-[#17150f] font-bold text-[#17150f]">
                      <td colSpan={6} className="py-2 pr-2">
                        Total Slices Kontribusi
                      </td>
                      <td className="py-2 text-right tabular-nums">
                        {fmtNum(approvedContribs.reduce((s, c) => s + c.total_slices, 0))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </section>

            {/* ══ BAGIAN 4: REVENUE ══ */}
            <section className="mt-8">
              <h2 className="section-title">4 · Revenue &amp; Distribusi</h2>
              {distributedRevenues.length === 0 ? (
                <p className="mt-3 rounded-lg border border-dashed border-[#e8e5dd] p-5 text-center text-sm text-[#6f6b61]">
                  Belum ada revenue terdistribusi.
                </p>
              ) : (
                <div className="mt-3 space-y-5">
                  {distributedRevenues.map((r) => (
                    <div key={r.id} className="report-block rounded-lg border border-[#e8e5dd] p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-semibold text-[#17150f]">{r.description}</p>
                          <p className="mt-0.5 text-xs text-[#6f6b61]">{fmtDate(r.revenue_date)}</p>
                        </div>
                        <div className="text-right text-xs">
                          <p className="text-[#6f6b61]">
                            Total:{" "}
                            <span className="font-semibold tabular-nums text-[#17150f]">
                              {fmtRp(r.amount)}
                            </span>
                          </p>
                          <p className="text-[#6f6b61]">
                            Terdistribusi:{" "}
                            <span className="font-semibold tabular-nums text-[#15803d]">
                              {fmtRp(r.distributable_amount)}
                            </span>
                          </p>
                        </div>
                      </div>
                      <table className="mt-3 w-full border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-[#e8e5dd] text-left text-[10px] uppercase tracking-wider text-[#6f6b61]">
                            <th className="py-1 pr-2 font-semibold">Anggota</th>
                            <th className="py-1 pr-2 text-right font-semibold">Equity</th>
                            <th className="py-1 text-right font-semibold">Diterima</th>
                          </tr>
                        </thead>
                        <tbody>
                          {r.distributions.map((d, i) => (
                            <tr key={i} className="border-b border-[#f4f2ec]">
                              <td className="py-1.5 pr-2 font-medium text-[#17150f]">
                                {d.member.user.name}
                              </td>
                              <td className="py-1.5 pr-2 text-right tabular-nums text-[#6f6b61]">
                                {d.equity_pct.toFixed(1)}%
                              </td>
                              <td className="py-1.5 text-right font-semibold tabular-nums text-[#17150f]">
                                {fmtRp(d.amount)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* ══ FOOTER ══ */}
            <footer className="mt-10 border-t border-[#e8e5dd] pt-3 text-[10px] text-[#9a978e]">
              Dihasilkan oleh SEIRIS · {team.name} · {today}
              {projectId ? " · Scope Project" : " · Scope Tim"}
            </footer>
          </>
        )}
      </div>
    </div>
  );
}