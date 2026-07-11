import axios from "axios";
import { toast } from "sonner";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api",
  headers: { Accept: "application/json" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (axios.isAxiosError(err)) {
      const status = err.response?.status;

      if (status === 401) {
        // Only redirect to login if user had a token (session expired),
        // not when trying to login/register (no token yet)
        const hadToken = localStorage.getItem("token");
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        if (hadToken) {
          window.location.href = "/login";
        }
      } else if (status === 429) {
        // M5: rate limit — baca retry_after dari response
        const retry = err.response?.data?.retry_after;
        toast.error(
          retry
            ? `Terlalu banyak permintaan. Coba lagi dalam ${retry} dtk.`
            : "Terlalu banyak permintaan. Coba lagi nanti.",
        );
      } else if (status === 403) {
        // H-E: akses ditolak — biasanya frozen atau bukan project member
        toast.error(err.response?.data?.message ?? "Akses ditolak. Kamu tidak memiliki izin untuk tindakan ini.");
      } else if (status && status >= 500) {
        toast.error("Terjadi gangguan server. Coba lagi nanti.");
      }
    }
    return Promise.reject(err);
  },
);

export default api;
