import { useState, type FormEvent, useRef } from "react";
import api from "@/api/axios";
import { useAuth } from "@/contexts/AuthContext";
import { Check, Eye, EyeOff, User, Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function SettingsPage() {
  const { user, setUser } = useAuth();

  // ── Profile form state ──
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [photoDeleting, setPhotoDeleting] = useState(false);
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

  // ── Delete photo ──
  const handleDeletePhoto = async () => {
    setPhotoDeleting(true);
    try {
      await api.delete("/users/me/profile-photo");
      setPhotoPreview(null);
      setProfilePhoto(null);
      if (setUser) {
        setUser((prev: any) => ({ ...prev, profile_photo_url: null }));
      }
      toast.success("Foto profil berhasil dihapus.");
    } catch {
      toast.error("Gagal menghapus foto profil.");
    } finally {
      setPhotoDeleting(false);
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
    <div className="mx-auto max-w-7xl px-6 pt-10 pb-8">
      {/* Header */}
      <div className="animate-fade-in-up mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-white">Pengaturan Akun</h1>
        <p className="mt-1 text-sm text-gray-500">
          Kelola data diri dan pengaturan akun Anda
        </p>
        <div className="mt-4 h-px bg-gradient-to-r from-gray-800 to-transparent" />
      </div>

      {/* ── Profile Section ── */}
      <div className="animate-fade-in-up mb-8">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-4 w-0.5 rounded-full bg-accent/50" />
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500">Profil</h2>
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
                className="absolute -bottom-1 -right-1 flex size-6 items-center justify-center rounded-full border border-gray-700 bg-gray-800 text-gray-400 hover:text-white transition-colors active:scale-[0.97]"
                aria-label="Ubah foto profil" title="Ubah foto profil"
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
              {(user?.profile_photo_url || photoPreview) && (
                <button
                  type="button"
                  onClick={handleDeletePhoto}
                  disabled={photoDeleting}
                  className="mt-1.5 text-xs text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
                >
                  {photoDeleting ? "Menghapus..." : "Hapus foto"}
                </button>
              )}
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-300">Nama Lengkap</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border-0 border-b border-white/10 bg-transparent px-0 py-2.5 text-sm text-white placeholder-gray-500 transition-colors focus:border-accent focus:outline-none focus:ring-0"
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
              className="w-full border-0 border-b border-white/10 bg-transparent px-0 py-2.5 text-sm text-white placeholder-gray-500 transition-colors focus:border-accent focus:outline-none focus:ring-0"
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
                className="w-full border-0 border-b border-white/10 bg-transparent px-0 py-2.5 text-sm text-white placeholder-gray-500 transition-colors focus:border-accent focus:outline-none focus:ring-0"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-300">Konfirmasi Password</label>
              <input
                type="password"
                value={passwordConfirmation}
                onChange={(e) => setPasswordConfirmation(e.target.value)}
                placeholder="Ulangi password baru"
                className="w-full border-0 border-b border-white/10 bg-transparent px-0 py-2.5 text-sm text-white placeholder-gray-500 transition-colors focus:border-accent focus:outline-none focus:ring-0"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={profileLoading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-black transition-colors active:scale-[0.97] hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
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
      <div className="animate-fade-in-up">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-4 w-0.5 rounded-full bg-accent/50" />
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500">
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
                  className="w-full border-0 border-b border-white/10 bg-transparent px-0 py-2.5 pr-8 text-sm text-white placeholder-gray-500 transition-colors focus:border-accent focus:outline-none focus:ring-0"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white active:scale-[0.97]"
                  aria-label={showToken ? "Sembunyikan token" : "Tampilkan token"} title={showToken ? "Sembunyikan token" : "Tampilkan token"}
                >
                  {showToken ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={tokenLoading || !githubToken.trim()}
              title={!githubToken.trim() ? "Masukkan token GitHub terlebih dahulu" : undefined}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-black transition-colors active:scale-[0.97] hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
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
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-500/30 bg-red-900/10 px-4 py-2.5 text-sm font-semibold text-red-400 transition-colors active:scale-[0.97] hover:bg-red-900/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {tokenLoading ? "Menghapus..." : "Hapus Token"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
