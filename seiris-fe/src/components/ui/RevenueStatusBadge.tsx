import { CheckCircle2, Clock, UserCheck } from "lucide-react";

export default function RevenueStatusBadge({ status }: { status: string }) {
  switch (status) {
    case "distributed":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] font-medium text-green-400">
          <CheckCircle2 className="size-3" />
          Didistribusikan
        </span>
      );
    case "distribute_requested":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-medium text-blue-400">
          <UserCheck className="size-3" />
          Menunggu Persetujuan
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/10 px-2 py-0.5 text-[10px] font-medium text-yellow-400">
          <Clock className="size-3" />
          Belum
        </span>
      );
  }
}
