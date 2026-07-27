import { useState, type FormEvent } from "react";
import { isAxiosError } from "axios";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { parseErrors } from "@/lib/parseErrors";
import { toast } from "sonner";
import { Eye, EyeOff, Mail, Lock, User, Loader2 } from "lucide-react";
import bgImage from "@/assets/bg1.webp";

interface FieldErrors {
  name?: string;
  email?: string;
  password?: string;
  password_confirmation?: string;
}

interface AuthUIProps {
  defaultMode?: "signin" | "signup";
}

function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function passwordStrength(pw: string) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return { score: s, label: ["Sangat lemah", "Lemah", "Cukup", "Kuat", "Sangat kuat"][s] };
}

export function AuthUI({ defaultMode = "signin" }: AuthUIProps) {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">(defaultMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  const validate = (): boolean => {
    const errs: FieldErrors = {};

    if (!validateEmail(email)) {
      errs.email = "Format email tidak valid";
    }
    if (password.length < 8) {
      errs.password = "Password minimal 8 karakter";
    }
    if (mode === "signup") {
      if (!name.trim()) {
        errs.name = "Nama harus diisi";
      }
      if (password !== passwordConfirmation) {
        errs.password_confirmation = "Konfirmasi password tidak cocok";
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const parseBackendErrors = (error: unknown) => {
    const parsed = parseErrors(error);
    if (Object.keys(parsed).length > 0) {
      setErrors(parsed as FieldErrors);
    } else {
      setErrors({});
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setErrors({});

    if (!validate()) return;

    setLoading(true);
    try {
      if (mode === "signin") {
        await login({ email, password });
        toast.success("Login berhasil");
      } else {
        await register({ name, email, password, password_confirmation: passwordConfirmation });
        toast.success("Registrasi berhasil");
      }
    } catch (err) {
      parseBackendErrors(err);
      if (!isAxiosError(err) || err.response?.status !== 422) {
        toast.error(mode === "signin" ? "Email atau password salah" : "Registrasi gagal, coba lagi");
      }
    } finally {
      setLoading(false);
    }
  };

  const inputClass = (field: keyof FieldErrors) =>
    cn(
      "w-full rounded-lg border bg-gray-900 py-2.5 pl-10 pr-10 text-sm text-white placeholder-gray-500 transition focus:outline-none focus:ring-1",
      errors[field]
        ? "border-red-500 focus:border-red-500 focus:ring-red-500"
        : "border-gray-700 focus:border-accent focus:ring-accent"
    );

  return (
    <div className="flex h-screen overflow-hidden">
      <div className="flex w-full flex-col justify-center px-6 lg:w-1/2 lg:px-12">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-8">
            <h1 className="text-2xl font-bold tracking-tight text-white">
              {mode === "signin" ? "Welcome back" : "Buat akun"}
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              {mode === "signin"
                ? "Masuk ke akun SEIRIS kamu"
                : "Daftar untuk mulai menggunakan SEIRIS"}
            </p>
          </div>

          <div className="mb-6 flex rounded-lg border border-gray-800 bg-gray-900/50 p-1">
            <button
              type="button"
              onClick={() => { setMode("signin"); setErrors({}); }}
              className={cn(
                "flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors",
                mode === "signin"
                  ? "bg-accent text-black shadow-sm"
                  : "text-gray-400 hover:text-white"
              )}
            >
              Masuk
            </button>
            <button
              type="button"
              onClick={() => { setMode("signup"); setErrors({}); }}
              className={cn(
                "flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors",
                mode === "signup"
                  ? "bg-accent text-black shadow-sm"
                  : "text-gray-400 hover:text-white"
              )}
            >
              Daftar
            </button>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {mode === "signup" && (
              <div>
                <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-gray-300">
                  Nama
                </label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-500" />
                  <input
                    id="name"
                    type="text"
                    placeholder="Nama lengkap"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className={inputClass("name")}
                  />
                </div>
                {errors.name && (
                  <p className="mt-1 text-xs text-red-500">{errors.name}</p>
                )}
              </div>
            )}

            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-gray-300">
                Email
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-500" />
                <input
                  id="email"
                  type="email"
                  placeholder="email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="username"
                  className={inputClass("email")}
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-xs text-red-500">{errors.email}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-gray-300">
                Password
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-500" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                    placeholder={mode === "signup" ? "Minimal 8 karakter" : "Password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  className={inputClass("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                  tabIndex={-1}
                  aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"} title={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-red-500">{errors.password}</p>
              )}
              {mode === "signup" && password.length > 0 && (() => {
                const { score, label } = passwordStrength(password);
                return (
                  <div className="mt-2">
                    <div
                      className="flex gap-1"
                      role="meter"
                      aria-valuenow={score}
                      aria-valuemin={0}
                      aria-valuemax={4}
                      aria-label="Kekuatan password"
                    >
                      {[0, 1, 2, 3].map((i) => (
                        <span
                          key={i}
                          className={cn(
                            "h-1 flex-1 rounded-full",
                            i < score ? ["bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-green-500"][score - 1] : "bg-gray-800"
                          )}
                        />
                      ))}
                    </div>
                    <p className="mt-1 text-xs text-gray-500">Kekuatan: {label}</p>
                  </div>
                );
              })()}
            </div>

            {mode === "signup" && (
              <div>
                <label htmlFor="passwordConfirmation" className="mb-1.5 block text-sm font-medium text-gray-300">
                  Konfirmasi Password
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-500" />
                  <input
                    id="passwordConfirmation"
                    type={showConfirm ? "text" : "password"}
                    placeholder="Ulangi password"
                    value={passwordConfirmation}
                    onChange={(e) => setPasswordConfirmation(e.target.value)}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    className={inputClass("password_confirmation")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                    tabIndex={-1}
                    aria-label={showConfirm ? "Sembunyikan konfirmasi password" : "Tampilkan konfirmasi password"} title={showConfirm ? "Sembunyikan konfirmasi password" : "Tampilkan konfirmasi password"}
                  >
                    {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                {errors.password_confirmation && (
                  <p className="mt-1 text-xs text-red-500">{errors.password_confirmation}</p>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.97]"
            >
              {loading && <Loader2 className="size-4 animate-spin" />}
              {loading
                ? "Memproses..."
                : mode === "signin"
                  ? "Masuk"
                  : "Daftar"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            {mode === "signin" ? (
              <>
                Belum punya akun?{" "}
                <button
                  type="button"
                  onClick={() => { setMode("signup"); setErrors({}); }}
                  className="font-medium text-accent hover:underline"
                >
                  Daftar
                </button>
              </>
            ) : (
              <>
                Sudah punya akun?{" "}
                <button
                  type="button"
                  onClick={() => { setMode("signin"); setErrors({}); }}
                  className="font-medium text-accent hover:underline"
                >
                  Masuk
                </button>
              </>
            )}
          </p>
        </div>
      </div>

      <div className="relative hidden h-full lg:block lg:w-1/2">
        <img
          src={bgImage}
          alt=""
          className="size-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent" />
      </div>
    </div>
  );
}
