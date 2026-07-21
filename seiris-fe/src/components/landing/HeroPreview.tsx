// src/components/landing/HeroPreview.tsx
// Mini dashboard preview — mimics real SEIRIS dashboard UI with static demo data

const MOCK_MEMBERS = [
  { name: "Haris", pct: 45.2, slices: 6_890, color: "#e07820" },
  { name: "Rina", pct: 28.7, slices: 4_380, color: "#3b82f6" },
  { name: "Dimas", pct: 16.1, slices: 2_450, color: "#10b981" },
  { name: "Sari", pct: 10.0, slices: 1_520, color: "#8b5cf6" },
];

const MOCK_CONTRIBS = [
  { type: "CASH", desc: "Server infra Q3", slices: 120, status: "approved" },
  { type: "TIME", desc: "Sprint auth system", slices: 80, status: "approved" },
  { type: "IDEA", desc: "Revenue model pivot", slices: 45, status: "pending" },
  { type: "SALES", desc: "Kemitraan B2B", slices: 30, status: "approved" },
];

const TYPE_COLORS: Record<string, string> = {
  CASH: "bg-emerald-500",
  TIME: "bg-blue-500",
  IDEA: "bg-purple-500",
  SALES: "bg-amber-500",
};

const STATUS_DOT: Record<string, string> = {
  approved: "bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.4)]",
  pending: "bg-yellow-500 shadow-[0_0_6px_rgba(234,179,8,0.3)]",
};

const PIE_GRADIENT = MOCK_MEMBERS.map(
  (m, i) => {
    const start = MOCK_MEMBERS
      .slice(0, i)
      .reduce((s, x) => s + x.pct, 0);
    const end = start + m.pct;
    return `${m.color} ${start}% ${end}%`;
  }
).join(", ");

export default function HeroPreview() {
  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-xl bg-[#0f0f0f]">
      {/* ── Window Chrome ── */}
      <div className="flex h-8 items-center justify-between border-b border-white/[0.06] bg-white/[0.03] px-4">
        <div className="flex items-center gap-1.5">
          <div className="size-2.5 rounded-full bg-red-500/70" />
          <div className="size-2.5 rounded-full bg-yellow-500/70" />
          <div className="size-2.5 rounded-full bg-green-500/70" />
        </div>
        <span className="text-[10px] font-medium tracking-wider text-white/20">
          SEIRIS
        </span>
      </div>

      {/* ── Content ── */}
      <div className="flex flex-1 flex-col gap-3 p-4 lg:flex-row">
        {/* Left — Equity Overview */}
        <div className="flex flex-1 flex-col gap-3">
          {/* Equity Hero Card */}
          <div className="relative overflow-hidden rounded-lg border border-white/[0.06] bg-gradient-to-br from-[#151515] via-[#151515] to-accent/5 p-4">
            <div className="pointer-events-none absolute -right-12 -top-12 size-40 rounded-full bg-accent/5 blur-3xl" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/30">
              Equity Saya
            </span>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-3xl font-bold tracking-tight text-accent">
                45.2%
              </span>
              <span className="text-[11px] text-white/30">dari total</span>
            </div>
            <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-white/5">
              <div
                className="h-full rounded-full bg-accent"
                style={{ width: "45.2%" }}
              />
            </div>
          </div>

          {/* Member Distribution */}
          <div className="flex-1 rounded-lg border border-white/[0.06] bg-[#151515] p-4">
            <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/30">
              Anggota
            </span>
            <div className="mt-3 space-y-2">
              {MOCK_MEMBERS.map((m) => (
                <div key={m.name} className="flex items-center gap-2.5">
                  <span
                    className="flex size-5 shrink-0 items-center justify-center rounded-full text-[8px] font-bold text-black"
                    style={{ backgroundColor: m.color }}
                  >
                    {m.name.charAt(0)}
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-white/70">{m.name}</span>
                      <span className="font-mono text-[11px] text-white/30">
                        {m.pct}%
                      </span>
                    </div>
                    <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-white/5">
                      <div
                        className="h-full rounded-full transition-[width] duration-300 var(--ease-out)"
                        style={{
                          width: `${m.pct}%`,
                          backgroundColor: m.color,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right — Contribution Feed */}
        <div className="flex w-full flex-col gap-3 lg:w-56">
          {/* Pie Chart — conic-gradient */}
          <div className="flex items-center justify-center rounded-lg border border-white/[0.06] bg-[#151515] p-4">
            <div
              className="size-28 rounded-full"
              style={{
                background: `conic-gradient(${PIE_GRADIENT})`,
              }}
            >
              <div className="flex size-full items-center justify-center">
                <div className="flex size-20 items-center justify-center rounded-full bg-[#0f0f0f]">
                  <span className="text-center">
                    <span className="block text-lg font-bold text-white">
                      15.2k
                    </span>
                    <span className="block text-[9px] text-white/30">
                      slices
                    </span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Contributions */}
          <div className="flex-1 rounded-lg border border-white/[0.06] bg-[#151515] p-4">
            <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/30">
              Kontribusi
            </span>
            <div className="mt-2 space-y-0">
              {MOCK_CONTRIBS.map((c, i) => (
                <div
                  key={i}
                  className="relative flex items-start gap-2.5 py-2"
                >
                  {i < MOCK_CONTRIBS.length - 1 && (
                    <div className="absolute left-[5px] top-4 h-full w-px bg-white/5" />
                  )}
                  <div
                    className={`mt-1 size-2.5 shrink-0 rounded-full ring-2 ring-[#0f0f0f] ${STATUS_DOT[c.status] ?? "bg-gray-500"}`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="flex items-center gap-1">
                        <span className={`size-1.5 rounded-full ${TYPE_COLORS[c.type] ?? "bg-gray-500"}`} />
                        <span className="text-[11px] font-medium text-white/60">
                          {c.type}
                        </span>
                      </span>
                      <span className="font-mono text-[10px] text-accent/80">
                        {c.slices}
                      </span>
                    </div>
                    <p className="truncate text-[11px] text-white/30">
                      {c.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
