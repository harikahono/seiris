import { useOutletContext } from "react-router-dom";
import type { TeamContext } from "@/pages/teams/TeamDetailPage";
import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function TeamOverviewTab() {
  const { team } = useOutletContext<TeamContext>();
  const [copied, setCopied] = useState(false);

  const copyInviteCode = () => {
    navigator.clipboard.writeText(team.invite_code);
    setCopied(true);
    toast.success("Kode undangan disalin");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-gray-800 bg-gray-900 p-5">
        <h3 className="mb-1 text-lg font-semibold text-white">{team.name}</h3>
        <p className="text-sm text-gray-500">{team.description || "Tidak ada deskripsi."}</p>
        <div className="mt-4 flex items-center gap-4 text-xs text-gray-500">
          <span>Dibuat {new Date(team.created_at).toLocaleDateString("id-ID")}</span>
          <span>{team.members_count} anggota</span>
        </div>
      </div>

      <div className="rounded-lg border border-gray-800 bg-gray-900 p-5">
        <h4 className="mb-3 text-sm font-semibold text-white">Kode Undangan</h4>
        <div className="flex items-center gap-2">
          <code className="flex-1 rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-center font-mono text-lg tracking-widest text-accent">
            {team.invite_code}
          </code>
          <button
            type="button"
            onClick={copyInviteCode}
            className="rounded-lg border border-gray-700 px-3 py-2.5 text-gray-400 transition hover:border-accent hover:text-accent"
          >
            {copied ? <Check className="size-5" /> : <Copy className="size-5" />}
          </button>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Bagikan kode ini ke anggota tim yang ingin bergabung.
        </p>
      </div>

      <div className="rounded-lg border border-gray-800 bg-gray-900 p-5">
        <h4 className="mb-3 text-sm font-semibold text-white">Owner</h4>
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-full bg-accent/20 text-sm font-bold text-accent">
            {team.owner.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-medium text-white">{team.owner.name}</p>
            <p className="text-xs text-gray-500">{team.owner.email}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
