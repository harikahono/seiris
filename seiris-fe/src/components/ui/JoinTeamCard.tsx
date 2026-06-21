import { useState, type FormEvent } from "react";
import { isAxiosError } from "axios";
import api from "@/api/axios";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Loader2, LogIn } from "lucide-react";

interface JoinTeamCardProps {
  onJoined: () => void;
  compact?: boolean;
}

export default function JoinTeamCard({ onJoined, compact }: JoinTeamCardProps) {
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    const code = inviteCode.trim();
    if (code.length !== 8) {
      setError("Kode undangan harus 8 karakter");
      return;
    }

    setLoading(true);
    try {
      await api.post("/teams/join", { invite_code: code.toUpperCase() });
      toast.success("Berhasil bergabung ke tim");
      setInviteCode("");
      onJoined();
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 422) {
        const data = err.response.data as { errors?: Record<string, string[]> };
        setError(data.errors?.invite_code?.[0] ?? "Kode undangan tidak valid");
      } else {
        setError("Gagal bergabung. Periksa kode undangan.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn(
      "rounded-lg border",
      compact
        ? "border-gray-800/60 bg-gray-800/30 p-3"
        : "border-gray-800 bg-gray-900 p-5"
    )}>
      <div className={cn("flex items-center gap-2", compact ? "mb-2" : "mb-3")}>
        <LogIn className={cn("text-accent", compact ? "size-3.5" : "size-4")} />
        <h3 className={cn("font-semibold text-white", compact ? "text-xs" : "text-sm")}>Gabung Tim</h3>
      </div>
      {!compact && (
        <p className="mb-3 text-xs text-gray-500">
          Masukkan kode undangan 8 karakter dari owner tim.
        </p>
      )}
      <form onSubmit={handleSubmit} noValidate className="flex gap-2">
        <input
          type="text"
          placeholder="Kode undangan"
          value={inviteCode}
          onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
          maxLength={8}
          className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 transition focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
        />
        <button
          type="submit"
          disabled={loading || inviteCode.trim().length !== 8}
          className="flex shrink-0 items-center gap-1 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-black transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            "Gabung"
          )}
        </button>
      </form>
      {error && <p className={cn("text-xs text-red-500", compact ? "mt-1" : "mt-2")}>{error}</p>}
    </div>
  );
}
