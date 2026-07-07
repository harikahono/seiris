import { Clock, DollarSign, Lightbulb, Users, Building2, Handshake } from "lucide-react";

export const CONTRIBUTION_TYPES = [
  { value: "TIME", label: "Time", icon: Clock, desc: "Log jam kerja", color: "#3b82f6" },
  { value: "CASH", label: "Cash", icon: DollarSign, desc: "Investasi uang", color: "#e07820" },
  { value: "IDEA", label: "Idea", icon: Lightbulb, desc: "Ide atau konsep", color: "#10b981" },
  { value: "NETWORK", label: "Network", icon: Users, desc: "Koneksi atau referral", color: "#8b5cf6" },
  { value: "FACILITY", label: "Facility", icon: Building2, desc: "Fasilitas atau alat", color: "#f59e0b" },
  { value: "SALES", label: "Sales", icon: Handshake, desc: "Komisi dari deal", color: "#ec4899" },
] as const;

export const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  PENDING:  { bg: "bg-yellow-500/10", text: "text-yellow-400", label: "Pending" },
  APPROVED: { bg: "bg-green-500/10",  text: "text-green-400", label: "Disetujui" },
  REJECTED: { bg: "bg-red-500/10",    text: "text-red-400",   label: "Ditolak" },
};
