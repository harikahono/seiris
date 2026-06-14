import { useState } from "react";
import api from "@/api/axios";
import { toast } from "sonner";
import { Download, Loader2 } from "lucide-react";

interface ExportPdfButtonProps {
  teamId: string;
}

export default function ExportPdfButton({ teamId }: ExportPdfButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/teams/${teamId}/equity/export`, {
        responseType: "blob",
      });
      const url = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `equity-${teamId.slice(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("PDF berhasil diunduh");
    } catch {
      toast.error("Gagal mengunduh PDF");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={loading}
      className="flex items-center gap-2 rounded-lg border border-gray-700 px-3 py-1.5 text-xs text-gray-400 transition hover:bg-gray-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
    >
      {loading ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
      {loading ? "Mengunduh..." : "Export PDF"}
    </button>
  );
}
