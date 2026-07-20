import type { EquityMemberEntry } from "@/types";
import UserAvatar from "@/components/ui/UserAvatar";

interface MemberEquityTableProps {
  members: EquityMemberEntry[];
}

const RANK_COLORS = ["text-accent", "text-gray-300", "text-amber-600/80"] as const;

export default function MemberEquityTable({ members }: MemberEquityTableProps) {
  const sorted = [...members].sort((a, b) => b.equity_pct - a.equity_pct);

  if (sorted.length === 0) {
    return (
      <div className="rounded-lg border border-gray-800 bg-card p-6 text-center">
        <p className="text-sm text-gray-500">Belum ada anggota.</p>
      </div>
    );
  }

  const topPct = sorted[0]?.equity_pct ?? 1;

  return (
    <div className="rounded-xl border border-gray-800/50 bg-card py-1">
      {sorted.map((m, i) => {
        const rank = i + 1;
        const rankColor = RANK_COLORS[i] ?? "text-gray-500";
        const barPct = Math.max((m.equity_pct / topPct) * 100, 2);

        return (
          <div key={m.member_id}>
            <div className="px-5 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`w-5 text-sm font-bold tabular-nums ${rankColor}`}>
                    #{rank}
                  </span>
                  <UserAvatar user={{ name: m.name, profile_photo_url: m.profile_photo_url }} size="md" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">{m.name}</p>
                    <p className="text-[11px] text-gray-500">
                      {m.role === "owner" ? "Owner" : "Member"}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold tabular-nums text-white">{m.equity_pct.toFixed(1)}%</p>
                </div>
              </div>

              <div className="mt-2 ml-8">
                <div className="h-2 w-full overflow-hidden rounded-full bg-gray-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-accent to-accent/40 transition-all"
                    style={{ width: `${barPct}%` }}
                  />
                </div>
                <p className="mt-1 text-xs tabular-nums text-gray-500">
                  {m.slices.toLocaleString("id-ID")} slices
                </p>
              </div>
            </div>
            {i < sorted.length - 1 && <div className="mx-5 border-t border-gray-800/40" />}
          </div>
        );
      })}
    </div>
  );
}
