import { Clock, DollarSign, Lightbulb, Users, Building2, TrendingUp } from "lucide-react";

export const CONTRIBUTION_TYPES = [
  { value: "TIME", label: "Time", icon: Clock, desc: "Log jam kerja", color: "text-blue-400" },
  { value: "CASH", label: "Cash", icon: DollarSign, desc: "Investasi uang", color: "text-green-400" },
  { value: "IDEA", label: "Idea", icon: Lightbulb, desc: "Ide atau konsep", color: "text-yellow-400" },
  { value: "NETWORK", label: "Network", icon: Users, desc: "Koneksi atau referral", color: "text-purple-400" },
  { value: "FACILITY", label: "Facility", icon: Building2, desc: "Fasilitas atau alat", color: "text-orange-400" },
  { value: "REVENUE", label: "Revenue", icon: TrendingUp, desc: "Pendapatan (invoice)", color: "text-cyan-400" },
] as const;

export const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  PENDING:  { bg: "bg-yellow-500/10", text: "text-yellow-400", label: "Pending" },
  APPROVED: { bg: "bg-green-500/10",  text: "text-green-400", label: "Disetujui" },
  REJECTED: { bg: "bg-red-500/10",    text: "text-red-400",   label: "Ditolak" },
};
