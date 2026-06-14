import type { EquityMemberEntry } from "@/types";

interface MemberEquityTableProps {
  members: EquityMemberEntry[];
}

export default function MemberEquityTable({ members }: MemberEquityTableProps) {
  const sorted = [...members].sort((a, b) => b.equity_pct - a.equity_pct);

  if (sorted.length === 0) {
    return (
      <div className="rounded-lg border border-gray-800 bg-gray-900 p-6 text-center">
        <p className="text-sm text-gray-500">Belum ada anggota.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-left text-xs text-gray-500">
              <th className="px-4 py-3 font-medium">Anggota</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 text-right font-medium">Slices</th>
              <th className="px-4 py-3 text-right font-medium">Equity %</th>
              <th className="px-4 py-3 font-medium">Bar</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((m) => (
              <tr key={m.member_id} className="border-b border-gray-800/50 last:border-0">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex size-7 items-center justify-center rounded-full bg-accent/20 text-[10px] font-bold text-accent">
                      {m.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-white">{m.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {m.role === "owner" ? (
                    <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-medium text-accent">
                      Owner
                    </span>
                  ) : (
                    <span className="rounded-full bg-gray-800 px-2 py-0.5 text-[10px] text-gray-400">
                      Member
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-gray-300">
                  {m.slices.toLocaleString("id-ID")}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-white">
                  {m.equity_pct.toFixed(1)}%
                </td>
                <td className="px-4 py-3">
                  <div className="h-2 w-24 rounded-full bg-gray-800">
                    <div
                      className="h-full rounded-full bg-accent transition-all"
                      style={{ width: `${Math.max(m.equity_pct, 1)}%` }}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
