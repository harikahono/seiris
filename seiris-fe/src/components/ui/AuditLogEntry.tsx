import { type ReactNode } from "react";
import type { AuditLogItem } from "@/types";
import { cn } from "@/lib/utils";
import {
  ThumbsUp,
  ThumbsDown,
  FileText,
  PieChart,
  Snowflake,
  TrendingUp,
  Gift,
  Settings,
  UserPlus,
  UserMinus,
  Edit,
  LogIn,
  type LucideIcon,
} from "lucide-react";

const ACTION_META: Record<string, { icon: LucideIcon; color: string; bg: string; label: string }> = {
  "contribution.created": {
    icon: FileText, color: "text-yellow-400", bg: "bg-yellow-500/10", label: "Membuat kontribusi",
  },
  "vote.cast": {
    icon: ThumbsUp, color: "text-blue-400", bg: "bg-blue-500/10", label: "Memberi vote",
  },
  "contribution.approved": {
    icon: ThumbsUp, color: "text-green-400", bg: "bg-green-500/10", label: "Kontribusi disetujui",
  },
  "contribution.rejected": {
    icon: ThumbsDown, color: "text-red-400", bg: "bg-red-500/10", label: "Kontribusi ditolak",
  },
  "equity.recalculated": {
    icon: PieChart, color: "text-orange-400", bg: "bg-orange-500/10", label: "Memperbarui equity",
  },
  "equity.frozen": {
    icon: Snowflake, color: "text-cyan-400", bg: "bg-cyan-500/10", label: "Freeze equity",
  },
  "revenue.created": {
    icon: TrendingUp, color: "text-emerald-400", bg: "bg-emerald-500/10", label: "Mencatat revenue",
  },
  "profit.distributed": {
    icon: Gift, color: "text-emerald-400", bg: "bg-emerald-500/10", label: "Mendistribusikan profit",
  },
  "team.created": {
    icon: Settings, color: "text-gray-400", bg: "bg-gray-500/10", label: "Membuat tim",
  },
  "team.updated": {
    icon: Edit, color: "text-gray-400", bg: "bg-gray-500/10", label: "Memperbarui tim",
  },
  "member.joined": {
    icon: LogIn, color: "text-purple-400", bg: "bg-purple-500/10", label: "Bergabung ke tim",
  },
  "member.exited": {
    icon: UserMinus, color: "text-purple-400", bg: "bg-purple-500/10", label: "Keluar dari tim",
  },
  "member.fmr_updated": {
    icon: UserPlus, color: "text-purple-400", bg: "bg-purple-500/10", label: "Memperbarui FMR",
  },
};

function getActionMeta(action: string) {
  return ACTION_META[action] ?? {
    icon: FileText,
    color: "text-gray-400",
    bg: "bg-gray-500/10",
    label: action,
  };
}

interface AuditLogItemProps {
  log: AuditLogItem;
}

export default function AuditLogEntry({ log }: AuditLogItemProps) {
  const meta = getActionMeta(log.action);
  const Icon = meta.icon;
  const time = new Date(log.created_at).toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="flex gap-3 rounded-lg border border-gray-800 bg-gray-900 p-4">
      <div className={cn("flex size-9 shrink-0 items-center justify-center rounded-full", meta.bg)}>
        <Icon className={cn("size-4", meta.color)} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm text-white">
              {log.actor ? (
                <span className="font-medium">{log.actor.name}</span>
              ) : (
                <span className="italic text-gray-500">System</span>
              )}
              <span className="ml-1 text-gray-400">{meta.label}</span>
            </p>
            {log.payload && Object.keys(log.payload).length > 0 && (
              <div className="mt-1 space-y-0.5">
                {renderPayload(log.action, log.payload)}
              </div>
            )}
          </div>
          <span className="shrink-0 text-xs text-gray-600">{time}</span>
        </div>
      </div>
    </div>
  );
}

function renderPayload(action: string, payload: Record<string, unknown>): ReactNode {
  switch (true) {
    case action === "vote.cast":
      return payload.note ? <PayloadRow label="Catatan" value={payload.note as string} /> : null;
    case action === "contribution.created":
      return <PayloadRow label={payload.type as string} value={payload.description as string} />;
    case action === "contribution.approved":
      return payload.approve_count
        ? <PayloadRow label="Disetujui" value={`${payload.approve_count} dari ${payload.total_voters} suara`} />
        : null;
    case action === "contribution.rejected":
      return payload.reject_count
        ? <PayloadRow label="Ditolak" value={`${payload.reject_count} dari ${payload.total_voters} suara`} />
        : null;
    case action === "equity.recalculated":
      return <PayloadRow label="Total slices" value={Number(payload.total_slices).toLocaleString("id-ID")} />;
    case action === "equity.frozen":
      return payload.snapshot_id ? <PayloadRow label="Status" value="Equity difreeze" /> : null;
    case action === "revenue.created":
      return (
        <>
          <PayloadRow label="Amount" value={`Rp ${Number(payload.amount).toLocaleString("id-ID")}`} />
          <PayloadRow label="Distribusi" value={`Rp ${Number(payload.distributable_amount).toLocaleString("id-ID")}`} />
        </>
      );
    case action === "profit.distributed":
      return (
        <>
          <PayloadRow label="Didistribusikan" value={`Rp ${Number(payload.distributable_amount).toLocaleString("id-ID")}`} />
          <PayloadRow label="Anggota" value={`${payload.distributions_count}`} />
        </>
      );
    case action === "member.fmr_updated":
      return <PayloadRow label="FMR baru" value={`Rp ${Number(payload.new_fmr).toLocaleString("id-ID")}`} />;
    case action === "team.created":
      return <PayloadRow label="Nama tim" value={payload.name as string} />;
    case action === "member.joined":
      return payload.member_name ? <PayloadRow label="Anggota" value={`${payload.member_name} bergabung`} /> : null;
    case action === "member.exited":
      return payload.member_name ? <PayloadRow label="Anggota" value={`${payload.member_name} keluar`} /> : null;
    default: {
      if (typeof payload === "object" && payload !== null) {
        return Object.entries(payload).map(([k, v]) => (
          <PayloadRow key={k} label={k} value={String(v)} />
        ));
      }
      return <PayloadRow label="" value={String(payload)} />;
    }
  }
}

function PayloadRow({ label, value }: { label: string; value: string }) {
  return (
    <p className="text-xs text-gray-500">
      <span className="text-gray-600">{label}: </span>
      {value}
    </p>
  );
}
