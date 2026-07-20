import { useState, type FormEvent, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/api/axios";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, Key, Check, Eye, EyeOff, User, Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function SettingsPage() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();

  // ── Profile form state ──
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── GitHub token state ──
  const [githubToken, setGithubToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [tokenLoading, setTokenLoading] = useState(false);
  const [hasToken, setHasToken] = useState(!!user?.has_github_token);

  // ── Profile update ──
  const handleProfileSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (password && password !== passwordConfirmation) {
      toast.error("Konfirmasi password tidak cocok.");
      return;
    }
    setProfileLoading(true);
    try {
      const formData = new FormData();
      formData.append("name", name);
      formData.append("email", email);
      if (password) {
        formData.append("password", password);
        formData.append("password_confirmation", passwordConfirmation);
      }
      if (profilePhoto) {
        formData.append("profile_photo", profilePhoto);
      }
      // Use POST with _method=PATCH untuk file upload via multipart
      const res = await api.post("/users/me/profile", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        params: { _method: "PATCH" },
      });
      toast.success("Profil berhasil diperbarui.");
      setPassword("");
      setPasswordConfirmation("");
      setProfilePhoto(null);
      setPhotoPreview(null);
      if (setUser && res.data.user) {
        setUser(res.data.user);
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || "Gagal memperbarui profil.";
      const errors = err.response?.data?.errors;
      if (errors) {
        const first = Object.values(errors)[0] as string[];
        toast.error(first?.[0] || msg);
      } else {
        toast.error(msg);
      }
    } finally {
      setProfileLoading(false);
    }
  };

  // ── Photo picker ──
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfilePhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  // ── GitHub token ──
  const handleTokenSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Client validation: pastikan format GitHub PAT
    if (!/^(ghp_|github_pat_|gho_|ghu_|ghr_)/.test(githubToken.trim())) {
      toast.error("Format token tidak valid. Gunakan GitHub Personal Access Token (mulai dengan ghp_ atau github_pat_)");
      return;
    }

    setTokenLoading(true);
    try {
      const res = await api.patch("/users/me/github-token", {
        github_token: githubToken.trim(),
      });
      toast.success("GitHub token berhasil disimpan.");
      setHasToken(true);
      setGithubToken("");
      setShowToken(false);
      if (setUser && res.data.user) {
        setUser(res.data.user);
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || "Gagal menyimpan token.";
      toast.error(msg);
    } finally {
      setTokenLoading(false);
    }
  };

  const handleClearToken = async () => {
    setTokenLoading(true);
    try {
      const res = await api.patch("/users/me/github-token", { github_token: "" });
      toast.success("GitHub token dihapus.");
      setHasToken(false);
      setGithubToken("");
      setShowToken(false);
      if (setUser && res.data.user) {
        setUser(res.data.user);
      }
    } catch {
      toast.error("Gagal menghapus token.");
    } finally {
      setTokenLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-6 pt-10 pb-8">
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-white transition"
        aria-label="Kembali"
      >
        <ArrowLeft className="size-4" />
        <span className="hidden sm:inline">Kembali</span>
      </button>

      {/* Header */}
      <div className="rounded-xl border border-gray-800 bg-card p-6">
        <h1 className="text-2xl font-bold text-white">Pengaturan Akun</h1>
        <p className="mt-1 text-sm text-gray-500">
          Kelola data diri dan pengaturan akun Anda
        </p>
      </div>

      {/* ── Profile Section ── */}
      <div className="rounded-xl border border-gray-800 bg-card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <User className="size-5 text-accent" />
          <h2 className="text-lg font-semibold text-white">Profil</h2>
        </div>

        <form onSubmit={handleProfileSubmit} className="space-y-4">
          {/* Photo */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="size-16 overflow-hidden rounded-full border border-gray-700 bg-gray-800">
                {photoPreview ? (
                  <img src={photoPreview} alt="Preview" className="size-full object-cover" />
                ) : user?.profile_photo_url ? (
                  <img src={user.profile_photo_url} alt={user.name} className="size-full object-cover" />
                ) : (
                  <div className="flex size-full items-center justify-center text-gray-500">
                    <User className="size-6" />
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 flex size-6 items-center justify-center rounded-full border border-gray-700 bg-gray-800 text-gray-400 hover:text-white transition"
                aria-label="Ubah foto profil"
              >
                <Camera className="size-3" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handlePhotoChange}
                className="hidden"
              />
            </div>
            <div>
              <p className="text-sm font-medium text-white">{user?.name}</p>
              <p className="text-xs text-gray-500">JPG, PNG atau WebP. Maks 5 MB.</p>
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-300">Nama Lengkap</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-accent focus:outline-none focus:ring-1"
              required
            />
          </div>

          {/* Email */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-300">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-accent focus:outline-none focus:ring-1"
              required
            />
          </div>

          {/* Password */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-300">
                Password Baru <span className="text-gray-500">(opsional)</span>
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Kosongkan jika tidak ingin ganti"
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-accent focus:outline-none focus:ring-1"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-300">Konfirmasi Password</label>
              <input
                type="password"
                value={passwordConfirmation}
                onChange={(e) => setPasswordConfirmation(e.target.value)}
                placeholder="Ulangi password baru"
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-accent focus:outline-none focus:ring-1"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={profileLoading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {profileLoading ? (
              <><Loader2 className="size-4 animate-spin" /> Menyimpan...</>
            ) : (
              "Simpan Profil"
            )}
          </button>
        </form>
      </div>

      {/* ── GitHub Token Section ── */}
      <div className="rounded-xl border border-gray-800 bg-card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Key className="size-5 text-accent" />
          <h2 className="text-lg font-semibold text-white">
            GitHub Personal Access Token
          </h2>
        </div>
        <p className="text-sm text-gray-400">
          Token ini digunakan untuk mengakses diff dari repository privat.
          Token tidak akan ditampilkan setelah disimpan.
        </p>

        {!hasToken ? (
          <form onSubmit={handleTokenSubmit} className="space-y-4">
            <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-300">
                GitHub Personal Access Token
              </label>
              <div className="relative">
                <input
                  type={showToken ? "text" : "password"}
                  value={githubToken}
                  onChange={(e) => setGithubToken(e.target.value)}
                  placeholder="ghp_... atau github_pat_..."
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-accent focus:outline-none focus:ring-1"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                  aria-label={showToken ? "Sembunyikan token" : "Tampilkan token"}
                >
                  {showToken ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={tokenLoading || !githubToken.trim()}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {tokenLoading ? "Menyimpan..." : "Simpan Token"}
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
              onClick={handleClearToken}
              disabled={tokenLoading}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-500/30 bg-red-900/10 px-4 py-2.5 text-sm font-semibold text-red-400 transition hover:bg-red-900/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {tokenLoading ? "Menghapus..." : "Hapus Token"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
