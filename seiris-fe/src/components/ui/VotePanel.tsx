import { useState } from "react";
import { isAxiosError } from "axios";
import api from "@/api/axios";
import type { Contribution } from "@/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ThumbsUp, ThumbsDown, Loader2 } from "lucide-react";

interface VotePanelProps {
  contribution: Contribution;
  currentMemberId: string;
  onVoted: () => void;
}

export default function VotePanel({ contribution, currentMemberId, onVoted }: VotePanelProps) {
  const [vote, setVote] = useState<"APPROVE" | "REJECT" | null>(null);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  if (contribution.status !== "PENDING") return null;

  const isCreator = contribution.member.id === currentMemberId;
  const hasVoted = contribution.approvals.some((a) => a.member.id === currentMemberId);
  if (isCreator || hasVoted) return null;

  const handleVote = async () => {
    if (!vote) return;
    setLoading(true);
    try {
      await api.post(`/contributions/${contribution.id}/vote`, { vote, note: note.trim() || undefined });
      toast.success(vote === "APPROVE" ? "Vote disetujui" : "Vote ditolak");
      onVoted();
    } catch (err) {
      if (isAxiosError(err) && err.response) {
        toast.error(err.response.data?.message ?? "Gagal melakukan vote");
      } else {
        toast.error("Gagal melakukan vote");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-gray-800 bg-card p-5 transition-all duration-200 hover:border-gray-700">
      <h3 className="mb-4 text-sm font-semibold text-white">Vote</h3>

      <div className="mb-3 flex gap-2">
        <button
          type="button"
          onClick={() => setVote("APPROVE")}
          className={cn(
            "flex flex-1 items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-medium transition-all duration-200",
            vote === "APPROVE"
              ? "border-green-500 bg-green-500/10 text-green-400"
              : "border-gray-700 text-gray-400 hover:border-green-500/50 hover:text-green-400 hover:bg-green-500/5"
          )}
        >
          <ThumbsUp className="size-4" />
          Setuju
        </button>
        <button
          type="button"
          onClick={() => setVote("REJECT")}
          className={cn(
            "flex flex-1 items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-medium transition-all duration-200",
            vote === "REJECT"
              ? "border-red-500 bg-red-500/10 text-red-400"
              : "border-gray-700 text-gray-400 hover:border-red-500/50 hover:text-red-400 hover:bg-red-500/5"
          )}
        >
          <ThumbsDown className="size-4" />
          Tolak
        </button>
      </div>

      <textarea
        rows={2}
        placeholder="Catatan (opsional)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={300}
        className="mb-3 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 transition focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent resize-none"
      />

      <button
        type="button"
        onClick={handleVote}
        disabled={!vote || loading}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-black transition-all duration-200 hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading && <Loader2 className="size-4 animate-spin" />}
        {loading ? "Menyimpan..." : "Kirim Vote"}
      </button>
    </div>
  );
}
