import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/api/axios";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, Key, Check, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

export default function SettingsPage() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [githubToken, setGithubToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasToken, setHasToken] = useState(!!user?.has_github_token);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.patch("/users/me/github-token", {
        github_token: githubToken.trim(),
      });
      toast.success("GitHub token berhasil disimpan.");
      setHasToken(true);
      setGithubToken("");
      setShowToken(false);
      // Update user context
      if (setUser && res.data.user) {
        setUser(res.data.user);
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || "Gagal menyimpan token.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    setLoading(true);
    try {
      const res = await api.patch("/users/me/github-token", {
        github_token: "",
      });
      toast.success("GitHub token dihapus.");
      setHasToken(false);
      setGithubToken("");
      setShowToken(false);
      if (setUser && res.data.user) {
        setUser(res.data.user);
      }
    } catch (err: any) {
      toast.error("Gagal menghapus token.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-6 pt-10 pb-8">
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-white transition"
      >
        <ArrowLeft className="size-4" />
        Kembali
      </button>

      {/* Header */}
      <div className="rounded-xl border border-gray-800 bg-card p-6">
        <h1 className="text-2xl font-bold text-white">Pengaturan</h1>
        <p className="mt-1 text-sm text-gray-500">
          Kelola pengaturan akun Anda
        </p>
      </div>

      {/* GitHub Token Section */}
      <div className="rounded-xl border border-gray-800 bg-card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Key className="size-5 text-accent" />
          <h2 className="text-lg font-semibold text-white">
            GitHub Personal Access Token
          </h2>
        </div>
        <p className="text-sm text-gray-400">
          Token ini digunakan untuk mengakses diff dari repository privat.
          Token akan disimpan terenkripsi dan tidak akan ditampilkan lagi.
        </p>

        {!hasToken ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-300">
                Masukkan GitHub Token
              </label>
              <div className="relative">
                <input
                  type={showToken ? "text" : "password"}
                  value={githubToken}
                  onChange={(e) => setGithubToken(e.target.value)}
                  placeholder="ghp_..."
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-accent focus:outline-none focus:ring-1"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                >
                  {showToken ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Token akan tersembunyi setelah disimpan
              </p>
            </div>
            <button
              type="submit"
              disabled={loading || !githubToken.trim()}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Menyimpan..." : "Simpan Token"}
            </button>
          </form>
        ) : (
          <div className="space-y-3">
            <div className="rounded-lg border border-green-500/30 bg-green-900/10 p-3">
              <p className="flex items-center gap-2 text-sm text-green-400">
                <Check className="size-4" />
                GitHub token sudah tersimpan
              </p>
            </div>
            <button
              onClick={handleClear}
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-500/30 bg-red-900/10 px-4 py-2.5 text-sm font-semibold text-red-400 transition hover:bg-red-900/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Menghapus..." : "Hapus Token"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
